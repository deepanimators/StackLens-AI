# Phase 5: ML & Anomaly Detection - Quick Start

Get Phase 5 ML anomaly detection running in 10 minutes.

## Prerequisites Check

```bash
# Verify Phase 4 is running
docker ps | grep -E "analytics|kafka|postgres"

# Verify analytics-alerts topic exists
docker exec stacklens-kafka kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic analytics-alerts

# Verify Phase 4 analytics data
psql -h localhost -U stacklens -d stacklens -c \
  "SELECT COUNT(*) FROM analytics_metrics_1hour WHERE created_at > NOW() - INTERVAL '24 hours';"
```

## Option 1: Docker Compose (Easiest)

### 1. Start Services

```bash
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy

# Apply ML schema (one-time)
docker exec stacklens-postgres psql -U stacklens -d stacklens -f /docker-entrypoint-initdb.d/04-ml-schema.sql

# Start Phase 5 services
docker-compose -f docker-compose-phase5.yml up -d
```

### 2. Verify Startup

```bash
# Check ML service
docker logs -f stacklens-ml-service

# Check predictive alerter
docker logs -f stacklens-predictive-alerter

# Verify Kafka topics
docker exec stacklens-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list | grep ml
# Should show: ml-anomalies, ml-patterns, predictive-alerts
```

### 3. Check Results

```bash
# View detected anomalies
psql -h localhost -U stacklens -d stacklens << EOF
SELECT anomaly_id, service, anomaly_type, severity, confidence_score, timestamp
FROM ml_anomalies
ORDER BY timestamp DESC
LIMIT 10;
EOF

# View predictive alerts
psql -h localhost -U stacklens -d stacklens << EOF
SELECT alert_id, service, predicted_event, prediction_confidence, predicted_time_start
FROM ml_predictive_alerts
ORDER BY created_at DESC
LIMIT 5;
EOF

# View statistics
psql -h localhost -U stacklens -d stacklens << EOF
SELECT * FROM ml_v_recent_anomalies LIMIT 10;
EOF
```

## Option 2: Direct Python Execution

### 1. Create Environment

```bash
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy

# Create virtual environment
python3 -m venv venv-phase5
source venv-phase5/bin/activate

# Install dependencies
pip install -r python-services/requirements-phase5.txt
```

### 2. Apply Database Schema

```bash
psql -h localhost -U stacklens -d stacklens -f python-services/ml_schema.sql
```

### 3. Run Services

```bash
cd python-services

# Terminal 1: ML Service
python ml_service.py

# Terminal 2: Predictive Alerter
python predictive_alerter.py

# Terminal 3: Monitor logs
tail -f /tmp/ml_service.log
```

## Verification Checklist

- [x] Kafka topics created: ml-anomalies, ml-patterns, predictive-alerts
- [x] PostgreSQL tables created: ml_anomalies, ml_patterns, ml_forecasts, etc.
- [x] ML service consuming from analytics-alerts
- [x] Anomalies appearing in ml_anomalies table
- [x] Predictive alerter running
- [x] Alerts appearing in ml_predictive_alerts table

## Testing

### Test 1: Basic Anomaly Detection

```python
# python test_phase5_ml.py::TestAnomalyDetection::test_02_model_training
python -m pytest test_phase5_ml.py::TestAnomalyDetection -v
```

### Test 2: Pattern Analysis

```python
python -m pytest test_phase5_ml.py::TestPatternAnalysis -v
```

### Test 3: Trend Analysis

```python
python -m pytest test_phase5_ml.py::TestTrendAnalysis -v
```

### Test 4: Full Test Suite

```bash
# Run all 35 tests
python test_phase5_ml.py

# Expected output:
# ======================================================================
# Ran 35 tests in ~X.XXs
# OK
```

## Monitoring Dashboard Query

