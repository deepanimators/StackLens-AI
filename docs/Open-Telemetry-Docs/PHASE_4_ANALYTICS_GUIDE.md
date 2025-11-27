# Phase 4: Real-Time Analytics Service

## Overview

Phase 4 implements **Real-Time Analytics** for the StackLens platform, transforming enriched logs from Phase 3 into actionable metrics, alerts, and performance insights. This phase includes:

- **Time-Series Aggregation**: 1-minute, 5-minute, and 1-hour aggregation windows
- **Alert Rule Engine**: Production-ready alert evaluation with severity levels
- **Data Retention Policies**: Hot (1 day), Warm (7 days), Cold (30 days) storage tiers
- **Dashboard API**: REST endpoints for analytics visualization
- **PostgreSQL/TimescaleDB**: Optimized time-series database with hypertables

## Architecture

```
Phase 3 Output (enriched logs)
         ↓
    Kafka Topic: stacklens-analytics
         ↓
    [Analytics Service]
         ├─ TimeSeriesAggregator (1min, 5min, 1hour)
         ├─ AlertEvaluator (rule engine)
         └─ Alert Router (Slack, Email, PagerDuty)
         ↓
    PostgreSQL/TimescaleDB
    ├─ analytics_events (raw events, 1-day retention)
    ├─ analytics_metrics_1min/5min/1hour (aggregations)
    ├─ analytics_alert_rules (rule definitions)
    ├─ analytics_alerts (alert instances)
    └─ analytics_alert_history (audit trail)
         ↓
    [Dashboard API]
    └─ REST Endpoints for metrics, alerts, SLA, performance
```

## Components

### 1. Analytics Service (`analytics_service.py`)

Main Python service that orchestrates real-time analytics and alerting.

**Key Classes**:

#### `TimeSeriesAggregator`
Aggregates enriched logs into time-series metrics.

```python
# Add log entry
aggregator.add_log(
    service="auth-service",
    timestamp=datetime.now(),
    level="info",
    latency_ms=45.2,
    risk_score=0.15
)

# Aggregate over time windows
metrics_1min = aggregator.aggregate(window="1min")
metrics_5min = aggregator.aggregate(window="5min")
metrics_1hour = aggregator.aggregate(window="1hour")
```

**Aggregated Metrics** (ServiceMetrics dataclass):
- `service`: Service name
- `timestamp`: Aggregation window start
- `window`: Aggregation window (1min, 5min, 1hour)
- `total_requests`: Total request count
- `error_count`: Count of error-level logs
- `error_rate`: Percentage of errors (0-100)
- `latency_min_ms`, `latency_p50_ms`, `latency_p95_ms`, `latency_p99_ms`, `latency_max_ms`, `latency_mean_ms`
- `unique_users`: Distinct user count
- `unique_ips`: Distinct IP count
- `risk_score`: Aggregated risk score (0-1)

#### `AlertEvaluator`
Evaluates alert rules against metrics and determines alert triggers.

```python
# Add alert rule
evaluator.add_rule(AlertRule(
    rule_id="high_error_rate",
    name="High Error Rate",
    metric="error_rate",
    operator=">",
    threshold=5.0,
    severity=AlertSeverity.WARNING
))

# Evaluate metrics against rules
alerts = evaluator.evaluate_metrics(metrics)
```

**Alert Rule Configuration**:
- `rule_id`: Unique rule identifier
- `name`: Human-readable rule name
- `metric`: Metric field to evaluate (error_rate, latency_p99, unique_users, etc.)
- `operator`: Comparison operator (>, <, >=, <=, ==)
- `threshold`: Threshold value for comparison
- `severity`: Alert severity (info, warning, critical)
- `notification_channels`: List of notification methods (slack, email, pagerduty)

#### `AnalyticsService`
Main orchestrator service.

```python
# Initialize
service = AnalyticsService(
    kafka_brokers=["localhost:9092"],
    kafka_topic="stacklens-analytics",
    db_connection="postgresql://user:pass@localhost/stacklens"
)

# Run service (blocking)
service.run()
```

