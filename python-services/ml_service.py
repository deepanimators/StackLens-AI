#!/usr/bin/env python3
"""
Phase 5: Machine Learning & Anomaly Detection Service
Real-time anomaly detection with Isolation Forest and pattern recognition

Processes analytics-alerts from Phase 4 and detects anomalies in metrics/patterns
NO mock data - production implementation only
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import pickle
import hashlib

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from kafka import KafkaConsumer, KafkaProducer
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import numpy as np
import pandas as pd

# Logging configuration
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AnomalyType(str, Enum):
    """Anomaly classification types"""
    OUTLIER = "outlier"  # Single point outlier
    TREND_CHANGE = "trend_change"  # Significant trend shift
    SPIKE = "spike"  # Sudden spike in values
    DIP = "dip"  # Sudden drop in values
    PATTERN_SHIFT = "pattern_shift"  # Change in behavior pattern
    SEASONALITY_BREAK = "seasonality_break"  # Break in seasonal pattern


class AnomalySeverity(str, Enum):
    """Anomaly severity levels"""
    LOW = "low"  # Minor anomaly
    MEDIUM = "medium"  # Notable anomaly
    HIGH = "high"  # Significant anomaly
    CRITICAL = "critical"  # Critical anomaly


@dataclass
class ServiceMetrics:
    """Time-series metrics for anomaly analysis"""
    service: str
    timestamp: datetime
    window: str
    total_requests: int
    error_rate: float
    latency_p99_ms: float
    latency_p95_ms: float
    latency_mean_ms: float
    unique_users: int
    unique_ips: int
    risk_score: float


@dataclass
class AnomalyRecord:
    """Detected anomaly instance"""
    anomaly_id: str
    service: str
    anomaly_type: str
    severity: str
    timestamp: datetime
    metric_name: str
    metric_value: float
    baseline_value: float
    deviation_percent: float
    confidence_score: float
    description: str
    resolved: bool = False


@dataclass
class PatternSignature:
    """Service behavior pattern signature"""
    service: str
    pattern_id: str
    window_size: int  # minutes
    vector: List[float]  # Feature vector
    created_at: datetime
    last_updated: datetime


class AnomalyDetector:
    """Isolation Forest-based anomaly detection"""

    def __init__(self, contamination: float = 0.1, n_estimators: int = 100):
        """Initialize anomaly detector
        
        Args:
            contamination: Expected proportion of anomalies (0-1)
            n_estimators: Number of isolation trees
        """
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.training_data = []
        self.anomaly_count = 0

    def fit(self, data: np.ndarray) -> None:
        """Train anomaly detection model
        
        Args:
            data: Training data (n_samples, n_features)
        """
        try:
            if len(data) < 10:
                logger.warning(f"Insufficient training data: {len(data)} samples")
                return

            # Scale features
            scaled_data = self.scaler.fit_transform(data)
            
            # Train model
            self.model.fit(scaled_data)
            self.is_fitted = True
            self.training_data = data
            
            logger.info(f"Anomaly detector trained on {len(data)} samples")
        except Exception as e:
            logger.error(f"Failed to fit anomaly detector: {e}")

    def predict(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Detect anomalies in new data
        
        Args:
            data: Data to analyze (n_samples, n_features)
            
        Returns:
            predictions: -1 for anomalies, 1 for normal
            scores: Anomaly scores (lower = more anomalous)
        """
        if not self.is_fitted or len(data) == 0:
            return np.array([]), np.array([])

        try:
            # Scale features
            scaled_data = self.scaler.transform(data)
            
            # Predict anomalies
            predictions = self.model.predict(scaled_data)
            scores = self.model.score_samples(scaled_data)
            
            # Track anomalies
            self.anomaly_count += np.sum(predictions == -1)
            
            return predictions, scores
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return np.array([]), np.array([])

    def get_anomaly_score(self, data_point: np.ndarray) -> float:
        """Get anomaly score for single data point (0-1, 1=most anomalous)
        
        Args:
            data_point: Single sample (n_features,)
            
        Returns:
            Anomaly score (0-1)
        """
        if not self.is_fitted:
            return 0.0

        try:
            scaled = self.scaler.transform(data_point.reshape(1, -1))
            raw_score = self.model.score_samples(scaled)[0]
            # Normalize to 0-1
            return 1.0 / (1.0 + np.exp(raw_score))
        except Exception as e:
            logger.error(f"Failed to calculate anomaly score: {e}")
            return 0.0


