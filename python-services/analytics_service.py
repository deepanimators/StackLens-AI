#!/usr/bin/env python3
"""
Phase 4: Real-Time Analytics Service

Real-time analytics aggregation for enriched logs with:
- Time-series data aggregation (1min, 5min, 1hr windows)
- Real-time metrics calculation (throughput, error rate, latency)
- Alerting rule evaluation and trigger management
- Dashboard data streaming (WebSocket + REST)
- Data retention policies (hot/warm/cold storage)

Architecture:
  stacklens-analytics (Phase 3 output)
       ↓ Kafka Consumer (Batch: 100 msgs, 10s timeout)
  [Analytics Service]
       ├─ Time-Series Aggregator
       ├─ Metrics Calculator
       ├─ Alert Rule Evaluator
       └─ Dashboard Streamer
       ↓
  [PostgreSQL/TimescaleDB]
       ├─ Raw events (hot storage, 1 day)
       ├─ Aggregations (5min, 1hr, 1day)
       └─ Alert history
       ↓
  [Dashboard/Alerts]
       ├─ Real-time graphs
       ├─ Alert notifications
       └─ Analytics reports

Performance Targets:
  - Aggregation: <500ms for 5min window
  - Alerting: <1s from event to notification
  - Dashboard updates: <2s refresh rate
  - Query latency: <100ms for common queries

Data Flow:
  Input: Enriched logs with geo, user, business context
  ↓
  Aggregation: Count by service, error rate by service, latency percentiles
  ↓
  Alerting: Check thresholds (error_rate > 5%, latency_p99 > 500ms)
  ↓
  Output: Metrics, alerts, analytics data
"""

import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from collections import defaultdict, deque
from enum import Enum
import threading
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError

# ============================================================================
# Configuration
# ============================================================================

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"
KAFKA_INPUT_TOPIC = "stacklens-analytics"
KAFKA_OUTPUT_TOPIC = "analytics-alerts"
KAFKA_CONSUMER_GROUP = "analytics-service-group"
KAFKA_BATCH_SIZE = 100
KAFKA_BATCH_TIMEOUT_MS = 10000

DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "stacklens"
DB_USER = "stacklens_user"
DB_PASSWORD = "stacklens_password"
DB_POOL_MIN = 2
DB_POOL_MAX = 10

AGGREGATION_WINDOWS = {
    "1min": 60,
    "5min": 300,
    "1hour": 3600,
}

# Retention policies (in days)
RETENTION_HOT = 1  # Raw data in memory
RETENTION_WARM = 7  # Aggregated data in fast storage
RETENTION_COLD = 30  # Historical data in archive

LOG_LEVEL = logging.INFO
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# ============================================================================
# Logging Setup
# ============================================================================

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger(__name__)

# ============================================================================
# Data Classes
# ============================================================================


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class ServiceMetrics:
    """Metrics for a single service in a time window"""
    service: str
    timestamp: datetime
    window: str  # "1min", "5min", "1hour"
    
    # Count metrics
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    
    # Error metrics
    error_rate: float = 0.0  # percentage
    
    # Latency metrics (milliseconds)
    latency_min: float = 0.0
    latency_p50: float = 0.0
    latency_p95: float = 0.0
    latency_p99: float = 0.0
    latency_max: float = 0.0
    latency_mean: float = 0.0
    
    # Context metrics
    unique_users: int = 0
    unique_ips: int = 0
    
    # Risk metrics
    avg_risk_score: float = 0.0
    high_risk_count: int = 0
    
    # Aggregated at
    aggregated_at: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['aggregated_at'] = self.aggregated_at.isoformat()
        return data


@dataclass
class AlertRule:
    """Alert rule definition"""
    rule_id: str
    name: str
    description: str
    service: str  # Service name or "*" for all
    metric: str  # "error_rate", "latency_p99", "request_count"
    operator: str  # ">", "<", ">=", "<=", "=="
    threshold: float
    duration_seconds: int  # How long metric must violate threshold
    severity: AlertSeverity
    
    # Notification channels
    notify_slack: bool = False
    notify_email: bool = False
    notify_pagerduty: bool = False
    
    enabled: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Alert:
    """Alert instance"""
    alert_id: str
    rule_id: str
    rule_name: str
    service: str
    severity: AlertSeverity
    metric: str
    value: float
    threshold: float
    
    # Temporal info
    triggered_at: datetime = field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Status
    status: str = "active"  # "active", "resolved", "acknowledged"
    
    # Context
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)