**Responsibilities**:
- Kafka consumer: Batch processing (100 messages, 10s timeout)
- Log aggregation: Real-time time-series calculation
- Alert evaluation: Rule engine execution
- Alert routing: Kafka producer to `analytics-alerts` topic
- Metrics storage: PostgreSQL persistence
- Statistics tracking: Performance metrics and error counts

### 2. Database Schema (`analytics_schema.sql`)

PostgreSQL schema with TimescaleDB hypertable optimization.

#### Tables

**Raw Events** (`analytics_events`):
```sql
-- Primary event table (hypertable)
-- Retention: 1 day (hot storage)
CREATE TABLE analytics_events (
    event_id BIGSERIAL,
    service VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    level VARCHAR(20),
    latency_ms NUMERIC(10, 2),
    risk_score NUMERIC(3, 2),
    enriched_data JSONB
);

-- Convert to hypertable
SELECT create_hypertable(
    'analytics_events',
    'timestamp',
    if_not_exists => TRUE
);
```

**1-Minute Aggregation** (`analytics_metrics_1min`):
```sql
-- 1-minute aggregated metrics
-- Retention: 7 days (warm storage)
CREATE TABLE analytics_metrics_1min (
    metric_id BIGSERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    total_requests INTEGER,
    error_count INTEGER,
    error_rate NUMERIC(5, 2),
    latency_min_ms NUMERIC(10, 2),
    latency_p50_ms NUMERIC(10, 2),
    latency_p95_ms NUMERIC(10, 2),
    latency_p99_ms NUMERIC(10, 2),
    latency_max_ms NUMERIC(10, 2),
    latency_mean_ms NUMERIC(10, 2),
    unique_users INTEGER,
    unique_ips INTEGER,
    risk_score NUMERIC(3, 2)
);
```

Similar tables for `analytics_metrics_5min` and `analytics_metrics_1hour`.

**Alert Rules** (`analytics_alert_rules`):
```sql
-- Alert rule definitions
CREATE TABLE analytics_alert_rules (
    rule_id BIGSERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    metric_name VARCHAR(100) NOT NULL,
    operator VARCHAR(5),        -- >, <, >=, <=, ==
    threshold NUMERIC(10, 2),
    severity VARCHAR(20),       -- info, warning, critical
    notification_channels TEXT[], -- ["slack", "email", "pagerduty"]
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Alert Instances** (`analytics_alerts`):
```sql
-- Triggered alerts
CREATE TABLE analytics_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    service VARCHAR(255) NOT NULL,
    rule_id BIGINT REFERENCES analytics_alert_rules(rule_id),
    triggered_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    status VARCHAR(20),         -- open, acknowledged, resolved
    message TEXT,
    metric_value NUMERIC(10, 2)
);
```

**Alert History** (`analytics_alert_history`):
```sql
-- Audit trail for alert status changes
CREATE TABLE analytics_alert_history (
    history_id BIGSERIAL PRIMARY KEY,
    alert_id BIGINT REFERENCES analytics_alerts(alert_id),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255)
);
```

#### Views

**Current Health Status** (`v_service_health_current`):
```sql
-- Latest health status per service
SELECT
    service,
    CASE
        WHEN error_rate < 5 AND latency_p99_ms < 500 THEN 'healthy'
        WHEN error_rate < 10 AND latency_p99_ms < 1000 THEN 'degraded'
        ELSE 'unhealthy'
    END as health_status,
    error_rate,
    latency_p99_ms,
    timestamp
FROM analytics_metrics_1min
WHERE timestamp = (SELECT MAX(timestamp) FROM analytics_metrics_1min)
ORDER BY service;
```

**Performance Trend** (`v_service_performance_trend`):
```sql
-- 7-day performance trends (5-min aggregations)
SELECT
    service,
    timestamp,
    error_rate,
    latency_p99_ms,
    unique_users,
    total_requests
FROM analytics_metrics_5min
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY timestamp;
```

**Active Alerts Summary** (`v_active_alerts_summary`):
```sql
-- Currently active alerts
SELECT
    a.alert_id,
    a.service,
    r.rule_name,
    r.severity,
    a.triggered_at,
    a.status
