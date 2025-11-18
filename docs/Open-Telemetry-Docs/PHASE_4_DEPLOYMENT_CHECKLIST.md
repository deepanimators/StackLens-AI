# Phase 4 Production Deployment Checklist

## ✅ Pre-Deployment Verification

### System Requirements
- [ ] Docker version: 20.10+
- [ ] Docker Compose version: 2.0+
- [ ] Disk space: 50GB minimum
- [ ] RAM: 16GB minimum for all services
- [ ] Network: Ports available (5432, 9092, 8004, 8005, 8080)
- [ ] OS: Linux (production), macOS (development)

### Code Quality
- [ ] All tests passing: `pytest tests/integration/test_phase4_analytics.py -v`
- [ ] Code coverage: >95%
- [ ] No linting errors: `pylint python-services/`
- [ ] SQL syntax validated
- [ ] Docker builds successfully: `docker-compose -f docker-compose-phase4.yml build`

### Documentation
- [ ] Architecture documented
- [ ] API endpoints documented
- [ ] Configuration documented
- [ ] Troubleshooting guide prepared
- [ ] Runbooks created

---

## 🚀 Deployment Steps

### Step 1: Environment Setup

```bash
# Set environment variables
export DEPLOYMENT_ENV=production
export DB_PASSWORD=$(openssl rand -base64 32)
export KAFKA_BROKERS=kafka:9092

# Create .env file
cat > .env.prod << EOF
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_INPUT_TOPIC=stacklens-analytics
KAFKA_OUTPUT_TOPIC=analytics-alerts
KAFKA_BATCH_SIZE=100
KAFKA_BATCH_TIMEOUT_MS=10000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=stacklens
DB_USER=stacklens_user
DB_PASSWORD=${DB_PASSWORD}
DB_POOL_MIN=5
DB_POOL_MAX=20

# Aggregation Windows
AGGREGATION_WINDOWS=1min,5min,1hour

# Retention Policies (days)
RETENTION_HOT=1
RETENTION_WARM=7
RETENTION_COLD=30

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance
MAX_THREADS=8
STATS_INTERVAL_SEC=30

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=8004
EOF

# Load environment
source .env.prod
```

### Step 2: Prepare Infrastructure

```bash
# Create necessary directories
mkdir -p logs/{analytics,dashboard}
mkdir -p data/postgres
mkdir -p data/kafka

# Set permissions
chmod 755 logs/{analytics,dashboard}
chmod 755 data/{postgres,kafka}

# Pre-create volumes (optional, for persistent storage)
docker volume create postgres-analytics-data
docker volume create kafka-analytics-data
docker volume create zookeeper-analytics-data
```

### Step 3: Build Images

```bash
# Build Phase 4 images
docker-compose -f docker-compose-phase4.yml build

# Verify builds
docker images | grep stacklens

# Expected output:
# stacklens-analytics-service:latest
# stacklens-dashboard-api:latest
# timescale/timescaledb:latest-pg15
# confluentinc/cp-kafka:7.5.0
# confluentinc/cp-zookeeper:7.5.0
```

### Step 4: Start Services

```bash
# Start all services
docker-compose -f docker-compose-phase4.yml up -d

# Verify services started
docker-compose -f docker-compose-phase4.yml ps

# Expected status: all "Up"
```

### Step 5: Wait for Health

```bash
# Check database health (wait up to 60s)
for i in {1..30}; do
  if docker-compose -f docker-compose-phase4.yml exec postgres psql -U stacklens_user -d stacklens -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database healthy"
    break
  fi
  echo "Waiting for database... ($i/30)"
  sleep 2
done

# Check analytics service health (wait up to 60s)
for i in {1..30}; do
  if curl -s http://localhost:8004/health > /dev/null 2>&1; then
    echo "✅ Analytics service healthy"
    break
  fi
  echo "Waiting for analytics service... ($i/30)"
  sleep 2
done

# Check dashboard API health (wait up to 60s)
for i in {1..30}; do
  if curl -s http://localhost:8005/health > /dev/null 2>&1; then
    echo "✅ Dashboard API healthy"
    break
  fi
  echo "Waiting for dashboard API... ($i/30)"
  sleep 2
done
```

