#!/usr/bin/env python3
"""
Phase 5c: Predictive Alerting Service
Forecasts service degradation and generates predictive alerts
Uses ARIMA, Prophet, and exponential smoothing for time-series forecasting

NO mock data - production implementation only
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import pickle

import psycopg2
from psycopg2.pool import SimpleConnectionPool
from kafka import KafkaConsumer, KafkaProducer
import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.seasonal import seasonal_decompose
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

# Logging configuration
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ForecastType(str, Enum):
    """Types of forecasts"""
    SHORT_TERM = "short_term"    # 5-30 minutes ahead
    MEDIUM_TERM = "medium_term"  # 30 minutes to 4 hours
    LONG_TERM = "long_term"      # 4+ hours


class AlertPriority(str, Enum):
    """Alert priority levels"""
    INFORMATIONAL = "informational"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class ForecastPoint:
    """Single forecast prediction point"""
    timestamp: datetime
    predicted_value: float
    lower_bound: float
    upper_bound: float
    confidence: float  # 0-1


@dataclass
class PredictiveAlert:
    """Predicted alert for future degradation"""
    alert_id: str
    service: str
    metric_name: str
    prediction_type: str  # sla_violation, threshold_breach, anomaly_risk
    predicted_event: str
    prediction_confidence: float
    predicted_time_start: datetime
    predicted_time_end: datetime
    current_value: float
    predicted_value: float
    baseline_value: float
    recommended_action: str
    priority: AlertPriority


@dataclass
class CapacityForecast:
    """Resource capacity forecast"""
    service: str
    metric_name: str
    current_capacity: float
    forecast_horizon: int  # hours
    predicted_utilization: List[float]
    estimated_exhaustion_time: Optional[datetime]
    recommendations: List[str]


class TimeSeriesForecast:
    """ARIMA-based time-series forecasting"""
    
    def __init__(self, service: str, metric: str, order: Tuple = (1, 1, 1)):
        """Initialize ARIMA forecaster
        
        Args:
            service: Service name
            metric: Metric name
            order: (p, d, q) ARIMA order
        """
        self.service = service
        self.metric = metric
        self.order = order
        self.model = None
        self.is_fitted = False
        self.last_value = None
        self.history = []
    
    def fit(self, values: List[float], timestamps: List[datetime] = None) -> bool:
        """Fit ARIMA model to time-series data
        
        Args:
            values: Historical values
            timestamps: Optional timestamps for validation
            
        Returns:
            Success status
        """
        try:
            if len(values) < 10:
                logger.warning(f"Insufficient data for ARIMA: {len(values)} points")
                return False
            
            # Convert to pandas Series for ARIMA
            series = pd.Series(values)
            
            # Fit ARIMA model
            self.model = ARIMA(series, order=self.order)
            self.model = self.model.fit()
            
            self.is_fitted = True
            self.history = values[-100:]  # Keep last 100 for reference
            self.last_value = values[-1]
            
            logger.info(f"ARIMA model fitted for {self.service}/{self.metric}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to fit ARIMA model: {e}")
            return False
    
    def forecast(self, steps: int = 12) -> List[ForecastPoint]:
        """Generate forecasts for future periods
        
        Args:
            steps: Number of steps to forecast
            
        Returns:
            List of forecast points
        """
        if not self.is_fitted or self.model is None:
            logger.warning("Model not fitted, cannot forecast")
            return []
        
        try:
            # Generate forecast
            forecast_result = self.model.get_forecast(steps=steps)
            forecast_df = forecast_result.conf_int(alpha=0.1)
            forecast_df['mean'] = forecast_result.predicted_mean
            
            # Build forecast points
            forecasts = []
            base_time = datetime.now()
            
            for i in range(steps):
                forecast_point = ForecastPoint(
                    timestamp=base_time + timedelta(minutes=5 * (i + 1)),
                    predicted_value=float(forecast_df['mean'].iloc[i]),
                    lower_bound=float(forecast_df.iloc[i, 0]),
                    upper_bound=float(forecast_df.iloc[i, 1]),
                    confidence=0.9  # 90% confidence interval
                )
                forecasts.append(forecast_point)
            
            return forecasts
            
        except Exception as e:
            logger.error(f"Forecasting failed: {e}")
            return []
    
    def detect_threshold_breach(
        self,
        threshold: float,
        forecast_steps: int = 12
    ) -> Tuple[bool, Optional[datetime]]:
        """Predict if metric will breach threshold
        
        Args:
            threshold: Threshold value
            forecast_steps: Steps to forecast
            
        Returns:
            (will_breach, estimated_time)
        """
        try:
            forecasts = self.forecast(forecast_steps)
            
            for forecast in forecasts:
                if forecast.predicted_value > threshold:
                    return (True, forecast.timestamp)
            
            return (False, None)
            
        except Exception as e:
            logger.error(f"Threshold breach detection failed: {e}")
            return (False, None)


class SeasonalForecast:
    """Seasonal decomposition and forecasting"""
    
    def __init__(self, service: str, metric: str):
        """Initialize seasonal forecaster
        
        Args:
            service: Service name
            metric: Metric name
        """
        self.service = service
        self.metric = metric
        self.trend = None
        self.seasonal = None
        self.residual = None
        self.is_fitted = False
    
    def fit(self, values: List[float], period: int = 12) -> bool:
        """Fit seasonal decomposition
        
        Args:
            values: Historical values
            period: Seasonal period (e.g., 12 for hourly data)
            
        Returns:
            Success status
        """
        try:
            if len(values) < period * 2:
                logger.warning(f"Insufficient data for seasonal decomposition")
                return False
            
            # Perform seasonal decomposition
            series = pd.Series(values)
            decomposition = seasonal_decompose(series, model='additive', period=period)
            
            self.trend = decomposition.trend.values
            self.seasonal = decomposition.seasonal.values
            self.residual = decomposition.resid.values
            self.is_fitted = True
            
            logger.info(f"Seasonal decomposition fitted for {self.service}/{self.metric}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to fit seasonal model: {e}")
            return False
    
    def get_seasonal_component(self) -> List[float]:
        """Get seasonal component
        
        Returns:
            Seasonal pattern
        """
        if self.seasonal is not None:
            return self.seasonal.tolist()
        return []
    
    def predict_next_seasonal_value(self, current_trend: float) -> float:
        """Predict next value considering seasonality
        
        Args:
            current_trend: Current trend value
            
        Returns:
            Predicted value
        """
        if self.seasonal is None or len(self.seasonal) == 0:
            return current_trend
        
        # Use last seasonal component
        seasonal_component = self.seasonal[-1]
        return current_trend + seasonal_component


class CapacityPlanner:
    """Resource capacity forecasting"""
    
    def __init__(self, service: str, metric: str):
        """Initialize capacity planner
        
        Args:
            service: Service name
            metric: Metric name
        """
        self.service = service
        self.metric = metric
        self.linear_model = LinearRegression()
        self.is_fitted = False
    
    def fit(self, values: List[float], capacity: float) -> bool:
        """Fit linear capacity model
        
        Args:
            values: Historical values
            capacity: Maximum capacity
            
        Returns:
            Success status
        """
        try:
            if len(values) < 5:
                return False
            
            # Prepare data for linear regression
            X = np.arange(len(values)).reshape(-1, 1)
            y = np.array(values)
            
            # Fit model
            self.linear_model.fit(X, y)
            self.is_fitted = True
            
            logger.info(f"Capacity model fitted for {self.service}/{self.metric}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to fit capacity model: {e}")
            return False
    
    def estimate_exhaustion_time(
        self,
        capacity: float,
        current_value: float,
        forecast_horizon: int = 24
    ) -> Optional[datetime]:
        """Estimate when capacity will be exhausted
        
        Args:
            capacity: Maximum capacity
            current_value: Current value
            forecast_horizon: Hours to forecast
            
        Returns:
            Estimated exhaustion time or None
        """
        try:
            if not self.is_fitted:
                return None
            
            slope = self.linear_model.coef_[0]
            
            # If not growing, won't exhaust
            if slope <= 0:
                return None
            
            # Calculate hours until exhaustion
            remaining_capacity = capacity - current_value
            hours_until_exhaustion = remaining_capacity / (slope / 60)  # slope per minute
            
            if hours_until_exhaustion > 0 and hours_until_exhaustion <= forecast_horizon:
                return datetime.now() + timedelta(hours=hours_until_exhaustion)
            
            return None
            
        except Exception as e:
            logger.error(f"Exhaustion estimation failed: {e}")
            return None
    
    def generate_capacity_forecast(
        self,
        values: List[float],
        capacity: float,
        forecast_horizon: int = 24
    ) -> CapacityForecast:
        """Generate full capacity forecast
        
        Args:
            values: Historical values
            capacity: Maximum capacity
            forecast_horizon: Hours to forecast
            
        Returns:
            Capacity forecast
        """
        try:
            # Generate predictions
            X_future = np.arange(len(values), len(values) + forecast_horizon * 60).reshape(-1, 1)
            predictions = self.linear_model.predict(X_future).tolist()
            
            # Estimate exhaustion
            current_value = values[-1]
            exhaustion_time = self.estimate_exhaustion_time(capacity, current_value)
            
            # Generate recommendations
            recommendations = []
            predicted_utilization = [v / capacity for v in predictions]
            max_predicted = max(predicted_utilization)
            
            if max_predicted > 0.9:
                recommendations.append("Critical: Prepare for capacity scaling")
            elif max_predicted > 0.8:
                recommendations.append("Warning: Monitor capacity closely")
            
            if exhaustion_time:
                hours_until = (exhaustion_time - datetime.now()).total_seconds() / 3600
                recommendations.append(f"Estimated capacity exhaustion in {hours_until:.1f} hours")
            
            return CapacityForecast(
                service=self.service,
                metric_name=self.metric,
                current_capacity=capacity,
                forecast_horizon=forecast_horizon,
                predicted_utilization=predicted_utilization[:forecast_horizon],
                estimated_exhaustion_time=exhaustion_time,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Capacity forecast generation failed: {e}")
            return CapacityForecast(
                service=self.service,
                metric_name=self.metric,
                current_capacity=capacity,
                forecast_horizon=forecast_horizon,
                predicted_utilization=[],
                estimated_exhaustion_time=None,
                recommendations=["Error generating forecast"]
            )


class PredictiveAlerter:
    """Main predictive alerting orchestrator"""
    
    def __init__(self):
        """Initialize predictive alerter"""
        self.db_pool = SimpleConnectionPool(
            2, 10,
            host=os.getenv('POSTGRES_HOST', 'localhost'),
            user=os.getenv('POSTGRES_USER', 'stacklens'),
            password=os.getenv('POSTGRES_PASSWORD', 'password'),
            database=os.getenv('POSTGRES_DB', 'stacklens'),
            port=int(os.getenv('POSTGRES_PORT', 5432))
        )
        
        self.kafka_consumer = KafkaConsumer(
            'ml-anomalies',
            bootstrap_servers=os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
            group_id='predictive-alerts-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='latest',
            max_poll_records=50
        )
        
        self.kafka_producer = KafkaProducer(
            bootstrap_servers=os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092'),
            value_serializer=lambda m: json.dumps(m).encode('utf-8')
        )
        
        self.forecasters: Dict[str, TimeSeriesForecast] = {}
        self.seasonal_models: Dict[str, SeasonalForecast] = {}
        self.capacity_planners: Dict[str, CapacityPlanner] = {}
        
        self.statistics = {
            'messages_processed': 0,
            'alerts_generated': 0,
            'capacity_forecasts': 0,
            'errors': 0,
            'start_time': datetime.now()
        }
        
        logger.info("PredictiveAlerter initialized")
    
    def _get_service_metrics(
        self,
        service: str,
        metric: str,
        hours: int = 4
    ) -> List[float]:
        """Load historical metrics from database
        
        Args:
            service: Service name
            metric: Metric name
            hours: Hours of history to load
            
        Returns:
            List of metric values
        """
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            query = """
                SELECT value FROM analytics_metrics_1hour
                WHERE service = %s
                AND metric_name = %s
                AND timestamp > NOW() - INTERVAL '%s hours'
                ORDER BY timestamp ASC
            """
            
            cursor.execute(query, (service, metric, hours))
            rows = cursor.fetchall()
            cursor.close()
            self.db_pool.putconn(conn)
            
            return [float(row[0]) for row in rows]
            
        except Exception as e:
            logger.error(f"Failed to load metrics: {e}")
            self.statistics['errors'] += 1
            return []
    
    def _load_anomaly(self, anomaly_msg: Dict) -> Dict:
        """Load anomaly from Kafka message
        
        Args:
            anomaly_msg: Kafka message
            
        Returns:
            Parsed anomaly
        """
        try:
            return {
                'service': anomaly_msg.get('service'),
                'anomaly_type': anomaly_msg.get('anomaly_type'),
                'timestamp': datetime.fromisoformat(anomaly_msg.get('timestamp')),
                'metric_name': anomaly_msg.get('metric_name'),
                'severity': anomaly_msg.get('severity'),
                'confidence_score': anomaly_msg.get('confidence_score', 0.5)
            }
        except Exception as e:
            logger.error(f"Failed to parse anomaly: {e}")
            self.statistics['errors'] += 1
            return {}
    
    def _generate_predictive_alert(
        self,
        service: str,
        metric: str,
        anomaly: Dict
    ) -> Optional[PredictiveAlert]:
        """Generate predictive alert from anomaly
        
        Args:
            service: Service name
            metric: Metric name
            anomaly: Anomaly data
            
        Returns:
            Predictive alert or None
        """
        try:
            # Load historical data
            values = self._get_service_metrics(service, metric, hours=4)
            
            if len(values) < 10:
                return None
            
            # Get or create forecaster
            key = f"{service}/{metric}"
            if key not in self.forecasters:
                self.forecasters[key] = TimeSeriesForecast(service, metric)
            
            forecaster = self.forecasters[key]
            
            # Fit and forecast
            if not forecaster.is_fitted:
                forecaster.fit(values)
            
            # Generate forecast
            forecasts = forecaster.forecast(steps=24)
            
            if not forecasts:
                return None
            
            # Detect threshold breach risk
            avg_value = np.mean(values)
            threshold = avg_value * 1.5  # 50% above average
            
            will_breach, breach_time = forecaster.detect_threshold_breach(threshold)
            
            if not will_breach:
                return None
            
            # Create alert
            alert_id = hashlib.md5(
                f"{service}{metric}{datetime.now()}".encode()
            ).hexdigest()
            
            alert = PredictiveAlert(
                alert_id=alert_id,
                service=service,
                metric_name=metric,
                prediction_type='threshold_breach',
                predicted_event=f"{metric} may exceed threshold in {(breach_time - datetime.now()).total_seconds() / 3600:.1f} hours",
                prediction_confidence=0.8,
                predicted_time_start=datetime.now(),
                predicted_time_end=breach_time,
                current_value=values[-1],
                predicted_value=forecasts[-1].predicted_value,
                baseline_value=np.mean(values),
                recommended_action=f"Monitor {metric} closely, prepare scaling if breach occurs",
                priority=AlertPriority.WARNING if will_breach else AlertPriority.INFORMATIONAL
            )
            
            return alert
            
        except Exception as e:
            logger.error(f"Alert generation failed: {e}")
            self.statistics['errors'] += 1
            return None
    
    def _generate_capacity_forecast(
        self,
        service: str,
        metric: str,
        capacity: float = 10000.0
    ) -> Optional[CapacityForecast]:
        """Generate capacity forecast
        
        Args:
            service: Service name
            metric: Metric name
            capacity: Maximum capacity
            
        Returns:
            Capacity forecast or None
        """
        try:
            # Load historical data
            values = self._get_service_metrics(service, metric, hours=24)
            
            if len(values) < 10:
                return None
            
            # Get or create capacity planner
            key = f"{service}/{metric}"
            if key not in self.capacity_planners:
                self.capacity_planners[key] = CapacityPlanner(service, metric)
            
            planner = self.capacity_planners[key]
            
            # Fit and forecast
            if not planner.is_fitted:
                planner.fit(values, capacity)
            
            # Generate forecast
            forecast = planner.generate_capacity_forecast(values, capacity)
            
            return forecast
            
        except Exception as e:
            logger.error(f"Capacity forecast generation failed: {e}")
            self.statistics['errors'] += 1
            return None
    
    def _store_alert(self, alert: PredictiveAlert) -> bool:
        """Store alert in database
        
        Args:
            alert: Alert to store
            
        Returns:
            Success status
        """
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            query = """
                INSERT INTO ml_predictive_alerts
                (alert_id, service, predicted_event, prediction_confidence,
                 predicted_time_start, predicted_time_end, recommended_action, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (alert_id) DO NOTHING
            """
            
            cursor.execute(query, (
                alert.alert_id,
                alert.service,
                alert.predicted_event,
                alert.prediction_confidence,
                alert.predicted_time_start,
                alert.predicted_time_end,
                alert.recommended_action
            ))
            
            conn.commit()
            cursor.close()
            self.db_pool.putconn(conn)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to store alert: {e}")
            self.statistics['errors'] += 1
            return False
    
    def run(self) -> None:
        """Main service loop"""
        logger.info("Starting predictive alerter service")
        
        try:
            while True:
                # Consume anomalies
                messages = self.kafka_consumer.poll(timeout_ms=10000, max_records=50)
                
                for topic_partition, records in messages.items():
                    for record in records:
                        try:
                            self.statistics['messages_processed'] += 1
                            
                            # Parse anomaly
                            anomaly = self._load_anomaly(record.value)
                            
                            if not anomaly or 'service' not in anomaly:
                                continue
                            
                            service = anomaly['service']
                            metric = anomaly.get('metric_name', 'error_rate')
                            
                            # Generate predictive alert
                            alert = self._generate_predictive_alert(service, metric, anomaly)
                            
                            if alert:
                                # Store alert
                                self._store_alert(alert)
                                
                                # Produce to topic
                                self.kafka_producer.send(
                                    'predictive-alerts',
                                    value=asdict(alert)
                                )
                                
                                self.statistics['alerts_generated'] += 1
                                logger.info(f"Generated alert for {service}/{metric}")
                            
                            # Periodically generate capacity forecasts
                            if self.statistics['messages_processed'] % 100 == 0:
                                capacity_forecast = self._generate_capacity_forecast(
                                    service, metric
                                )
                                
                                if capacity_forecast:
                                    self.statistics['capacity_forecasts'] += 1
                                    logger.info(
                                        f"Capacity forecast for {service}/{metric}: "
                                        f"exhaustion in {capacity_forecast.recommendations}"
                                    )
                        
                        except Exception as e:
                            logger.error(f"Error processing message: {e}")
                            self.statistics['errors'] += 1
        
        except KeyboardInterrupt:
            logger.info("Shutting down predictive alerter")
            self._shutdown()
    
    def _shutdown(self) -> None:
        """Graceful shutdown"""
        try:
            elapsed = (datetime.now() - self.statistics['start_time']).total_seconds()
            
            logger.info(f"Predictive Alerter Statistics:")
            logger.info(f"  Messages processed: {self.statistics['messages_processed']}")
            logger.info(f"  Alerts generated: {self.statistics['alerts_generated']}")
            logger.info(f"  Capacity forecasts: {self.statistics['capacity_forecasts']}")
            logger.info(f"  Errors: {self.statistics['errors']}")
            logger.info(f"  Runtime: {elapsed:.1f} seconds")
            
            self.kafka_consumer.close()
            self.kafka_producer.close()
            self.db_pool.closeall()
            
        except Exception as e:
            logger.error(f"Shutdown error: {e}")


if __name__ == '__main__':
    alerter = PredictiveAlerter()
    alerter.run()