FROM analytics_alerts a
JOIN analytics_alert_rules r ON a.rule_id = r.rule_id
WHERE a.status IN ('open', 'acknowledged')
AND a.resolved_at IS NULL
ORDER BY r.severity DESC, a.triggered_at DESC;
```

**Top Error Services** (`v_top_error_services`):
```sql
-- Services with highest error rates
SELECT
    service,
    error_rate,
    total_requests,
    error_count,
    timestamp
FROM analytics_metrics_1hour
WHERE timestamp = (SELECT MAX(timestamp) FROM analytics_metrics_1hour)
ORDER BY error_rate DESC;
```

**Slowest Services** (`v_slowest_services`):
```sql
-- Services with highest P99 latency
SELECT
    service,
    latency_p99_ms,
    latency_mean_ms,
    total_requests,
    timestamp
FROM analytics_metrics_1hour
WHERE timestamp = (SELECT MAX(timestamp) FROM analytics_metrics_1hour)
ORDER BY latency_p99_ms DESC;
```

**High Risk Events** (`v_high_risk_events`):
```sql
-- Events with high business risk
SELECT
    event_id,
    service,
    timestamp,
    risk_score,
    enriched_data
FROM analytics_events
WHERE risk_score > 0.8
ORDER BY risk_score DESC, timestamp DESC;
```

#### Functions

**Calculate SLA** (`analytics_calculate_sla`):
```sql
-- Uptime percentage calculation
CREATE OR REPLACE FUNCTION analytics_calculate_sla(
    p_service VARCHAR,
    p_start_time TIMESTAMPTZ
) RETURNS NUMERIC AS $$
DECLARE
    v_total_time NUMERIC;
    v_down_time NUMERIC;
    v_uptime NUMERIC;
BEGIN
    -- Implementation: Calculate uptime percentage
    -- Returns: Uptime as percentage (0-100)
    RETURN v_uptime;
END;
$$ LANGUAGE plpgsql;
```

**Alert Statistics** (`analytics_get_alert_stats`):
```sql
-- Alert performance metrics
CREATE OR REPLACE FUNCTION analytics_get_alert_stats()
RETURNS TABLE (
    total_alerts BIGINT,
    active_alerts BIGINT,
    critical_alerts BIGINT,
    avg_resolution_time_minutes NUMERIC
) AS $$
BEGIN
    -- Implementation: Calculate alert statistics
END;
$$ LANGUAGE plpgsql;
```

**Archive Old Data** (`analytics_archive_old_data`):
```sql
-- Data archival and cleanup
CREATE OR REPLACE FUNCTION analytics_archive_old_data()
RETURNS TABLE (
    events_archived BIGINT,
    alerts_archived BIGINT
) AS $$
BEGIN
    -- Delete events older than 1 day
    -- Archive alerts older than 30 days
END;
$$ LANGUAGE plpgsql;
```

#### Triggers

**Alert Rule Update Trigger** (`trigger_alert_rule_update`):
```sql
-- Update modified timestamp when rule changes
CREATE TRIGGER trigger_alert_rule_update
BEFORE UPDATE ON analytics_alert_rules
FOR EACH ROW
EXECUTE FUNCTION update_modified_time();
```

**Alert Status Change Trigger** (`trigger_alert_status_change`):
```sql
-- Log status changes to audit history
CREATE TRIGGER trigger_alert_status_change
AFTER UPDATE ON analytics_alerts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION log_alert_status_change();
```

## Default Alert Rules

Production configuration with pre-defined alert rules:

| Rule ID | Name | Metric | Operator | Threshold | Severity | Window |
|---------|------|--------|----------|-----------|----------|--------|
| 1 | High Error Rate | error_rate | > | 5.0% | WARNING | 60s |
| 2 | Critical Error Rate | error_rate | > | 20.0% | CRITICAL | 30s |
| 3 | High P99 Latency | latency_p99_ms | > | 500 | WARNING | 60s |
| 4 | Critical P99 Latency | latency_p99_ms | > | 1000 | CRITICAL | 30s |
| 5 | Spike in Errors | error_count | > | 100 | WARNING | 60s |
| 6 | Low Throughput | total_requests | < | 10 | INFO | 300s |

## Configuration

### Environment Variables

```bash
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_INPUT_TOPIC=stacklens-analytics
KAFKA_OUTPUT_TOPIC=analytics-alerts
KAFKA_CONSUMER_GROUP=analytics-service-group
KAFKA_BATCH_SIZE=100
KAFKA_BATCH_TIMEOUT_MS=10000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=stacklens
DB_USER=stacklens_user
DB_PASSWORD=stacklens_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# Aggregation Configuration
AGGREGATION_WINDOWS=1min,5min,1hour

