# Phase 4: Real-Time Analytics Quick Start

Get the analytics service running in minutes.

## Prerequisites

- Docker & Docker Compose
- Git (for cloning repo)
- PostgreSQL client tools (optional, for debugging)

## 1. Start All Services

```bash
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy

# Start Phase 4 analytics stack
docker-compose -f docker-compose-phase4.yml up -d

# Verify services are running
docker-compose -f docker-compose-phase4.yml ps
```

**Expected Output**:
```
NAME                              STATUS
stacklens-analytics-service      Up (healthy)
stacklens-dashboard-api          Up (healthy)
stacklens-postgres-analytics     Up (healthy)
stacklens-kafka-analytics        Up (healthy)
stacklens-zookeeper-analytics    Up (healthy)
stacklens-kafka-ui-analytics     Up (healthy)
```

## 2. Verify Database Schema

```bash
# Connect to PostgreSQL
psql -h localhost -U stacklens_user -d stacklens

# Check hypertables
\dt analytics_*

# List views
\dv v_*

# List functions
\df analytics_*

# Exit
\q
```

## 3. Access Dashboard API

### Health Check
```bash
curl -s http://localhost:8005/health | jq
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "database": "connected"
}
```

### Get Current Metrics
```bash
curl -s "http://localhost:8005/metrics?window=1min&limit=10" | jq
```

### Get Service Health Status
```bash
curl -s http://localhost:8005/health-status | jq
```

### Get Active Alerts
```bash
curl -s "http://localhost:8005/alerts?status=active" | jq
```

## 4. Send Test Data to Kafka

```bash
# Install kafka-python if not already installed
pip install kafka-python

# Create test producer script
cat > /tmp/test_analytics.py << 'EOF'
#!/usr/bin/env python3
import json
from datetime import datetime
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send test messages
for i in range(10):
    message = {
        "timestamp": datetime.now().isoformat(),
        "service": "test-service",
        "level": "info",
        "message": f"Test message {i}",
        "latency_ms": 45.2 + i,
        "risk_score": 0.15,
        "enriched": {
            "user_id": f"user{i}",
            "ip_address": "192.168.1.1"
        }
    }
    producer.send('stacklens-analytics', value=message)
    print(f"Sent message {i}")

producer.flush()
producer.close()
EOF

python3 /tmp/test_analytics.py
```

## 5. Query Analytics Data

### Get Latest Metrics

```bash
curl -s "http://localhost:8005/metrics?window=1min&service=test-service&limit=5" | jq '.metrics | .[0]'
```

Response:
```json
{
  "service": "test-service",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "total_requests": 10,
  "error_rate": 0.0,
  "latency_p99_ms": 54.2,
  "latency_mean_ms": 49.7,
  "unique_users": 10,
  "risk_score": 0.15
}
```

### Get Performance Trend (7 days)

```bash
curl -s "http://localhost:8005/performance-trend?service=test-service" | jq '.trend | length'
```

### Get Top Error Services

```bash
curl -s "http://localhost:8005/top-error-services?limit=5" | jq
```

## 6. Create Custom Alert Rule

```bash
# Connect to database
psql -h localhost -U stacklens_user -d stacklens

# Insert custom alert rule
INSERT INTO analytics_alert_rules (rule_name, metric_name, operator, threshold, severity, notification_channels, enabled)
VALUES (
    'My Custom Alert',
    'error_rate',
    '>',
    10.0,
    'warning',
    ARRAY['slack', 'email'],
    true
);

# Verify
SELECT * FROM analytics_alert_rules WHERE rule_name = 'My Custom Alert';
```

## 7. Monitor Service

### View Analytics Service Logs

```bash
docker-compose -f docker-compose-phase4.yml logs -f analytics-service
```

### View Dashboard API Logs

```bash
docker-compose -f docker-compose-phase4.yml logs -f dashboard-api
```

### Get Service Statistics

```bash
curl -s http://localhost:8005/stats | jq
```

Response:
```json
{
  "requests_served": 156,
  "queries_executed": 234,
  "errors": 0,
  "start_time": "2024-01-15T10:00:00.123Z",
  "uptime_seconds": 1847.234
}
```

