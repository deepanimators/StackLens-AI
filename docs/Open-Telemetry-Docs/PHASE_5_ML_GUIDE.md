# Phase 5: ML & Anomaly Detection - Comprehensive Guide

## Overview

Phase 5 transforms Phase 4 analytics alerts into machine learning-driven anomaly detection with pattern recognition, trend analysis, and predictive alerting capabilities.

**Architecture:**
```
Phase 4 Analytics Alerts 
    ↓ (Kafka: analytics-alerts)
    ↓
ML Anomaly Detection Service (Isolation Forest + DBSCAN + Trend Analysis)
    ↓ (Kafka: ml-anomalies)
    ├→ Predictive Alerter (ARIMA Forecasting)
    │   ↓ (Kafka: predictive-alerts)
    │   ↓
    └→ Database (ml_anomalies, ml_patterns, ml_forecasts)
```

**Key Features:**
- Real-time anomaly detection using Isolation Forest
- Service behavior pattern recognition via DBSCAN clustering
- Trend and seasonality analysis with polynomial fitting
- Predictive alerting using ARIMA/exponential smoothing
- Capacity forecasting and SLA violation prediction
- NO mock data - production implementation only

## Components

### 1. ML Service (`ml_service.py`)

Main orchestrator that processes analytics alerts and detects anomalies.

**Classes:**

#### AnomalyDetector
Isolation Forest-based single-variable anomaly detection.

```python
from ml_service import AnomalyDetector
import numpy as np

detector = AnomalyDetector(contamination=0.1)

# Train on historical data
training_data = np.array([[0.5, 150, 100, 50, 1000, 500, 0.3, 10000], ...])
detector.fit(training_data)

# Predict anomalies
predictions, scores = detector.predict(test_data)
# predictions: -1 (anomaly), 1 (normal)
# scores: 0-1 anomaly confidence

# Single point scoring
score = detector.get_anomaly_score(single_point)
```

**Usage in Service:**
- Trained on per-service historical metrics (7 days of Phase 4 analytics)
- Detects statistical outliers in error rates, latency, capacity
- Retrains every 100 messages for adaptation
- Returns confidence scores for SLA-based alerting

#### PatternAnalyzer
DBSCAN-based service behavior pattern recognition.

```python
from ml_service import PatternAnalyzer

analyzer = PatternAnalyzer()

# Extract 8-dimensional feature vector from metrics
metrics = ServiceMetrics(service='api', timestamp=..., total_requests=10000, ...)
features = analyzer.extract_features(metrics)
# Returns: [error_rate, latency_p99, latency_p95, latency_mean, 
#           unique_users, unique_ips, risk_score, total_requests]

# Analyze historical patterns
patterns = analyzer.analyze_patterns(historical_metrics)

# Detect pattern shifts
for pattern in patterns:
    is_shift, deviation = analyzer.detect_pattern_shift(current_metric, pattern)
    if is_shift and deviation > 0.7:
        # Alert: behavior changed
```

**Usage in Service:**
- Clusters 100-message windows of historical metrics using DBSCAN
- Creates pattern signatures with feature vectors
- Detects deviation from expected service behavior
- Identifies anomalies that individual metrics don't capture

#### TrendAnalyzer
Time-series trend and seasonality detection (static methods).

```python
from ml_service import TrendAnalyzer
import numpy as np

# Detect trend direction and magnitude
values = np.array([10, 11, 12, 15, 16, 18, 20])
trend = TrendAnalyzer.calculate_trend(values)
# Returns: 0.8 (upward trend, -1 to 1 scale)

# Detect seasonality
seasonal_strength = TrendAnalyzer.calculate_seasonality(values)
# Returns: 0-1 (0 = no seasonality, 1 = strong seasonality)

# Detect trend changes
is_changing, magnitude = TrendAnalyzer.detect_trend_change(values)
# Returns: (True/False, magnitude of change)
```

**Usage in Service:**
- Polynomial fitting for trend calculation
- Autocorrelation analysis for seasonality
- Change-point detection via two-window comparison
- Identifies SLA violations from trend changes

#### MLOrchestrator
Main service orchestrator.

```python
from ml_service import MLOrchestrator

orchestrator = MLOrchestrator()
orchestrator.run()  # Main Kafka consumer loop
```

**Workflow:**
1. Consumes analytics-alerts from Phase 4 (batch: 100 messages, 10s timeout)
2. Loads historical metrics from Phase 4 analytics_metrics_1hour table
3. Trains per-service anomaly detectors and pattern analyzers
4. Detects anomalies using three methods:
   - Isolation Forest outlier detection
   - Pattern shift detection
   - Trend change detection
5. Stores anomalies in ml_anomalies PostgreSQL table
6. Produces detected anomalies to ml-anomalies Kafka topic
7. Updates statistics and handles errors gracefully