# Retention Policies (days)
RETENTION_HOT=1
RETENTION_WARM=7
RETENTION_COLD=30

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance Configuration
MAX_THREADS=4
STATS_INTERVAL_SEC=30

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=8004
```

## Data Flow

### Input: Enriched Logs (Phase 3)

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "service": "auth-service",
  "level": "info",
  "message": "User login successful",
  "latency_ms": 45.2,
  "risk_score": 0.15,
  "enriched": {
    "user_id": "user123",
    "ip_address": "192.168.1.1",
    "request_id": "req-abc-123"
  }
}
```

### Processing: Time-Series Aggregation

**1-Minute Window**:
```
Time: 10:30:00 - 10:30:59
Service: auth-service
Messages: 1200
Errors: 45
Error Rate: 3.75%
Latency: min=12ms, p50=40ms, p99=280ms, max=450ms
Risk Score: 0.18
```

**5-Minute Window**:
```
Time: 10:30:00 - 10:34:59
Service: auth-service
Messages: 6100
Errors: 215
Error Rate: 3.53%
Latency: min=11ms, p50=42ms, p99=320ms, max=520ms
Risk Score: 0.20
```

### Output: Analytics Data

#### Metrics (Dashboard):
```json
{
  "service": "auth-service",
  "timestamp": "2024-01-15T10:30:00Z",
  "window": "1min",
  "total_requests": 1200,
  "error_rate": 3.75,
  "latency_p99_ms": 280.0,
  "unique_users": 450,
  "risk_score": 0.18
}
```

#### Alerts (if rule triggered):
```json
{
  "alert_id": 1001,
  "service": "auth-service",
  "rule_name": "High Error Rate",
  "severity": "warning",
  "message": "Error rate exceeded 5%: 7.2%",
  "triggered_at": "2024-01-15T10:30:45Z",
  "metric_value": 7.2
}
```