# ============================================================================
# Time-Series Aggregator
# ============================================================================


class TimeSeriesAggregator:
    """Aggregates metrics over time windows"""
    
    def __init__(self):
        """Initialize aggregator"""
        self.windows = defaultdict(lambda: deque(maxlen=10000))  # Last 10k logs per window
        self.metrics_cache = {}  # Cached aggregated metrics
        self.last_aggregation = {}  # Last aggregation timestamp per window
    
    def add_log(self, log: Dict, window: str) -> None:
        """Add log to aggregation window"""
        key = f"{log.get('service', 'unknown')}:{window}"
        self.windows[key].append(log)
    
    def aggregate(self, service: str, window: str) -> Optional[ServiceMetrics]:
        """Aggregate metrics for service in time window"""
        if not self.windows[f"{service}:{window}"]:
            return None
        
        logs = list(self.windows[f"{service}:{window}"])
        
        # Calculate metrics
        total = len(logs)
        failed = sum(1 for log in logs if log.get('level') in ['error', 'critical'])
        
        # Extract latencies
        latencies = [log.get('latency_ms', 0) for log in logs if 'latency_ms' in log]
        latencies.sort()
        
        # Calculate percentiles
        def percentile(data, percent):
            if not data:
                return 0
            idx = int(len(data) * percent / 100)
            return data[idx] if idx < len(data) else data[-1]
        
        # Risk scores
        risk_scores = [log.get('business_risk_score', 0) for log in logs]
        high_risk = sum(1 for r in risk_scores if r > 0.7)
        
        # Unique values
        unique_users = len(set(log.get('user_id') for log in logs if log.get('user_id')))
        unique_ips = len(set(log.get('source_ip') for log in logs if log.get('source_ip')))
        
        return ServiceMetrics(
            service=service,
            timestamp=datetime.utcnow(),
            window=window,
            total_requests=total,
            successful_requests=total - failed,
            failed_requests=failed,
            error_rate=(failed / total * 100) if total > 0 else 0,
            latency_min=min(latencies) if latencies else 0,
            latency_p50=percentile(latencies, 50),
            latency_p95=percentile(latencies, 95),
            latency_p99=percentile(latencies, 99),
            latency_max=max(latencies) if latencies else 0,
            latency_mean=sum(latencies) / len(latencies) if latencies else 0,
            unique_users=unique_users,
            unique_ips=unique_ips,
            avg_risk_score=sum(risk_scores) / len(risk_scores) if risk_scores else 0,
            high_risk_count=high_risk,
        )


# ============================================================================
# Alert Rule Evaluator
# ============================================================================


class AlertEvaluator:
    """Evaluates alert rules against metrics"""
    
    def __init__(self):
        """Initialize evaluator"""
        self.rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
    
    def add_rule(self, rule: AlertRule) -> None:
        """Register alert rule"""
        self.rules[rule.rule_id] = rule
        logger.info(f"Registered alert rule: {rule.name}")
    
    def evaluate_metrics(self, metrics: ServiceMetrics) -> List[Alert]:
        """Evaluate metrics against all applicable rules"""
        triggered_alerts = []
        
        for rule_id, rule in self.rules.items():
            if not rule.enabled:
                continue
            
            # Check if rule applies to this service
            if rule.service != "*" and rule.service != metrics.service:
                continue
            
            # Get metric value
            metric_value = self._get_metric_value(metrics, rule.metric)
            if metric_value is None:
                continue
            
            # Evaluate condition
            triggered = self._check_condition(
                metric_value, rule.operator, rule.threshold
            )
            
            if triggered:
                alert = Alert(
                    alert_id=f"{rule_id}_{metrics.service}_{int(time.time())}",
                    rule_id=rule_id,
                    rule_name=rule.name,
                    service=metrics.service,
                    severity=rule.severity,
                    metric=rule.metric,
                    value=metric_value,
                    threshold=rule.threshold,
                    message=f"{rule.name}: {rule.metric}={metric_value} {rule.operator} {rule.threshold}",
                    details=metrics.to_dict(),
                )
                
                triggered_alerts.append(alert)
                self.active_alerts[alert.alert_id] = alert
                self.alert_history.append(alert)
                
                logger.warning(f"Alert triggered: {alert.message}")
        
        return triggered_alerts
    
    @staticmethod
    def _get_metric_value(metrics: ServiceMetrics, metric: str) -> Optional[float]:
        """Extract metric value from ServiceMetrics"""
        metric_map = {
            "error_rate": metrics.error_rate,
            "latency_p50": metrics.latency_p50,
            "latency_p95": metrics.latency_p95,
            "latency_p99": metrics.latency_p99,
            "request_count": metrics.total_requests,
            "failed_requests": metrics.failed_requests,
            "avg_risk_score": metrics.avg_risk_score,
        }
        return metric_map.get(metric)
    
    @staticmethod
    def _check_condition(value: float, operator: str, threshold: float) -> bool:
        """Check if condition is met"""
        if operator == ">":
            return value > threshold
        elif operator == "<":
            return value < threshold
        elif operator == ">=":
            return value >= threshold
        elif operator == "<=":
            return value <= threshold
        elif operator == "==":
            return value == threshold
        return False