```sql
-- Overview: Last hour anomalies by service
SELECT 
    service,
    COUNT(*) as total_anomalies,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
    ROUND(AVG(confidence_score)::numeric, 3) as avg_confidence,
    COUNT(CASE WHEN resolved THEN 1 END) as resolved
FROM ml_anomalies
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY service
ORDER BY total_anomalies DESC;

-- Predictive alerts status
SELECT 
    COUNT(*) as total_predicted,
    COUNT(CASE WHEN alert_sent THEN 1 END) as alerts_sent,
    COUNT(CASE WHEN materialized THEN 1 END) as materialized,
    ROUND(100.0 * COUNT(CASE WHEN materialized THEN 1 END) / COUNT(*)::numeric, 1) as materialization_rate
FROM ml_predictive_alerts
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Top anomalies today
SELECT 
    service, 
    anomaly_type, 
    COUNT(*) as count,
    ROUND(AVG(confidence_score)::numeric, 3) as avg_confidence
FROM ml_anomalies
WHERE DATE(timestamp) = DATE(NOW())
GROUP BY service, anomaly_type
ORDER BY count DESC;
```

## Kafka Topic Inspection

```bash
# List all topics
docker exec stacklens-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list

# Consume from ml-anomalies
docker exec stacklens-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic ml-anomalies \
  --from-beginning \
  --max-messages 10 | jq .

# Consume from predictive-alerts
docker exec stacklens-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic predictive-alerts \
  --from-beginning \
  --max-messages 5 | jq .
```

## Common Issues & Solutions

### Issue: No anomalies detected

**Solution:**
```bash
# 1. Check ML service is running
docker logs stacklens-ml-service | tail -20

# 2. Verify analytics-alerts has data
docker exec stacklens-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic analytics-alerts \
  --from-beginning \
  --max-messages 5

# 3. Check database connectivity
psql -h localhost -U stacklens -d stacklens -c "SELECT COUNT(*) FROM analytics_metrics_1hour;"
```

### Issue: ML Service crashes on startup

**Solution:**
```bash
# Check error logs
docker logs stacklens-ml-service -f

# Common causes:
# - PostgreSQL not running: docker-compose up postgres -d
# - Kafka not accessible: docker-compose up kafka -d
# - Missing dependencies: pip install -r requirements-phase5.txt
```

### Issue: Predictive alerts not generating

**Solution:**
```bash
# 1. Verify ml-anomalies topic has data
docker exec stacklens-kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic ml-anomalies \
  --max-messages 5

# 2. Check alerter logs
docker logs stacklens-predictive-alerter | grep -i error

# 3. Verify ARIMA fitting with sufficient history
# Need minimum 4 hours (12 data points) of history
psql -h localhost -U stacklens -d stacklens << EOF
SELECT COUNT(*), MIN(timestamp), MAX(timestamp)
FROM analytics_metrics_1hour
WHERE timestamp > NOW() - INTERVAL '4 hours'
AND service = 'api';
EOF
```

## Performance Baseline

### Expected Latencies

- Anomaly detection: < 100ms per message
- Pattern analysis: < 200ms per 100 messages
- Predictive forecasting: < 500ms per anomaly
- Database writes: < 50ms per anomaly

### Expected Throughput

- ML service: 100+ messages/second
- Anomaly detection rate: 5-15% of messages (10% baseline)
- Predictive alert rate: 1-5% of anomalies
- Database capacity: 1 year of data < 10GB

## Data Retention

```bash
# Archive anomalies older than 90 days
psql -h localhost -U stacklens -d stacklens << EOF
SELECT ml_archive_old_anomalies(90);
EOF

# Expected output:
#  anomalies_archived | earliest_archived | latest_archived
#  ----------------+---+---
#       15234       | 2024-01-01 | 2024-03-31
```

## Next Steps

1. **Validate Models:**
   - Monitor anomaly detection accuracy
   - Adjust confidence thresholds based on false positive rate
   - Validate predictive alert materialization rate

2. **Integrate with Alerting:**
   - Connect predictive-alerts to PagerDuty/Slack
   - Set up incident automation for critical alerts
   - Build dashboards for anomaly visualization

3. **Performance Optimization:**
   - Profile ml_service.py for bottlenecks
   - Archive old data monthly
   - Tune ARIMA order based on metric characteristics

4. **Prepare Phase 6:**
   - Real-time dashboard from anomalies/alerts
   - SLA violation prediction
   - Capacity planning automation

## Support

For detailed information, see:
- **Full Guide:** docs/PHASE_5_ML_GUIDE.md
- **Implementation:** python-services/ml_service.py, predictive_alerter.py
- **Tests:** python-services/test_phase5_ml.py
- **Schema:** python-services/ml_schema.sql