## Dashboard API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "database": "connected"
}
```

### Get Metrics

```bash
GET /metrics?window=1min&service=auth-service&limit=100
```

Response:
```json
{
  "window": "1min",
  "metrics": [
    {
      "service": "auth-service",
      "timestamp": "2024-01-15T10:30:00Z",
      "total_requests": 1200,
      "error_rate": 3.75,
      "latency_p99_ms": 280.0,
      ...
    }
  ],
  "count": 100
}
```

### Get Health Status

```bash
GET /health-status
```

Response:
```json
{
  "status": "ok",
  "services": [
    {
      "service": "auth-service",
      "health_status": "healthy",
      "error_rate": 3.75,
      "p99_latency_ms": 280.0,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 5,
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Get Performance Trend (7-day)

```bash
GET /performance-trend?service=auth-service
```

Response:
```json
{
  "trend": [
    {
      "service": "auth-service",
      "timestamp": "2024-01-15T10:30:00Z",
      "error_rate": 3.75,
      "latency_p99_ms": 280.0,
      "unique_users": 450,
      "total_requests": 1200
    }
  ],
  "count": 2016,
  "period_days": 7
}
```

### Get Active Alerts

```bash
GET /alerts?status=active&severity=critical&limit=50
```

Response:
```json
{
  "alerts": [
    {
      "alert_id": 1001,
      "service": "auth-service",
      "rule_name": "High Error Rate",
      "severity": "critical",
      "triggered_at": "2024-01-15T10:30:45Z",
      "status": "open"
    }
  ],
  "count": 5,
  "status": "active"
}
```

### Get Top Error Services

```bash
GET /top-error-services?limit=10
```

### Get Slowest Services

```bash
GET /slowest-services?limit=10
```

### Get High-Risk Events

```bash
GET /high-risk-events?threshold=0.8&limit=50
```

### Get SLA Metrics

```bash
GET /sla?service=auth-service&days=7
```

### Get Alert Statistics

```bash
GET /alert-stats
```

### Execute Custom Query

```bash
POST /query
Content-Type: application/json

{
  "query": "SELECT * FROM analytics_metrics_1min WHERE service = 'auth-service' LIMIT 10"
}
```

## Performance Characteristics

### Aggregation Performance

| Operation | Target | Tested |
|-----------|--------|--------|
| 1-minute aggregation | < 500ms | ✅ |
| 5-minute aggregation | < 1000ms | ✅ |
| 1-hour aggregation | < 2000ms | ✅ |

### Alert Evaluation

| Operation | Target | Tested |
|-----------|--------|--------|
| Rule evaluation per metric | < 1ms | ✅ |
| Alert generation | < 100ms | ✅ |
| Alert persistence | < 500ms | ✅ |

### Query Performance

| Operation | Target | Tested |
|-----------|--------|--------|
| Current metrics query | < 100ms | ✅ |
| 7-day trend query | < 500ms | ✅ |
| Alert summary query | < 200ms | ✅ |

### Throughput

| Metric | Target | Tested |
|--------|--------|--------|
| Messages processed/sec | > 1000 | ✅ |
| Metrics stored/sec | > 500 | ✅ |
| Dashboard API QPS | > 100 | ✅ |

## Data Retention

### Retention Policy

| Tier | Duration | Tables | Purpose |
|------|----------|--------|---------|
| Hot | 1 day | analytics_events | Real-time analysis, live dashboards |
| Warm | 7 days | analytics_metrics_1min, 5min | Historical trends, capacity planning |
| Cold | 30 days | analytics_metrics_1hour | Long-term analysis, compliance |
| Archive | Indefinite | s3://analytics-archive | Legal/compliance retention |

### Automatic Cleanup

```sql
-- Run daily via cron job
SELECT analytics_archive_old_data();

-- Deletes:
-- - Events > 1 day old
-- - 1min aggregations > 7 days old
-- - 5min aggregations > 30 days old
-- - Alerts > 90 days old
```

## Notification Channels

### Slack Integration

```python
alert_rule = AlertRule(
    rule_name="High Error Rate",
    notification_channels=["slack"],
    slack_config={
        "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        "channel": "#alerts",
        "mention_on_critical": "@devops-team"
    }
)
```

### Email Integration

```python
alert_rule = AlertRule(
    rule_name="High Error Rate",
    notification_channels=["email"],
    email_config={
        "recipients": ["ops@example.com", "dev@example.com"],
        "send_resolution": True
    }
)
```

### PagerDuty Integration

```python
alert_rule = AlertRule(
    rule_name="Critical Error Rate",
    notification_channels=["pagerduty"],
    pagerduty_config={
        "service_key": "YOUR_SERVICE_KEY",
        "severity_mapping": {
            "critical": "critical",
            "warning": "warning"
        }
    }
)
```

## Troubleshooting

### High Latency in Aggregation

**Symptoms**: Aggregation taking > 1 second

**Solutions**:
1. Check Kafka consumer lag: `kafka-consumer-groups --describe --group analytics-service-group`
2. Reduce batch size: `KAFKA_BATCH_SIZE=50`
3. Increase threads: `MAX_THREADS=8`
4. Check PostgreSQL performance: `EXPLAIN ANALYZE` on hypertable queries

### Missing Metrics in Dashboard

**Symptoms**: Dashboard shows no data

**Solutions**:
1. Verify Kafka topic has data: `kafka-console-consumer --topic stacklens-analytics`
2. Check database connection: `psql -h postgres -U stacklens_user -d stacklens -c "SELECT COUNT(*) FROM analytics_events;"`
3. Verify hypertables exist: `SELECT * FROM timescaledb_information.hypertables;`
4. Check service logs: `docker logs stacklens-analytics-service`

### Alert Spam (Too Many Alerts)

**Solutions**:
1. Increase threshold values in alert rules
2. Add alert deduplication (same service + rule within 5min window)
3. Implement alert grouping by service

### Database Growing Too Large

**Solutions**:
1. Reduce `RETENTION_HOT`/`RETENTION_WARM`/`RETENTION_COLD` values
2. Increase archival frequency: `CRON_ARCHIVE_INTERVAL=6h`
3. Compress old hypertables using TimescaleDB compression

## Deployment

### Docker Compose

```bash
# Start all services
docker-compose -f docker-compose-phase4.yml up -d

# Check service health
docker-compose -f docker-compose-phase4.yml ps

# View logs
docker-compose -f docker-compose-phase4.yml logs -f analytics-service
docker-compose -f docker-compose-phase4.yml logs -f dashboard-api
```

### Kubernetes (Production)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: analytics-service
  template:
    metadata:
      labels:
        app: analytics-service
    spec:
      containers:
      - name: analytics-service
        image: stacklens/analytics-service:latest
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "kafka:9092"
        - name: DB_HOST
          value: "postgres"
        resources:
          requests:
            cpu: "1"
            memory: "512Mi"
          limits:
            cpu: "2"
            memory: "1Gi"
```

## Testing

### Run Integration Tests

```bash
# All tests
pytest tests/integration/test_phase4_analytics.py -v

# Specific test class
pytest tests/integration/test_phase4_analytics.py::TestTimeSeriesAggregation -v

# With coverage
pytest tests/integration/test_phase4_analytics.py --cov=python-services --cov-report=html
```

### Performance Tests

```bash
# Load test (1000 RPS on dashboard API)
locust -f tests/load/analytics_loadtest.py -u 1000 -r 100 -t 300s

# Latency tests
pytest tests/integration/test_phase4_analytics.py::TestPerformanceCharacteristics -v
```

## Monitoring

### Prometheus Metrics

Analytics service exposes Prometheus metrics on port 8004:

```
# HELP analytics_messages_processed Total messages processed
# TYPE analytics_messages_processed counter
analytics_messages_processed 125434.0

# HELP analytics_metrics_calculated Total metrics calculated
# TYPE analytics_metrics_calculated counter
analytics_metrics_calculated 62891.0

# HELP analytics_alerts_triggered Total alerts triggered
# TYPE analytics_alerts_triggered counter
analytics_alerts_triggered 234.0

# HELP analytics_aggregation_latency_ms Aggregation latency in milliseconds
# TYPE analytics_aggregation_latency_ms histogram
analytics_aggregation_latency_ms_bucket{le="100"} 6234.0
analytics_aggregation_latency_ms_bucket{le="500"} 6289.0
analytics_aggregation_latency_ms_bucket{le="1000"} 6291.0
```

### Grafana Dashboards

Pre-built dashboards available:
- `dashboards/analytics_overview.json` - High-level metrics
- `dashboards/analytics_detailed.json` - Detailed service breakdown
- `dashboards/analytics_alerts.json` - Alert performance
- `dashboards/analytics_system.json` - System health

### Alert Queries

```sql
-- Check alert health
SELECT
    rule_name,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_alerts,
    AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at))) as avg_resolution_sec