---

## 🔍 Post-Deployment Validation

### Connectivity Tests

```bash
# Test database connection
psql -h localhost -U stacklens_user -d stacklens -c "\dt"
# Expected: List of analytics tables

# Test Kafka connectivity
docker exec stacklens-kafka-analytics kafka-broker-api-versions --bootstrap-server=localhost:9092
# Expected: ApiVersion information

# Test API endpoints
curl -s http://localhost:8005/health | jq
# Expected: {"status": "healthy", ...}
```

### Schema Validation

```bash
# Verify hypertables exist
psql -h localhost -U stacklens_user -d stacklens << EOF
SELECT * FROM timescaledb_information.hypertables;
EOF
# Expected: analytics_events, analytics_metrics_1min, 5min, 1hour

# Verify views exist
psql -h localhost -U stacklens_user -d stacklens << EOF
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'v_%' AND table_schema = 'public';
EOF
# Expected: 6 views (v_service_health_current, v_service_performance_trend, ...)

# Verify functions exist
psql -h localhost -U stacklens_user -d stacklens << EOF
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE 'analytics_%';
EOF
# Expected: analytics_calculate_sla, analytics_get_alert_stats, analytics_archive_old_data
```

### API Endpoint Tests

```bash
# Test metrics endpoint
curl "http://localhost:8005/metrics?window=1min&limit=1" | jq '.count'

# Test health status endpoint
curl "http://localhost:8005/health-status" | jq '.count'

# Test alerts endpoint
curl "http://localhost:8005/alerts?status=active" | jq '.count'

# Test stats endpoint
curl "http://localhost:8005/stats" | jq '.requests_served'
```

### Data Flow Test

```bash
# Send test message to Kafka
python3 << 'EOF'
import json
from datetime import datetime
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

message = {
    "timestamp": datetime.now().isoformat(),
    "service": "deployment-test-service",
    "level": "info",
    "latency_ms": 50.0,
    "risk_score": 0.1
}

producer.send('stacklens-analytics', value=message)
producer.flush()
producer.close()
print("✅ Test message sent")
EOF

# Wait a few seconds for aggregation
sleep 5

# Query metrics
curl "http://localhost:8005/metrics?service=deployment-test-service&limit=1" | jq '.metrics[0]'
# Expected: Metrics for deployment-test-service
```

### Performance Baseline

```bash
# Test aggregation latency
time docker-compose -f docker-compose-phase4.yml exec analytics-service python3 -c "
from analytics_service import TimeSeriesAggregator
agg = TimeSeriesAggregator()
for i in range(1000):
    agg.add_log('test', None, 'info', 50.0, 0.1)
metrics = agg.aggregate('1min')
print(f'Aggregated {len(metrics)} metrics')
"

# Test API latency
ab -n 100 -c 10 http://localhost:8005/metrics?window=1min

# Test database query latency
psql -h localhost -U stacklens_user -d stacklens -c "
EXPLAIN ANALYZE
SELECT * FROM analytics_metrics_1min
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
LIMIT 1000;
"
```

---

## 📊 Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: 'analytics-service'
    static_configs:
      - targets: ['localhost:8004']
```

### Grafana Dashboards

1. **Overview Dashboard**
   - Aggregation latency (p50, p95, p99)
   - Messages processed/sec
   - Metrics calculated/sec
   - Alerts triggered/sec
   - Database connections

2. **Health Dashboard**
   - Service status (healthy/degraded/unhealthy)
   - Error rates by service
   - Top error services
   - Top latency services

3. **Alert Dashboard**
   - Active alerts count
   - Alert by severity
   - Alert resolution time
   - Alert triggered rate

### Log Aggregation

```bash
# Collect logs from all services
docker-compose -f docker-compose-phase4.yml logs > deployment_logs.txt

# Filter errors
docker-compose -f docker-compose-phase4.yml logs | grep -i error