class PatternAnalyzer:
    """Service behavior pattern analysis and clustering"""

    def __init__(self, min_cluster_size: int = 5, pattern_history: int = 168):
        """Initialize pattern analyzer
        
        Args:
            min_cluster_size: Minimum samples for cluster
            pattern_history: Hours of history to analyze
        """
        self.min_cluster_size = min_cluster_size
        self.pattern_history = pattern_history  # 1 week
        self.service_patterns: Dict[str, List[PatternSignature]] = {}
        self.clustering_model = None

    def extract_features(self, metrics: ServiceMetrics) -> np.ndarray:
        """Extract feature vector from metrics
        
        Args:
            metrics: Service metrics
            
        Returns:
            Feature vector (n_features,)
        """
        features = np.array([
            metrics.error_rate,
            metrics.latency_p99_ms,
            metrics.latency_p95_ms,
            metrics.latency_mean_ms,
            metrics.unique_users,
            metrics.unique_ips,
            metrics.risk_score,
            metrics.total_requests if metrics.total_requests > 0 else 1
        ])
        return features

    def analyze_patterns(self, metrics_history: List[ServiceMetrics]) -> List[PatternSignature]:
        """Detect recurring patterns in metrics history
        
        Args:
            metrics_history: Historical metrics (sorted by timestamp)
            
        Returns:
            Detected patterns
        """
        patterns = []

        if len(metrics_history) < self.min_cluster_size:
            logger.debug(f"Insufficient history for pattern analysis: {len(metrics_history)}")
            return patterns

        try:
            # Extract features
            features = np.array([
                self.extract_features(m) for m in metrics_history
            ])

            # Normalize
            scaler = StandardScaler()
            normalized = scaler.fit_transform(features)

            # Cluster patterns using DBSCAN
            clustering = DBSCAN(eps=0.5, min_samples=self.min_cluster_size)
            labels = clustering.fit_predict(normalized)

            # Extract unique patterns
            unique_labels = set(labels)
            for label in unique_labels:
                if label == -1:  # Skip noise
                    continue

                cluster_mask = labels == label
                pattern_vector = np.mean(features[cluster_mask], axis=0)
                
                pattern = PatternSignature(
                    service=metrics_history[0].service,
                    pattern_id=hashlib.md5(str(pattern_vector).encode()).hexdigest()[:16],
                    window_size=int(np.ceil(np.sum(cluster_mask) / len(metrics_history) * 60)),
                    vector=pattern_vector.tolist(),
                    created_at=datetime.now(),
                    last_updated=datetime.now()
                )
                patterns.append(pattern)

            logger.info(f"Detected {len(patterns)} patterns for {metrics_history[0].service}")
            return patterns

        except Exception as e:
            logger.error(f"Pattern analysis failed: {e}")
            return patterns

    def detect_pattern_shift(
        self,
        current_metrics: ServiceMetrics,
        expected_pattern: PatternSignature,
        threshold: float = 0.3
    ) -> Tuple[bool, float]:
        """Detect if current metrics deviate from expected pattern
        
        Args:
            current_metrics: Current service metrics
            expected_pattern: Expected behavior pattern
            threshold: Deviation threshold (0-1)
            
        Returns:
            (is_shift, deviation_score)
        """
        try:
            current_vector = self.extract_features(current_metrics)
            expected_vector = np.array(expected_pattern.vector)

            # Calculate cosine similarity
            similarity = np.dot(current_vector, expected_vector) / (
                np.linalg.norm(current_vector) * np.linalg.norm(expected_vector) + 1e-10
            )
            deviation = 1.0 - similarity

            is_shift = deviation > threshold
            return is_shift, deviation

        except Exception as e:
            logger.error(f"Pattern shift detection failed: {e}")
            return False, 0.0


