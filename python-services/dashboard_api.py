#!/usr/bin/env python3
"""
Phase 4: Dashboard API Service
Real-time analytics visualization API with REST endpoints

Provides metrics, alerts, SLA, and performance data to frontend dashboard
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from flask import Flask, jsonify, request, WebSocket
from flask_cors import CORS

# Logging configuration
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TimeWindow(str, Enum):
    """Aggregation time windows"""
    ONE_MIN = "1min"
    FIVE_MIN = "5min"
    ONE_HOUR = "1hour"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class ServiceMetric:
    """Service metric data point"""
    service: str
    timestamp: str
    window: str
    total_requests: int
    error_count: int
    error_rate: float
    latency_min_ms: float
    latency_p50_ms: float
    latency_p95_ms: float
    latency_p99_ms: float
    latency_max_ms: float
    latency_mean_ms: float
    unique_users: int
    unique_ips: int
    risk_score: float


@dataclass
class AlertData:
    """Alert instance data"""
    alert_id: int
    service: str
    rule_name: str
    severity: str
    message: str
    triggered_at: str
    resolved_at: Optional[str]
    status: str


@dataclass
class HealthStatus:
    """Service health status"""
    service: str
    status: str  # healthy, degraded, unhealthy
    error_rate: float
    p99_latency_ms: float
    timestamp: str


class DashboardAPI:
    """Dashboard API Service for analytics visualization"""
    
    def __init__(self):
        """Initialize dashboard API"""
        self.app = Flask(__name__)
        CORS(self.app)
        
        # Database configuration
        self.db_host = os.getenv("DB_HOST", "localhost")
        self.db_port = int(os.getenv("DB_PORT", "5432"))
        self.db_name = os.getenv("DB_NAME", "stacklens")
        self.db_user = os.getenv("DB_USER", "stacklens_user")
        self.db_password = os.getenv("DB_PASSWORD", "stacklens_password")
        
        # Connection pool
        self.pool = None
        self._init_db_pool()
        
        # Statistics
        self.stats = {
            "requests_served": 0,
            "queries_executed": 0,
            "errors": 0,
            "start_time": datetime.now().isoformat()
        }
        
        # Setup routes
        self._setup_routes()
        
        logger.info("Dashboard API initialized")
    
    def _init_db_pool(self):
        """Initialize database connection pool"""
        try:
            self.pool = SimpleConnectionPool(
                1, 5,
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
                user=self.db_user,
                password=self.db_password
            )
            logger.info("Database connection pool initialized")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise
    
    def _get_connection(self):
        """Get connection from pool"""
        return self.pool.getconn()
    
    def _put_connection(self, conn):
        """Return connection to pool"""
        self.pool.putconn(conn)
    
    def _execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute database query"""
        conn = None
        try:
            conn = self._get_connection()
            cur = conn.cursor()
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)
            
            # Get column names
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            
            # Convert to list of dicts
            results = [dict(zip(columns, row)) for row in rows]
            
            self.stats["queries_executed"] += 1
            cur.close()
            return results
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            self.stats["errors"] += 1
            raise
        finally:
            if conn:
                self._put_connection(conn)
    
    def _setup_routes(self):
        """Setup API routes"""
        
        @self.app.route('/health', methods=['GET'])\n        def health():
            """Health check endpoint"""
            try:
                conn = self._get_connection()
                cur = conn.cursor()
                cur.execute("SELECT 1")
                cur.close()
                self._put_connection(conn)
                
                return jsonify({
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "database": "connected"
                }), 200
            except Exception as e:
                logger.error(f"Health check failed: {e}")
                return jsonify({
                    "status": "unhealthy",
                    "error": str(e)
                }), 500
        
        @self.app.route('/metrics', methods=['GET'])
        def get_metrics():
            """Get service metrics"""
            self.stats["requests_served"] += 1
            
            try:
                window = request.args.get('window', '1min')
                service = request.args.get('service', None)
                limit = int(request.args.get('limit', 100))
                
                # Validate window
                if window not in [w.value for w in TimeWindow]:
                    return jsonify({"error": "Invalid window"}), 400
                
                table = f"analytics_metrics_{window}"
                
                if service:
                    query = f"""
                        SELECT * FROM {table}
                        WHERE service = %s
                        ORDER BY timestamp DESC
                        LIMIT %s
                    """
                    results = self._execute_query(query, (service, limit))
                else:
                    query = f"""
                        SELECT * FROM {table}
                        ORDER BY timestamp DESC
                        LIMIT %s
                    """
                    results = self._execute_query(query, (limit,))
                
                return jsonify({
                    "window": window,
                    "metrics": results,
                    "count": len(results)
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get metrics: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/health-status', methods=['GET'])
        def get_health_status():
            """Get current health status of services"""
            self.stats["requests_served"] += 1
            
            try:
                query = "SELECT * FROM v_service_health_current ORDER BY service"
                results = self._execute_query(query)
                
                return jsonify({
                    "status": "ok",
                    "services": results,
                    "count": len(results),
                    "timestamp": datetime.now().isoformat()
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get health status: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/performance-trend', methods=['GET'])
        def get_performance_trend():
            """Get 7-day performance trend"""
            self.stats["requests_served"] += 1
            
            try:
                service = request.args.get('service', None)
                
                if service:
                    query = """
                        SELECT * FROM v_service_performance_trend
                        WHERE service = %s
                        ORDER BY timestamp
                    """
                    results = self._execute_query(query, (service,))
                else:
                    query = """
                        SELECT * FROM v_service_performance_trend
                        ORDER BY timestamp
                    """
                    results = self._execute_query(query)
                
                return jsonify({
                    "trend": results,
                    "count": len(results),
                    "period_days": 7
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get performance trend: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/alerts', methods=['GET'])
        def get_alerts():
            """Get active alerts"""
            self.stats["requests_served"] += 1
            
            try:
                status = request.args.get('status', 'active')  # active, resolved, all
                severity = request.args.get('severity', None)
                limit = int(request.args.get('limit', 50))
                
                if status == 'active':
                    query = """
                        SELECT * FROM v_active_alerts_summary
                        ORDER BY triggered_at DESC
                        LIMIT %s
                    """
                    results = self._execute_query(query, (limit,))
                
                elif status == 'resolved':
                    query = """
                        SELECT * FROM analytics_alerts
                        WHERE status = 'resolved'
                        ORDER BY resolved_at DESC
                        LIMIT %s
                    """
                    results = self._execute_query(query, (limit,))
                
                else:  # all
                    query = """
                        SELECT * FROM analytics_alerts
                        ORDER BY triggered_at DESC
                        LIMIT %s
                    """
                    results = self._execute_query(query, (limit,))
                
                # Filter by severity if provided
                if severity:
                    results = [r for r in results if r.get('severity') == severity]
                
                return jsonify({
                    "alerts": results,
                    "count": len(results),
                    "status": status
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get alerts: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/top-error-services', methods=['GET'])
        def get_top_error_services():
            """Get services with highest error rates"""
            self.stats["requests_served"] += 1
            
            try:
                limit = int(request.args.get('limit', 10))
                
                query = """
                    SELECT * FROM v_top_error_services
                    LIMIT %s
                """
                results = self._execute_query(query, (limit,))
                
                return jsonify({
                    "services": results,
                    "count": len(results)
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get top error services: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/slowest-services', methods=['GET'])
        def get_slowest_services():
            """Get services with highest latency"""
            self.stats["requests_served"] += 1
            
            try:
                limit = int(request.args.get('limit', 10))
                
                query = """
                    SELECT * FROM v_slowest_services
                    LIMIT %s
                """
                results = self._execute_query(query, (limit,))
                
                return jsonify({
                    "services": results,
                    "count": len(results)
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get slowest services: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/high-risk-events', methods=['GET'])
        def get_high_risk_events():
            """Get high-risk events"""
            self.stats["requests_served"] += 1
            
            try:
                risk_threshold = float(request.args.get('threshold', 0.8))
                limit = int(request.args.get('limit', 50))
                
                query = """
                    SELECT * FROM v_high_risk_events
                    WHERE risk_score >= %s
                    ORDER BY risk_score DESC, timestamp DESC
                    LIMIT %s
                """
                results = self._execute_query(query, (risk_threshold, limit))
                
                return jsonify({
                    "events": results,
                    "count": len(results),
                    "threshold": risk_threshold
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get high-risk events: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/sla', methods=['GET'])
        def get_sla():
            """Get SLA metrics for services"""
            self.stats["requests_served"] += 1
            
            try:
                service = request.args.get('service', None)
                days = int(request.args.get('days', 7))
                
                if service:
                    query = """
                        SELECT
                            service,
                            analytics_calculate_sla(
                                service,
                                (CURRENT_TIMESTAMP - INTERVAL '%s days')::timestamp
                            ) as uptime_percentage
                        WHERE service = %s
                    """
                    results = self._execute_query(
                        query,
                        (days, service)
                    )
                else:
                    query = """
                        SELECT DISTINCT service,
                            analytics_calculate_sla(
                                service,
                                (CURRENT_TIMESTAMP - INTERVAL '%s days')::timestamp
                            ) as uptime_percentage
                        FROM analytics_metrics_1hour
                        ORDER BY service
                    """
                    results = self._execute_query(query, (days,))
                
                return jsonify({
                    "sla_metrics": results,
                    "period_days": days,
                    "count": len(results)
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get SLA: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/alert-stats', methods=['GET'])
        def get_alert_stats():
            """Get alert statistics"""
            self.stats["requests_served"] += 1
            
            try:
                query = "SELECT * FROM analytics_get_alert_stats()"
                results = self._execute_query(query)
                
                return jsonify({
                    "stats": results[0] if results else {},
                    "timestamp": datetime.now().isoformat()
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get alert stats: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/stats', methods=['GET'])
        def get_stats():
            """Get API statistics"""
            self.stats["requests_served"] += 1
            
            try:
                uptime_sec = (datetime.now() - datetime.fromisoformat(
                    self.stats["start_time"]
                )).total_seconds()
                
                return jsonify({
                    **self.stats,
                    "uptime_seconds": uptime_sec
                }), 200
            
            except Exception as e:
                logger.error(f"Failed to get stats: {e}")
                return jsonify({"error": str(e)}), 500
        
        @self.app.route('/query', methods=['POST'])
        def custom_query():
            """Execute custom analytics query (with query validation)"""
            self.stats["requests_served"] += 1
            
            try:
                data = request.get_json()
                
                if not data or 'query' not in data:
                    return jsonify({"error": "Missing query parameter"}), 400
                
                query = data['query']
                
                # Basic query validation (prevent schema modifications)
                forbidden_keywords = ['DROP', 'DELETE', 'ALTER', 'TRUNCATE', 'INSERT', 'UPDATE']
                if any(kw in query.upper() for kw in forbidden_keywords):
                    return jsonify({"error": "Query modification operations not allowed"}), 403
                
                results = self._execute_query(query)
                
                return jsonify({
                    "results": results,
                    "count": len(results)
                }), 200
            
            except Exception as e:
                logger.error(f"Custom query failed: {e}")
                self.stats["errors"] += 1
                return jsonify({"error": str(e)}), 500
    
    def run(self, host: str = '0.0.0.0', port: int = 8005, debug: bool = False):
        """Run dashboard API server"""
        logger.info(f"Starting Dashboard API on {host}:{port}")
        try:
            self.app.run(host=host, port=port, debug=debug, threaded=True)
        except Exception as e:
            logger.error(f"Failed to start Dashboard API: {e}")
            raise


def main():
    """Main entry point"""
    # Get configuration from environment
    api_host = os.getenv("API_HOST", "0.0.0.0")
    api_port = int(os.getenv("API_PORT", "8005"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    
    # Initialize and run API
    api = DashboardAPI()
    api.run(host=api_host, port=api_port, debug=debug)


if __name__ == "__main__":
    main()