# Follow real-time logs
docker-compose -f docker-compose-phase4.yml logs -f --tail=50
```

---

## 🔐 Security Configuration

### Database Security

```sql
-- Create read-only user for dashboard
CREATE USER stacklens_reader WITH PASSWORD 'reader_password';
GRANT CONNECT ON DATABASE stacklens TO stacklens_reader;
GRANT USAGE ON SCHEMA public TO stacklens_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO stacklens_reader;

-- Create alert admin user
CREATE USER stacklens_admin WITH PASSWORD 'admin_password';
GRANT ALL ON DATABASE stacklens TO stacklens_admin;
```

### API Security

```python
# Add authentication to dashboard API
from flask_httpauth import HTTPBasicAuth

auth = HTTPBasicAuth()

@auth.verify_password
def verify_password(username, password):
    return username == 'admin' and password == 'secure_password'

@app.route('/metrics', methods=['GET'])
@auth.login_required
def get_metrics():
    # ... implementation
```

### Network Security

```bash
# Use firewall to restrict access
sudo ufw allow from 192.168.1.0/24 to any port 8005  # Dashboard API
sudo ufw allow from 192.168.1.0/24 to any port 5432  # PostgreSQL
sudo ufw deny from any to any port 8004  # Block metrics from outside

# Or use iptables
sudo iptables -A INPUT -p tcp --dport 8005 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8005 -j DROP
```

---

## 📈 Scaling Configuration

### Horizontal Scaling (Multiple Replicas)

```yaml
# docker-compose-production.yml
version: '3.8'

services:
  analytics-service-1:
    # ... analytics configuration ...
    deploy:
      replicas: 3
  
  analytics-service-2:
    # ... replica configuration ...
  
  analytics-service-3:
    # ... replica configuration ...

  # Load balancer
  nginx:
    image: nginx:latest
    ports:
      - "8005:8005"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

### Vertical Scaling (Resource Limits)

```yaml
# Increase resource allocation for high load
analytics-service:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 2G
      reservations:
        cpus: '2'
        memory: 1G

postgres:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 4G
      reservations:
        cpus: '2'
        memory: 2G
```

### Database Tuning

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 300;
ALTER SYSTEM SET shared_buffers = 1GB;
ALTER SYSTEM SET effective_cache_size = 4GB;
ALTER SYSTEM SET maintenance_work_mem = 256MB;
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

SELECT pg_reload_conf();
```

---

## 🚨 Alert Configuration

### Default Production Alerts

```sql
-- Ensure default alert rules are configured
INSERT INTO analytics_alert_rules (rule_name, metric_name, operator, threshold, severity, notification_channels, enabled)
VALUES
  ('High Error Rate', 'error_rate', '>', 5.0, 'warning', ARRAY['slack', 'email'], true),
  ('Critical Error Rate', 'error_rate', '>', 20.0, 'critical', ARRAY['slack', 'email', 'pagerduty'], true),
  ('High P99 Latency', 'latency_p99_ms', '>', 500, 'warning', ARRAY['slack', 'email'], true),
  ('Critical P99 Latency', 'latency_p99_ms', '>', 1000, 'critical', ARRAY['slack', 'email', 'pagerduty'], true)
ON CONFLICT DO NOTHING;
```

### Notification Channels

```bash
# Configure Slack webhook
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Configure email (SMTP)
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="alerts@example.com"
export SMTP_PASSWORD="app_specific_password"

# Configure PagerDuty
export PAGERDUTY_SERVICE_KEY="YOUR_SERVICE_KEY"
```

---

## 📋 Backup & Recovery

### Database Backup

```bash
# Full backup
pg_dump -h localhost -U stacklens_user -d stacklens > stacklens_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup with compression
pg_dump -h localhost -U stacklens_user -d stacklens | gzip > stacklens_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Automated daily backup
0 2 * * * pg_dump -h localhost -U stacklens_user -d stacklens | gzip > /backups/stacklens_$(date +\%Y\%m\%d).sql.gz
```

### Data Recovery

```bash
# Restore from backup
psql -h localhost -U stacklens_user -d stacklens < stacklens_backup_20240115_100000.sql