**Configuration:**
```yaml
Contamination: 0.1 (10% expected anomalies in Isolation Forest)
Pattern Window: 168 hours (1 week history for patterns)
Anomaly Threshold: 0.7 (confidence score for alerting)
Retraining Interval: 100 messages
Batch Size: 100 messages
Timeout: 10 seconds
```

### 2. Predictive Alerter (`predictive_alerter.py`)

Forecasts future degradation and generates predictive alerts.

**Classes:**

#### TimeSeriesForecast
ARIMA-based time-series forecasting.

```python
from predictive_alerter import TimeSeriesForecast

forecaster = TimeSeriesForecast(service='api', metric='error_rate', order=(1,1,1))

# Train on historical data
historical_values = [0.5, 0.4, 0.6, 0.5, 0.7, ...]
forecaster.fit(historical_values)

# Generate forecasts
forecasts = forecaster.forecast(steps=12)  # 12 steps ahead (1 hour for 5-min intervals)
for forecast in forecasts:
    print(f"Time: {forecast.timestamp}, Value: {forecast.predicted_value}")
    print(f"Range: {forecast.lower_bound} - {forecast.upper_bound}")

# Detect threshold breaches
will_breach, breach_time = forecaster.detect_threshold_breach(threshold=1.0, steps=24)
```

**Forecasting Method:**
- ARIMA (AutoRegressive Integrated Moving Average)
- Order: (1, 1, 1) - 1-lag AR, 1st order differencing, 1-lag MA
- 90% confidence intervals for uncertainty quantification
- Handles non-stationary time series via differencing
- Validation on held-out test sets

#### SeasonalForecast
Seasonal decomposition and forecasting.

```python
from predictive_alerter import SeasonalForecast

seasonal = SeasonalForecast(service='api', metric='latency_p99')

# Fit seasonal decomposition
seasonal.fit(values, period=12)  # 12 steps per cycle

# Get components
trend = seasonal.trend
seasonal_component = seasonal.seasonal
residual = seasonal.residual

# Predict next value with seasonality
next_value = seasonal.predict_next_seasonal_value(current_trend=100)
```

**Decomposition:**
- Additive model: value = trend + seasonal + residual
- Period: 12 (hourly data with daily cycle)
- Extracts trend for underlying direction
- Isolates seasonal patterns
- Analyzes residuals for anomalies

#### CapacityPlanner
Resource capacity forecasting.

```python
from predictive_alerter import CapacityPlanner

planner = CapacityPlanner(service='db', metric='connections_used')

# Train on historical data
planner.fit(values, capacity=100)

# Estimate exhaustion time
exhaustion_time = planner.estimate_exhaustion_time(
    capacity=100,
    current_value=85,
    forecast_horizon=24
)

# Generate full forecast
capacity_forecast = planner.generate_capacity_forecast(values, capacity=100, forecast_horizon=24)
print(capacity_forecast.recommendations)
# Output: ["Critical: Prepare for capacity scaling", "Estimated exhaustion in 12.5 hours"]
```

**Forecasting Method:**
- Linear regression on historical trend
- Projects growth rate into future
- Estimates time-to-exhaustion at current growth rate
- Generates actionable recommendations
- 24-hour default forecast horizon

#### PredictiveAlerter
Main alerting orchestrator.

```python
from predictive_alerter import PredictiveAlerter

alerter = PredictiveAlerter()
alerter.run()  # Main Kafka consumer loop
```

**Workflow:**
1. Consumes ml-anomalies from ML Service
2. Loads 4-hour historical metrics for each anomaly
3. Fits ARIMA model and forecasts 24 steps ahead
4. Detects threshold breach risk
5. Estimates breach time if anomaly continues
6. Generates PredictiveAlert with recommendations
7. Stores in ml_predictive_alerts table
8. Produces to predictive-alerts Kafka topic
9. Every 100 messages: generates capacity forecasts

**Alert Characteristics:**
- Alert ID: MD5 hash of service/metric/timestamp
- Priority: INFORMATIONAL, WARNING, CRITICAL
- Confidence: 0.0-1.0 prediction confidence
- Time Range: predicted_time_start → predicted_time_end
- Action: Specific, actionable recommendation

### 3. Database Schema (`ml_schema.sql`)

Comprehensive PostgreSQL schema for ML artifacts and predictions.

**Tables:**

#### ml_anomalies
Detected anomalies with all details.

```sql
CREATE TABLE ml_anomalies (
    anomaly_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255),
    anomaly_type VARCHAR(50),  -- outlier, trend_change, spike, dip, pattern_shift, seasonality_break
    severity VARCHAR(20),       -- low, medium, high, critical
    timestamp TIMESTAMPTZ,
    metric_name VARCHAR(255),
    metric_value NUMERIC(12, 4),
    baseline_value NUMERIC(12, 4),
    deviation_percent NUMERIC(10, 2),
    confidence_score NUMERIC(5, 4),
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ
);
```