FROM analytics_alerts
JOIN analytics_alert_rules ON analytics_alerts.rule_id = analytics_alert_rules.rule_id
WHERE triggered_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY rule_name
ORDER BY total_alerts DESC;

-- Top triggered alerts (24 hours)
SELECT
    service,
    rule_name,
    COUNT(*) as count,
    AVG(metric_value) as avg_value
FROM analytics_alerts
JOIN analytics_alert_rules ON analytics_alerts.rule_id = analytics_alert_rules.rule_id
WHERE triggered_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY service, rule_name
ORDER BY count DESC
LIMIT 20;

-- SLA report
SELECT
    service,
    analytics_calculate_sla(service, CURRENT_TIMESTAMP - INTERVAL '7 days') as sla_7day,
    analytics_calculate_sla(service, CURRENT_TIMESTAMP - INTERVAL '30 days') as sla_30day
FROM (SELECT DISTINCT service FROM analytics_metrics_1hour)
ORDER BY service;
```

## Next Phase

**Phase 5: ML & Anomaly Detection**
- Anomaly detection on time-series data
- Predictive alerting
- Capacity forecasting
- ML model deployment and monitoring

---

**Documentation Version**: 1.0  
**Phase 4 Status**: Complete  
**Last Updated**: 2024-01-15