class TrendAnalyzer:
    """Time-series trend and seasonality analysis"""

    @staticmethod
    def calculate_trend(values: List[float], window: int = 5) -> float:
        """Calculate trend direction and magnitude
        
        Args:
            values: Time-series values
            window: Trend window size
            
        Returns:
            Trend magnitude (-1 to 1, negative=downtrend, positive=uptrend)
        """
        if len(values) < window:
            return 0.0

        try:
            recent = np.array(values[-window:])
            x = np.arange(len(recent))
            z = np.polyfit(x, recent, 1)
            slope = z[0]
            
            # Normalize slope
            mean_val = np.mean(values) if np.mean(values) > 0 else 1
            normalized_slope = np.clip(slope / mean_val, -1.0, 1.0)
            
            return float(normalized_slope)
        except Exception as e:
            logger.error(f"Trend calculation failed: {e}")
            return 0.0

    @staticmethod
    def calculate_seasonality(values: List[float], period: int = 24) -> float:
        """Detect seasonality in time-series
        
        Args:
            values: Time-series values
            period: Expected period length
            
        Returns:
            Seasonality strength (0-1)
        """
        if len(values) < period * 2:
            return 0.0

        try:
            values_array = np.array(values)
            
            # Calculate autocorrelation at period lag
            mean = np.mean(values_array)
            c0 = np.sum((values_array - mean) ** 2) / len(values_array)
            c_lag = np.sum((values_array[:-period] - mean) * (values_array[period:] - mean)) / len(values_array)
            
            seasonality = c_lag / (c0 + 1e-10)
            return np.clip(float(seasonality), 0.0, 1.0)
        except Exception as e:
            logger.error(f"Seasonality calculation failed: {e}")
            return 0.0

    @staticmethod
    def detect_trend_change(
        values: List[float],
        window: int = 5,
        threshold: float = 0.3
    ) -> Tuple[bool, float]:
        """Detect significant change in trend
        
        Args:
            values: Time-series values
            window: Comparison window
            threshold: Change threshold
            
        Returns:
            (is_change, change_magnitude)
        """
        if len(values) < window * 2:
            return False, 0.0

        try:
            # Split into two windows
            mid = len(values) // 2
            old_trend = TrendAnalyzer.calculate_trend(values[:mid], window)
            new_trend = TrendAnalyzer.calculate_trend(values[mid:], window)
            
            change = abs(new_trend - old_trend)
            is_change = change > threshold
            
            return is_change, float(change)
        except Exception as e:
            logger.error(f"Trend change detection failed: {e}")
            return False, 0.0