## 8. Access Kafka UI (Monitoring)

Open browser: http://localhost:8080

Features:
- View topics and messages
- Monitor consumer groups
- Check topic partitions
- Inspect message content

## 9. Query Database Directly

### Get Current Health

```bash
psql -h localhost -U stacklens_user -d stacklens -c "
SELECT * FROM v_service_health_current;
"
```

### Get Recent Alerts

```bash
psql -h localhost -U stacklens_user -d stacklens -c "
SELECT alert_id, service, rule_name, severity, triggered_at, status
FROM v_active_alerts_summary
ORDER BY triggered_at DESC
LIMIT 10;
"
```

### Calculate SLA

```bash
psql -h localhost -U stacklens_user -d stacklens -c "
SELECT
  service,
  analytics_calculate_sla(service, CURRENT_TIMESTAMP - INTERVAL '7 days') as uptime_pct
FROM analytics_metrics_1hour
GROUP BY service;
"
```

## 10. Stop Services

```bash
docker-compose -f docker-compose-phase4.yml down

# Remove volumes (cleanup all data)
docker-compose -f docker-compose-phase4.yml down -v
```

## Common Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health check |
| `/metrics` | GET | Get time-series metrics |
| `/health-status` | GET | Current service health |
| `/performance-trend` | GET | 7-day trends |
| `/alerts` | GET | Active/resolved alerts |
| `/top-error-services` | GET | Services with highest errors |
| `/slowest-services` | GET | Services with high latency |
| `/high-risk-events` | GET | High-risk transactions |
| `/sla` | GET | SLA metrics |
| `/alert-stats` | GET | Alert statistics |
| `/stats` | GET | API statistics |
| `/query` | POST | Custom SQL queries |

## Query Parameters

### `/metrics`
- `window`: 1min, 5min, 1hour (default: 1min)
- `service`: Filter by service name
- `limit`: Number of results (default: 100)

### `/alerts`
- `status`: active, resolved, all (default: active)
- `severity`: info, warning, critical
- `limit`: Number of results (default: 50)

### `/performance-trend`
- `service`: Filter by service name
- `days`: Number of days (default: 7)

### `/sla`
- `service`: Filter by service name
- `days`: Period to calculate (default: 7)

## Troubleshooting

### Services not starting?

```bash
# Check logs
docker-compose -f docker-compose-phase4.yml logs

# Try rebuilding
docker-compose -f docker-compose-phase4.yml up --build -d
```

### Database connection errors?

```bash
# Verify database is running
docker-compose -f docker-compose-phase4.yml exec postgres psql -U stacklens_user -d stacklens -c "SELECT 1;"

# Check connection strings
echo $DB_HOST $DB_PORT $DB_NAME
```

### No data in dashboard?

```bash
# Check if Kafka has messages
docker exec stacklens-kafka-analytics kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic stacklens-analytics \
  --from-beginning

# Check if metrics are stored
psql -h localhost -U stacklens_user -d stacklens -c "SELECT COUNT(*) FROM analytics_metrics_1min;"
```

### High latency queries?

```bash
# Check query plan
psql -h localhost -U stacklens_user -d stacklens -c "
EXPLAIN ANALYZE
SELECT * FROM analytics_metrics_1min
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
LIMIT 1000;
"

# Add index if needed
psql -h localhost -U stacklens_user -d stacklens -c "
CREATE INDEX idx_analytics_metrics_1min_service_timestamp
ON analytics_metrics_1min (service, timestamp DESC);
"
```

## Next Steps

1. **Add Alert Rules**: Custom business logic for your services
2. **Configure Notifications**: Slack, Email, PagerDuty integration
3. **Build Dashboard**: Use `/metrics` and `/alerts` endpoints
4. **Set Retention**: Adjust `RETENTION_HOT/WARM/COLD` for your needs
5. **Monitor Performance**: Track aggregation latency and throughput

## Help & Support

For detailed documentation, see: `docs/PHASE_4_ANALYTICS_GUIDE.md`

For issues:
1. Check service logs: `docker-compose logs -f`
2. Verify database connectivity
3. Confirm Kafka topic exists and has data
4. Check API response: `curl -v http://localhost:8005/health`