# Restore from compressed backup
zcat stacklens_backup_20240115_100000.sql.gz | psql -h localhost -U stacklens_user -d stacklens
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 30 minutes
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Backup Frequency**: Daily at 02:00 UTC
4. **Retention**: 30 days
5. **Backup Location**: S3 + local storage

---

## 🔄 Maintenance Tasks

### Daily Tasks (Automated)

```bash
# Archive old data (cron: 0 1 * * *)
docker-compose -f docker-compose-phase4.yml exec postgres psql -U stacklens_user -d stacklens -c "SELECT analytics_archive_old_data();"

# Backup database (cron: 0 2 * * *)
pg_dump -h localhost -U stacklens_user -d stacklens | gzip > /backups/stacklens_$(date +\%Y\%m\%d).sql.gz

# Check service health (cron: */5 * * * *)
curl -s http://localhost:8005/health | jq -e '.status == "healthy"' || notify_alert
```

### Weekly Tasks

- [ ] Review alert statistics
- [ ] Check error rates and latencies
- [ ] Verify backup integrity
- [ ] Update security patches
- [ ] Review and optimize slow queries

### Monthly Tasks

- [ ] Capacity planning review
- [ ] Performance tuning analysis
- [ ] Security audit
- [ ] Documentation updates
- [ ] Disaster recovery drill

---

## 🎯 Success Criteria

### Phase 4 Deployment Success

✅ All Services Running:
- [ ] Analytics service: `docker-compose ps | grep analytics-service`
- [ ] Dashboard API: `docker-compose ps | grep dashboard-api`
- [ ] PostgreSQL: `docker-compose ps | grep postgres`
- [ ] Kafka: `docker-compose ps | grep kafka`

✅ Connectivity Verified:
- [ ] Database accessible
- [ ] Kafka topics created
- [ ] APIs responding
- [ ] Services communicating

✅ Data Flow Working:
- [ ] Messages arriving in analytics topic
- [ ] Metrics being aggregated
- [ ] Data stored in PostgreSQL
- [ ] Dashboard queries returning data

✅ Performance Baseline:
- [ ] Aggregation latency < 500ms
- [ ] Alert evaluation < 1s
- [ ] Dashboard queries < 500ms
- [ ] Throughput > 1000 msgs/sec

✅ Monitoring Active:
- [ ] Health checks passing
- [ ] Logs being collected
- [ ] Metrics being scraped
- [ ] Alerts configured

✅ Documentation Complete:
- [ ] Runbooks prepared
- [ ] On-call guide created
- [ ] Troubleshooting guide available
- [ ] Team trained

---

## 📞 Rollback Procedure

If issues occur during deployment:

```bash
# 1. Stop services
docker-compose -f docker-compose-phase4.yml down

# 2. Remove problematic data
rm -rf data/postgres/* data/kafka/* logs/*

# 3. Re-create volumes
docker volume rm postgres-analytics-data kafka-analytics-data zookeeper-analytics-data
docker volume create postgres-analytics-data
docker volume create kafka-analytics-data
docker volume create zookeeper-analytics-data

# 4. Restart services
docker-compose -f docker-compose-phase4.yml up -d

# 5. Verify health
docker-compose -f docker-compose-phase4.yml ps
curl http://localhost:8005/health
```

---

## ✅ Sign-Off Checklist

| Item | Responsible | Status | Date |
|------|-------------|--------|------|
| Pre-deployment review | DevOps | [ ] | |
| Code review complete | Engineering | [ ] | |
| Security audit passed | Security | [ ] | |
| Performance validated | QA | [ ] | |
| Monitoring configured | DevOps | [ ] | |
| Runbooks prepared | Operations | [ ] | |
| Team training done | Engineering | [ ] | |
| Deployment approved | Manager | [ ] | |

---

**Deployment Checklist Version**: 1.0  
**Last Updated**: 2024-01-15  
**Status**: Production Ready ✅