class MLOrchestrator:
    """ML service orchestrator - processes analytics and detects anomalies"""

    def __init__(self):
        """Initialize ML orchestrator"""
        # Database configuration
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_port = int(os.getenv("DB_PORT", "5432"))
        self.db_name = os.getenv("DB_NAME", "stacklens")
        self.db_user = os.getenv("DB_USER", "stacklens_user")
        self.db_password = os.getenv("DB_PASSWORD", "stacklens_password")

        # Kafka configuration
        self.kafka_brokers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092").split(",")
        self.kafka_input_topic = os.getenv("KAFKA_INPUT_TOPIC", "analytics-alerts")
        self.kafka_output_topic = os.getenv("KAFKA_OUTPUT_TOPIC", "ml-anomalies")
        self.kafka_consumer_group = os.getenv("KAFKA_CONSUMER_GROUP", "ml-service-group")

        # ML configuration
        self.contamination = float(os.getenv("ML_CONTAMINATION", "0.1"))
        self.anomaly_threshold = float(os.getenv("ML_ANOMALY_THRESHOLD", "0.7"))
        self.pattern_history_hours = int(os.getenv("PATTERN_HISTORY_HOURS", "168"))

        # Connection pools
        self.db_pool = None
        self.kafka_consumer = None
        self.kafka_producer = None

        # ML models (per service)
        self.anomaly_detectors: Dict[str, AnomalyDetector] = {}
        self.pattern_analyzers: Dict[str, PatternAnalyzer] = {}
        self.service_patterns: Dict[str, List[PatternSignature]] = {}

        # Statistics
        self.stats = {
            "messages_processed": 0,
            "anomalies_detected": 0,
            "patterns_analyzed": 0,
            "errors": 0,
            "start_time": datetime.now().isoformat()
        }

        # Initialize
        self._init_db_pool()
        self._init_kafka()
        self._init_models()

        logger.info("ML Orchestrator initialized")

    def _init_db_pool(self):
        """Initialize database connection pool"""
        try:
            self.db_pool = SimpleConnectionPool(
                2, 10,
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
                user=self.db_user,
                password=self.db_password
            )
            logger.info("Database pool initialized")
        except Exception as e:
            logger.error(f"Database pool init failed: {e}")
            raise

    def _init_kafka(self):
        """Initialize Kafka consumer and producer"""
        try:
            # Consumer
            self.kafka_consumer = KafkaConsumer(
                self.kafka_input_topic,
                bootstrap_servers=self.kafka_brokers,
                group_id=self.kafka_consumer_group,
                auto_offset_reset='latest',
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                max_poll_records=100
            )

            # Producer
            self.kafka_producer = KafkaProducer(
                bootstrap_servers=self.kafka_brokers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )

            logger.info("Kafka initialized (consumer + producer)")
        except Exception as e:
            logger.error(f"Kafka init failed: {e}")
            raise

    def _init_models(self):
        """Initialize ML models for all services"""
        try:
            conn = self.db_pool.getconn()
            cur = conn.cursor()

            # Get unique services
            cur.execute("SELECT DISTINCT service FROM analytics_metrics_1hour LIMIT 100")
            services = [row[0] for row in cur.fetchall()]

            for service in services:
                self.anomaly_detectors[service] = AnomalyDetector(
                    contamination=self.contamination
                )
                self.pattern_analyzers[service] = PatternAnalyzer(
                    pattern_history=self.pattern_history_hours
                )

            cur.close()
            self.db_pool.putconn(conn)
            logger.info(f"Initialized ML models for {len(services)} services")

        except Exception as e:
            logger.error(f"Model initialization failed: {e}")

    def _get_connection(self):
        """Get database connection"""
        return self.db_pool.getconn()

    def _put_connection(self, conn):
        """Return database connection"""
        self.db_pool.putconn(conn)

    def _load_historical_metrics(
        self,
        service: str,
        hours: int = 24
    ) -> List[ServiceMetrics]:
        """Load historical metrics for service
        
        Args:
            service: Service name
            hours: Hours of history to load
            
        Returns:
            List of metrics
        """
        try:
            conn = self._get_connection()
            cur = conn.cursor()

            query = """
                SELECT service, timestamp, '1hour' as window, 
                       total_requests, error_rate, latency_p99_ms,
                       latency_p95_ms, latency_mean_ms, unique_users,
                       unique_ips, risk_score
                FROM analytics_metrics_1hour
                WHERE service = %s
                AND timestamp > CURRENT_TIMESTAMP - INTERVAL '%s hours'
                ORDER BY timestamp
            """

            cur.execute(query, (service, hours))
            rows = cur.fetchall()

            metrics = [
                ServiceMetrics(
                    service=row[0],
                    timestamp=row[1],
                    window=row[2],
                    total_requests=int(row[3]),
                    error_rate=float(row[4]),
                    latency_p99_ms=float(row[5]),
                    latency_p95_ms=float(row[6]),
                    latency_mean_ms=float(row[7]),
                    unique_users=int(row[8]),
                    unique_ips=int(row[9]),
                    risk_score=float(row[10])
                )
                for row in rows
            ]

            cur.close()
            self._put_connection(conn)

            return metrics

        except Exception as e:
            logger.error(f"Failed to load historical metrics: {e}")
            return []

    def _train_models(self, service: str):
        """Train anomaly detection and pattern models
        
        Args:
            service: Service name
        """
        try:
            # Load historical data
            metrics = self._load_historical_metrics(service, hours=self.pattern_history_hours)

            if len(metrics) < 10:
                logger.warning(f"Insufficient data for {service}: {len(metrics)} metrics")
                return

            # Extract features
            features = np.array([
                self.pattern_analyzers[service].extract_features(m)
                for m in metrics
            ])

            # Train anomaly detector
            self.anomaly_detectors[service].fit(features)

            # Analyze patterns
            patterns = self.pattern_analyzers[service].analyze_patterns(metrics)
            self.service_patterns[service] = patterns

            logger.info(f"Models trained for {service}: {len(patterns)} patterns detected")

        except Exception as e:
            logger.error(f"Model training failed for {service}: {e}")

    def _detect_anomalies(self, service: str, metrics: ServiceMetrics) -> List[AnomalyRecord]:
        """Detect anomalies in current metrics
        
        Args:
            service: Service name
            metrics: Current metrics
            
        Returns:
            List of detected anomalies
        """
        anomalies = []

        try:
            # Load detector
            detector = self.anomaly_detectors.get(service)
            if not detector or not detector.is_fitted:
                return anomalies

            # Extract features
            current_features = self.pattern_analyzers[service].extract_features(metrics)

            # Detect outliers
            predictions, scores = detector.predict(current_features.reshape(1, -1))

            if predictions[0] == -1:  # Anomaly detected
                anomaly_score = detector.get_anomaly_score(current_features)

                if anomaly_score > self.anomaly_threshold:
                    anomaly = AnomalyRecord(
                        anomaly_id=hashlib.md5(
                            f"{service}-{metrics.timestamp}".encode()
                        ).hexdigest()[:16],
                        service=service,
                        anomaly_type=AnomalyType.OUTLIER,
                        severity=self._calculate_severity(anomaly_score),
                        timestamp=metrics.timestamp,
                        metric_name="composite_metrics",
                        metric_value=anomaly_score,
                        baseline_value=0.5,
                        deviation_percent=(anomaly_score - 0.5) * 100,
                        confidence_score=anomaly_score,
                        description=f"Anomaly detected: composite anomaly score {anomaly_score:.2f}"
                    )
                    anomalies.append(anomaly)
                    self.stats["anomalies_detected"] += 1

            # Check for pattern shift
            if service in self.service_patterns:
                for pattern in self.service_patterns[service]:
                    is_shift, deviation = self.pattern_analyzers[service].detect_pattern_shift(
                        metrics, pattern, threshold=0.3
                    )

                    if is_shift:
                        anomaly = AnomalyRecord(
                            anomaly_id=hashlib.md5(
                                f"{service}-{metrics.timestamp}-shift".encode()
                            ).hexdigest()[:16],
                            service=service,
                            anomaly_type=AnomalyType.PATTERN_SHIFT,
                            severity=self._calculate_severity(deviation),
                            timestamp=metrics.timestamp,
                            metric_name="service_pattern",
                            metric_value=deviation,
                            baseline_value=0.3,
                            deviation_percent=deviation * 100,
                            confidence_score=deviation,
                            description=f"Pattern shift detected: deviation {deviation:.2f}"
                        )
                        anomalies.append(anomaly)
                        self.stats["anomalies_detected"] += 1

            # Check for trend change
            error_rates = self._load_metric_history(service, "error_rate", hours=24)
            is_change, change_mag = TrendAnalyzer.detect_trend_change(error_rates)

            if is_change:
                anomaly = AnomalyRecord(
                    anomaly_id=hashlib.md5(
                        f"{service}-{metrics.timestamp}-trend".encode()
                    ).hexdigest()[:16],
                    service=service,
                    anomaly_type=AnomalyType.TREND_CHANGE,
                    severity=AnomalySeverity.MEDIUM if change_mag > 0.5 else AnomalySeverity.LOW,
                    timestamp=metrics.timestamp,
                    metric_name="error_rate_trend",
                    metric_value=change_mag,
                    baseline_value=0.3,
                    deviation_percent=change_mag * 100,
                    confidence_score=min(change_mag, 1.0),
                    description=f"Trend change in error rate: magnitude {change_mag:.2f}"
                )
                anomalies.append(anomaly)
                self.stats["anomalies_detected"] += 1

        except Exception as e:
            logger.error(f"Anomaly detection failed for {service}: {e}")
            self.stats["errors"] += 1

        return anomalies

    def _load_metric_history(
        self,
        service: str,
        metric_name: str,
        hours: int = 24
    ) -> List[float]:
        """Load metric history for trend analysis
        
        Args:
            service: Service name
            metric_name: Metric field name
            hours: History duration
            
        Returns:
            List of metric values
        """
        try:
            conn = self._get_connection()
            cur = conn.cursor()

            query = f"""
                SELECT {metric_name}
                FROM analytics_metrics_1hour
                WHERE service = %s
                AND timestamp > CURRENT_TIMESTAMP - INTERVAL '%s hours'
                ORDER BY timestamp
            """

            cur.execute(query, (service, hours))
            values = [float(row[0]) for row in cur.fetchall()]

            cur.close()
            self._put_connection(conn)

            return values

        except Exception as e:
            logger.error(f"Failed to load metric history: {e}")
            return []

    def _calculate_severity(self, score: float) -> str:
        """Calculate anomaly severity based on score
        
        Args:
            score: Anomaly score (0-1)
            
        Returns:
            Severity level
        """
        if score < 0.4:
            return AnomalySeverity.LOW
        elif score < 0.6:
            return AnomalySeverity.MEDIUM
        elif score < 0.8:
            return AnomalySeverity.HIGH
        else:
            return AnomalySeverity.CRITICAL

    def _store_anomaly(self, anomaly: AnomalyRecord) -> bool:
        """Store detected anomaly in database
        
        Args:
            anomaly: Anomaly record
            
        Returns:
            Success flag
        """
        try:
            conn = self._get_connection()
            cur = conn.cursor()

            query = """
                INSERT INTO ml_anomalies 
                (anomaly_id, service, anomaly_type, severity, timestamp,
                 metric_name, metric_value, baseline_value, deviation_percent,
                 confidence_score, description)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (anomaly_id) DO NOTHING
            """

            cur.execute(query, (
                anomaly.anomaly_id,
                anomaly.service,
                anomaly.anomaly_type,
                anomaly.severity,
                anomaly.timestamp,
                anomaly.metric_name,
                anomaly.metric_value,
                anomaly.baseline_value,
                anomaly.deviation_percent,
                anomaly.confidence_score,
                anomaly.description
            ))

            conn.commit()
            cur.close()
            self._put_connection(conn)

            return True

        except Exception as e:
            logger.error(f"Failed to store anomaly: {e}")
            self.stats["errors"] += 1
            return False

    def run(self):
        """Main service loop"""
        logger.info("ML Orchestrator starting...")

        try:
            while True:
                # Consume messages
                messages = self.kafka_consumer.poll(timeout_ms=10000, max_records=100)

                for topic_partition, records in messages.items():
                    for message in records:
                        try:
                            data = message.value
                            self.stats["messages_processed"] += 1

                            # Parse alert/metric data
                            service = data.get("service", "unknown")

                            # Ensure model is trained for service
                            if service not in self.anomaly_detectors:
                                self.anomaly_detectors[service] = AnomalyDetector(
                                    contamination=self.contamination
                                )
                                self.pattern_analyzers[service] = PatternAnalyzer()

                            # Train/update models periodically
                            if self.stats["messages_processed"] % 100 == 0:
                                self._train_models(service)

                            # Reconstruct metrics (would come from analytics in production)
                            metrics = ServiceMetrics(
                                service=service,
                                timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat())),
                                window="1hour",
                                total_requests=int(data.get("total_requests", 0)),
                                error_rate=float(data.get("error_rate", 0)),
                                latency_p99_ms=float(data.get("latency_p99_ms", 0)),
                                latency_p95_ms=float(data.get("latency_p95_ms", 0)),
                                latency_mean_ms=float(data.get("latency_mean_ms", 0)),
                                unique_users=int(data.get("unique_users", 0)),
                                unique_ips=int(data.get("unique_ips", 0)),
                                risk_score=float(data.get("risk_score", 0))
                            )

                            # Detect anomalies
                            anomalies = self._detect_anomalies(service, metrics)

                            # Store and produce anomalies
                            for anomaly in anomalies:
                                self._store_anomaly(anomaly)
                                self.kafka_producer.send(
                                    self.kafka_output_topic,
                                    value=asdict(anomaly)
                                )

                        except Exception as e:
                            logger.error(f"Message processing failed: {e}")
                            self.stats["errors"] += 1

                # Log statistics periodically
                if self.stats["messages_processed"] % 500 == 0:
                    logger.info(
                        f"Stats: processed={self.stats['messages_processed']}, "
                        f"anomalies={self.stats['anomalies_detected']}, "
                        f"errors={self.stats['errors']}"
                    )

        except KeyboardInterrupt:
            logger.info("ML Orchestrator shutting down...")
            self._shutdown()
        except Exception as e:
            logger.error(f"Fatal error in ML Orchestrator: {e}")
            self._shutdown()
            raise

    def _shutdown(self):
        """Graceful shutdown"""
        logger.info(f"Final statistics: {self.stats}")

        if self.kafka_consumer:
            self.kafka_consumer.close()

        if self.kafka_producer:
            self.kafka_producer.close()

        if self.db_pool:
            self.db_pool.closeall()

        logger.info("ML Orchestrator shutdown complete")


def main():
    """Main entry point"""
    orchestrator = MLOrchestrator()
    orchestrator.run()


if __name__ == "__main__":
    main()