Queries:
```sql
-- Get recent critical anomalies
SELECT * FROM ml_v_critical_anomalies
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Anomaly statistics
SELECT * FROM ml_v_anomaly_trends
WHERE service = 'api-service'
ORDER BY date DESC;
```

#### ml_patterns
Discovered service behavior patterns.

```sql
CREATE TABLE ml_patterns (
    pattern_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255),
    pattern_name VARCHAR(255),
    pattern_type VARCHAR(50),  -- daily, weekly, error_spike, latency_increase
    window_size INTEGER,
    confidence NUMERIC(5, 4),
    feature_vector FLOAT8[],
    occurrences INTEGER,
    first_seen TIMESTAMPTZ,
    last_seen TIMESTAMPTZ,
    is_active BOOLEAN
);
```

#### ml_forecasts
Time-series predictions from ARIMA/Prophet.

```sql
CREATE TABLE ml_forecasts (
    forecast_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255),
    metric_name VARCHAR(255),
    forecast_timestamp TIMESTAMPTZ,
    predicted_value NUMERIC(12, 4),
    prediction_lower_bound NUMERIC(12, 4),
    prediction_upper_bound NUMERIC(12, 4),
    confidence_interval NUMERIC(5, 4),  -- 0.95 = 95% CI
    actual_value NUMERIC(12, 4),
    prediction_error NUMERIC(10, 4)
);
```

#### ml_predictive_alerts
Predicted future anomalies.

```sql
CREATE TABLE ml_predictive_alerts (
    alert_id VARCHAR(255) PRIMARY KEY,
    service VARCHAR(255),
    predicted_event VARCHAR(255),
    prediction_confidence NUMERIC(5, 4),
    predicted_time_start TIMESTAMPTZ,
    predicted_time_end TIMESTAMPTZ,
    recommended_action TEXT,
    alert_sent BOOLEAN DEFAULT FALSE,
    materialized BOOLEAN DEFAULT FALSE,  -- Did prediction occur?
    created_at TIMESTAMPTZ
);
```

**Functions:**

```sql
-- Calculate statistics for a period
SELECT * FROM ml_calculate_anomaly_stats('api-service', NOW() - INTERVAL '1 day', NOW());

-- Get top anomalies
SELECT * FROM ml_get_top_anomalies('api-service', 10);

-- Archive old anomalies
SELECT * FROM ml_archive_old_anomalies(90);  -- Keep 90 days
```

## Data Flow

### Real-Time Anomaly Detection

```
Phase 4: Analytics Service
    ↓ 1-hour aggregated metrics
Kafka Topic: analytics-alerts
    ↓ (error_rate, latency_p99, latency_p95, latency_mean, 
      unique_users, unique_ips, risk_score, total_requests)
    
ML Service (ml_service.py)
    ├─ Load historical metrics (7 days)
    ├─ Train per-service models
    ├─ Apply 3 detection methods
    │  ├─ Isolation Forest (outlier detection)
    │  ├─ DBSCAN (pattern shift detection)
    │  └─ Polynomial Trend (trend change detection)
    ├─ Multi-method consensus
    └─ Store in ml_anomalies table
    ↓ (anomaly_id, service, type, severity, confidence)
    
Kafka Topic: ml-anomalies
```

### Predictive Alerting Flow

```
Kafka Topic: ml-anomalies
    ↓
Predictive Alerter (predictive_alerter.py)
    ├─ Load 4-hour historical metrics
    ├─ Fit ARIMA(1,1,1) model
    ├─ Forecast 24 steps ahead
    ├─ Detect threshold breach risk
    ├─ Estimate breach time
    └─ Store in ml_predictive_alerts table
    ↓ (alert_id, service, predicted_event, confidence, recommendations)
    
Kafka Topic: predictive-alerts
```

### Capacity Forecasting Flow

```
Every 100 messages:
    ↓
Load 24-hour metrics
    ↓
Linear regression capacity model
    ↓
Estimate time-to-exhaustion
    ↓
Generate recommendations
    ↓
Store forecast metadata
```

## Running Phase 5

### Prerequisites

- Phase 4 services running (Kafka, PostgreSQL, analytics)
- Python 3.11+
- 4GB RAM minimum
- PostgreSQL 13+

### Installation

```bash
# 1. Navigate to project
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy

# 2. Create Python environment
python3 -m venv venv-phase5
source venv-phase5/bin/activate

# 3. Install dependencies
pip install -r python-services/requirements-phase5.txt

# 4. Apply ML schema
psql -h localhost -U stacklens -d stacklens -f python-services/ml_schema.sql

# 5. Start services
# Option A: Direct execution
cd python-services
python ml_service.py &
python predictive_alerter.py &

# Option B: Docker Compose
docker-compose -f docker-compose-phase5.yml up -d
```