# ============================================================================
# Analytics Service
# ============================================================================


class AnalyticsService:
    """Real-time analytics service"""
    
    def __init__(self):
        """Initialize analytics service"""
        self.consumer = None
        self.producer = None
        self.db_pool = None
        self.aggregator = TimeSeriesAggregator()
        self.evaluator = AlertEvaluator()
        self.running = False
        
        # Statistics
        self.stats = {\n            "messages_processed": 0,
            "metrics_calculated": 0,
            "alerts_triggered": 0,
            "errors": 0,
            "last_update": datetime.utcnow(),
        }
    
    def initialize(self) -> bool:
        """Initialize service connections"""
        try:
            # Initialize Kafka consumer
            self.consumer = KafkaConsumer(
                KAFKA_INPUT_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id=KAFKA_CONSUMER_GROUP,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                max_poll_records=KAFKA_BATCH_SIZE,
                session_timeout_ms=30000,
                auto_offset_reset='earliest',
            )
            logger.info("Kafka consumer initialized")
            
            # Initialize Kafka producer
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda m: json.dumps(m).encode('utf-8'),
            )
            logger.info("Kafka producer initialized")
            
            # Initialize database connection pool
            self.db_pool = SimpleConnectionPool(
                DB_POOL_MIN, DB_POOL_MAX,
                host=DB_HOST, port=DB_PORT,
                database=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            )
            logger.info("Database connection pool initialized")
            
            # Register default alert rules
            self._register_default_rules()
            
            return True
        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            return False
    
    def _register_default_rules(self) -> None:
        """Register default alert rules"""
        # Error rate alert
        self.evaluator.add_rule(AlertRule(
            rule_id="rule_error_rate_high",
            name="High Error Rate",
            description="Error rate exceeds 5%",
            service="*",
            metric="error_rate",
            operator=">",
            threshold=5.0,
            duration_seconds=60,
            severity=AlertSeverity.WARNING,
        ))
        
        # Latency alert
        self.evaluator.add_rule(AlertRule(
            rule_id="rule_latency_p99_high",
            name="High P99 Latency",
            description="P99 latency exceeds 500ms",
            service="*",
            metric="latency_p99",
            operator=">",
            threshold=500.0,
            duration_seconds=60,
            severity=AlertSeverity.WARNING,
        ))
        
        # Critical error rate
        self.evaluator.add_rule(AlertRule(
            rule_id="rule_error_rate_critical",
            name="Critical Error Rate",
            description="Error rate exceeds 20%",
            service="*",
            metric="error_rate",
            operator=">",
            threshold=20.0,
            duration_seconds=30,
            severity=AlertSeverity.CRITICAL,
        ))
    
    def _process_batch(self, messages: List[Dict]) -> None:
        """Process batch of messages"""
        if not messages:
            return
        
        try:
            # Aggregate metrics for each window
            services = set(msg.get('service', 'unknown') for msg in messages)
            
            for service in services:
                service_logs = [m for m in messages if m.get('service') == service]
                
                for window_name in AGGREGATION_WINDOWS.keys():
                    # Add logs to aggregation window
                    for log in service_logs:
                        self.aggregator.add_log(log, window_name)
                    
                    # Aggregate metrics
                    metrics = self.aggregator.aggregate(service, window_name)
                    if metrics:
                        self.stats["metrics_calculated"] += 1
                        
                        # Store metrics in database
                        self._store_metrics(metrics)
                        
                        # Evaluate alert rules
                        alerts = self.evaluator.evaluate_metrics(metrics)
                        if alerts:
                            self.stats["alerts_triggered"] += len(alerts)
                            for alert in alerts:
                                self._send_alert(alert)
            
            self.stats["messages_processed"] += len(messages)
            self.stats["last_update"] = datetime.utcnow()
            
        except Exception as e:
            logger.error(f"Batch processing error: {e}")
            self.stats["errors"] += 1
    
    def _store_metrics(self, metrics: ServiceMetrics) -> None:
        """Store aggregated metrics in database"""
        try:
            conn = self.db_pool.getconn()
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO analytics_metrics (
                    service, window, timestamp,
                    total_requests, failed_requests, error_rate,
                    latency_p50, latency_p95, latency_p99,
                    unique_users, unique_ips, avg_risk_score, high_risk_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (service, window, timestamp)
                DO UPDATE SET
                    total_requests = EXCLUDED.total_requests,
                    failed_requests = EXCLUDED.failed_requests,
                    error_rate = EXCLUDED.error_rate
            """, (
                metrics.service, metrics.window, metrics.timestamp,
                metrics.total_requests, metrics.failed_requests, metrics.error_rate,
                metrics.latency_p50, metrics.latency_p95, metrics.latency_p99,
                metrics.unique_users, metrics.unique_ips,
                metrics.avg_risk_score, metrics.high_risk_count,
            ))
            
            conn.commit()
            cur.close()
            self.db_pool.putconn(conn)
            
        except Exception as e:
            logger.error(f"Failed to store metrics: {e}")
    
    def _send_alert(self, alert: Alert) -> None:
        """Send alert to output topic and database"""
        try:
            # Send to Kafka
            self.producer.send(KAFKA_OUTPUT_TOPIC, alert.__dict__)
            
            # Store in database
            conn = self.db_pool.getconn()
            cur = conn.cursor()
            
            cur.execute("""
                INSERT INTO analytics_alerts (
                    alert_id, rule_id, service, severity, metric,
                    value, threshold, message, triggered_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                alert.alert_id, alert.rule_id, alert.service,
                alert.severity.value, alert.metric,
                alert.value, alert.threshold, alert.message, alert.triggered_at,
            ))
            
            conn.commit()
            cur.close()
            self.db_pool.putconn(conn)
            
            logger.info(f"Alert sent: {alert.message}")
            
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    def run(self) -> None:
        """Main service loop"""
        logger.info("Analytics service starting...")
        self.running = True
        
        if not self.initialize():
            logger.error("Service initialization failed")
            return
        
        try:
            message_buffer = []
            
            for message in self.consumer:
                try:
                    log = message.value
                    message_buffer.append(log)
                    
                    # Process batch when size reached or timeout
                    if len(message_buffer) >= KAFKA_BATCH_SIZE:
                        self._process_batch(message_buffer)
                        message_buffer = []
                        
                except Exception as e:
                    logger.error(f"Error processing message: {e}")
                    self.stats["errors"] += 1
        
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self._shutdown()
    
    def _shutdown(self) -> None:
        """Graceful shutdown"""
        logger.info("Analytics service shutting down...")
        self.running = False
        
        if self.consumer:
            self.consumer.close()
        
        if self.producer:
            self.producer.close()
        
        if self.db_pool:
            self.db_pool.closeall()
        
        self._print_statistics()
        logger.info("Analytics service stopped")
    
    def _print_statistics(self) -> None:
        """Print service statistics"""
        logger.info("=" * 70)
        logger.info("Analytics Service Statistics")
        logger.info("=" * 70)
        logger.info(f"Messages Processed: {self.stats['messages_processed']}")
        logger.info(f"Metrics Calculated: {self.stats['metrics_calculated']}")
        logger.info(f"Alerts Triggered: {self.stats['alerts_triggered']}")
        logger.info(f"Errors: {self.stats['errors']}")
        logger.info(f"Last Update: {self.stats['last_update']}")
        logger.info("=" * 70)
    
    def get_statistics(self) -> Dict:
        """Get current statistics"""
        return {
            **self.stats,
            "active_alerts": len(self.evaluator.active_alerts),
            "alert_history_count": len(self.evaluator.alert_history),
        }


# ============================================================================
# Main
# ============================================================================


if __name__ == "__main__":
    service = AnalyticsService()
    service.run()