### Verifying Deployment

```bash
# Check logs
docker logs stacklens-ml-service
docker logs stacklens-predictive-alerter

# Test Kafka topics
docker exec stacklens-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Check database
psql -h localhost -U stacklens -d stacklens
SELECT COUNT(*) FROM ml_anomalies;
SELECT * FROM ml_v_recent_anomalies LIMIT 5;
```

### Troubleshooting

**No anomalies detected:**
- Verify Phase 4 is producing to analytics-alerts
- Check PostgreSQL has analytics_metrics_1hour data
- Review ml_service.py logs for errors
- Verify Kafka connectivity

**ML models not training:**
- Check insufficient data: need min 10 samples per metric
- Monitor ml_service.py for "Insufficient training data" warnings
- Ensure Phase 4 analytics is actively collecting data

**Predictive alerts not generated:**
- Verify ml-anomalies topic has messages
- Check ARIMA fitting: may need minimum 4-hour history
- Review predictive_alerter.py logs

## Performance Tuning

### ML Service Optimization

```python
# In ml_service.py __init__
AnomalyDetector(contamination=0.15)  # Higher for more alerts
AnomalyDetector(contamination=0.05)  # Lower for fewer, higher-confidence alerts

# Retraining frequency
Retrain every 50 messages for faster adaptation
Retrain every 200 messages for stability
```

### Predictive Alerter Optimization

```python
# ARIMA order tuning
TimeSeriesForecast(service, metric, order=(2,1,1))  # Higher AR for autocorrelated data
TimeSeriesForecast(service, metric, order=(1,0,1))  # No differencing for stationary data

# Forecast horizon
forecaster.forecast(steps=12)   # 1 hour ahead
forecaster.forecast(steps=48)   # 4 hours ahead
forecaster.forecast(steps=144)  # 12 hours ahead
```

### Database Performance

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM ml_v_recent_anomalies;

-- Maintenance
VACUUM ANALYZE ml_anomalies;
REINDEX TABLE ml_anomalies;

-- Archive old data
SELECT ml_archive_old_anomalies(90);
```

## Integration Points

### Phase 4 → Phase 5

- **Input:** analytics-alerts Kafka topic from Phase 4
- **Data:** 1-hour aggregated service metrics
- **History:** Phase 4 analytics_metrics_1hour table
- **Training Data:** 7 days of historical metrics

### Phase 5 → Phase 6 (Future)

- **Output Topics:** ml-anomalies, predictive-alerts
- **Database:** ml_anomalies, ml_patterns, ml_forecasts
- **Triggers:** SLA violations from predictions
- **Integration:** Real-time dashboard alerts

## Best Practices

1. **Model Retraining:**
   - Retrain every 100 messages (balance: adaptation vs stability)
   - Monitor model drift with held-out validation sets
   - Archive old models for compliance

2. **Threshold Configuration:**
   - Start with default 0.7 confidence threshold
   - Adjust based on false positive rate
   - Use multi-method consensus for critical alerts

3. **Alert Fatigue:**
   - Filter low-confidence (<0.6) alerts
   - Deduplicate similar anomalies within 5-minute windows
   - Correlate multiple metric anomalies

4. **Forecasting Accuracy:**
   - Validate predictions against actual outcomes
   - Track prediction_error in ml_forecasts table
   - Retrain if RMSE > 2x baseline

5. **Capacity Planning:**
   - Review estimated_exhaustion_time weekly
   - Plan scaling before alerts trigger
   - Track actual vs predicted capacity usage

## Monitoring

### Key Metrics

```sql
-- Anomaly detection rate (per hour)
SELECT service, COUNT(*) as anomaly_count, AVG(confidence_score)
FROM ml_anomalies
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service;

-- Alert generation rate
SELECT COUNT(*) as total_alerts,
       COUNT(CASE WHEN materialized THEN 1 END) as materialized_count
FROM ml_predictive_alerts
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Model health
SELECT model_name, accuracy, precision, recall, last_used_at
FROM ml_v_model_health
ORDER BY last_used_at DESC;
```

### Dashboards

- Anomaly trends by service and type
- Predictive alert accuracy and materialization rate
- Capacity utilization forecasts
- Model performance over time
- Alert response times and resolution rates

## Support & Documentation

- See PHASE_5_QUICKSTART.md for quick start
- See PHASE_5_COMPLETION_SUMMARY.md for validation
- See ml_service.py for implementation details
- See predictive_alerter.py for forecasting details
- See ml_schema.sql for database structure

