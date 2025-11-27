# Phase 2: Quick Start Guide

## 🚀 5-Minute Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- PostgreSQL client (psql)
- Kafka command-line tools (optional)

### Step 1: Start Infrastructure

```bash
# Navigate to project root
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy

# Start PostgreSQL, Kafka, and Parser/Enricher Service
docker-compose -f docker-compose-phase2.yml up -d

# Verify services are running
docker-compose -f docker-compose-phase2.yml ps

# Expected output:
# NAME                       STATUS
# stacklens-postgres         Up (healthy)
# stacklens-zookeeper        Up (healthy)
# stacklens-kafka            Up (healthy)
# stacklens-kafka-init       Exited (0)
# stacklens-parser-enricher  Up (healthy)
# stacklens-kafka-ui         Up
# stacklens-pgadmin          Up
```

### Step 2: Verify Database Schema

```bash
# Connect to PostgreSQL
docker exec -it stacklens-postgres psql -U stacklens -d stacklens

# Verify tables exist
\dt

# Expected output:
# enriched_logs, dlq_messages, parser_metadata, audit_log, raw_logs

# Check indexes
\di

# Exit
\q
```

### Step 3: Send Test Messages

```bash
# Install test dependencies
pip install kafka-python

# Generate and send 50 test messages
python python-services/test_message_generator.py \
  --count 50 \
  --broker localhost:9092 \
  --topic otel-logs \
  --error-rate 0.1

# Expected output:
# [INFO] Generated 50 messages
# [INFO] Validation: 50/50 messages valid
# [INFO] Sent 50 messages
```

### Step 4: Verify Processing

```bash
# Check enriched logs in database
docker exec -it stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT COUNT(*) FROM enriched_logs;"

# Expected: 50 (or count of messages successfully processed)

# Check error messages (if any)
docker exec -it stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT error_reason, COUNT(*) FROM dlq_messages GROUP BY error_reason;"

# Check enriched messages in Kafka
docker exec -it stacklens-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic stacklens-enriched \
  --from-beginning \
  --max-messages 5
```

### Step 5: View Service Logs

```bash
# Parser/Enricher Service logs
docker logs -f stacklens-parser-enricher

# View specific log level
docker logs stacklens-parser-enricher | grep ERROR
```

## 📊 Monitoring UIs

### Kafka UI
- **URL**: http://localhost:8080
- **Features**: 
  - Topic browser
  - Consumer group monitoring
  - Message inspection
  - Performance metrics

### PgAdmin (Database Management)
- **URL**: http://localhost:5050
- **Credentials**:
  - Email: admin@stacklens.local
  - Password: admin
- **Setup**:
  1. Click "Add New Server"
  2. Name: "stacklens-postgres"
  3. Host: postgres
  4. Port: 5432
  5. Database: stacklens
  6. Username: stacklens
  7. Password: stacklens_secure_password

### Health Check
- **URL**: http://localhost:8001/health
- **Response**: Service health status, Kafka connection, database connection

## 🧪 Testing Workflows

### Scenario 1: Basic Message Processing

```bash
# 1. Send 100 valid messages
python python-services/test_message_generator.py \
  --count 100 \
  --broker localhost:9092 \
  --topic otel-logs

# 2. Wait 10 seconds for processing
sleep 10

# 3. Verify all processed
docker exec -it stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT COUNT(*) as total, 
          COUNT(CASE WHEN level='error' THEN 1 END) as errors,
          COUNT(CASE WHEN level='critical' THEN 1 END) as critical
   FROM enriched_logs WHERE stored_at > NOW() - INTERVAL '1 minute';"

# Expected: 100 total, ~10 errors (10% error rate), ~2 critical
```

### Scenario 2: Error Handling & DLQ

```bash
# 1. Send 20 messages with 50% error rate
python python-services/test_message_generator.py \
  --count 20 \
  --broker localhost:9092 \
  --topic otel-logs \
  --error-rate 0.5

# 2. Wait 5 seconds
sleep 5

# 3. Check DLQ messages
docker exec -it stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT error_reason, COUNT(*) FROM dlq_messages 
   WHERE created_at > NOW() - INTERVAL '1 minute'
   GROUP BY error_reason;"

# Expected: Count of failed validations
```

### Scenario 3: Load Testing

```bash
# 1. Send 1000 messages with 0% error rate (valid only)
python python-services/test_message_generator.py \
  --count 1000 \
  --broker localhost:9092 \
  --topic otel-logs \
  --error-rate 0.0

# 2. Monitor processing rate
watch -n 1 "docker exec stacklens-postgres psql -U stacklens -d stacklens -c \
  \"SELECT COUNT(*) FROM enriched_logs WHERE stored_at > NOW() - INTERVAL '1 minute';\""

# 3. Check performance metrics
docker logs stacklens-parser-enricher | grep "processed"
```

### Scenario 4: End-to-End with Slow Consumer

```bash
# 1. Send 50 messages slowly (1 per second)
python python-services/test_message_generator.py \
  --count 50 \
  --broker localhost:9092 \
  --topic otel-logs \
  --delay 0.1

# 2. Monitor service metrics during processing
watch -n 2 "curl -s http://localhost:8001/health | python -m json.tool"

# 3. Verify all messages processed
docker exec -it stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT COUNT(*) FROM enriched_logs WHERE stored_at > NOW() - INTERVAL '5 minutes';"
```

## 🔍 Query Examples

### Recent Logs by Service
```sql
SELECT service, level, COUNT(*) as count, 
       MIN(timestamp) as earliest, MAX(timestamp) as latest
FROM enriched_logs
WHERE stored_at > NOW() - INTERVAL '1 hour'
GROUP BY service, level
ORDER BY service, level;
```

### Error Analysis
```sql
SELECT error_code, COUNT(*) as count, 
       MIN(timestamp) as first_error, MAX(timestamp) as last_error
FROM enriched_logs
WHERE level IN ('error', 'critical')
  AND stored_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY count DESC;
```

### DLQ Summary
```sql
SELECT error_reason, COUNT(*) as count, 
       MIN(created_at) as first_failure, MAX(created_at) as latest_failure
FROM dlq_messages
GROUP BY error_reason
ORDER BY count DESC;
```

### Throughput Analysis
```sql
SELECT 
  DATE_TRUNC('minute', stored_at) as minute,
  COUNT(*) as messages_per_minute,
  COUNT(CASE WHEN level='error' THEN 1 END) as errors
FROM enriched_logs
WHERE stored_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', stored_at)
ORDER BY minute DESC;
```

## 🆘 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker logs stacklens-parser-enricher

# Common issues:
# 1. Database not ready - check postgres service
docker logs stacklens-postgres

# 2. Kafka not reachable - check kafka service
docker logs stacklens-kafka

# 3. Port conflicts - change port in docker-compose-phase2.yml
```

### Messages Not Being Processed
```bash
# Check Kafka topics exist
docker exec stacklens-kafka kafka-topics \
  --bootstrap-server localhost:9092 \
  --list

# Check consumer group lag
docker exec stacklens-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group parser-enricher-group \
  --describe

# Check if messages in input topic
docker exec stacklens-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic otel-logs \
  --from-beginning \
  --max-messages 1
```

### Database Full/Slow Queries
```bash
# Check database size
docker exec stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT pg_size_pretty(pg_database_size('stacklens'));"

# Check slow queries
docker exec stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Archive old logs (optional)
docker exec stacklens-postgres psql -U stacklens -d stacklens -c \
  "INSERT INTO raw_logs SELECT * FROM enriched_logs 
   WHERE stored_at < NOW() - INTERVAL '30 days';"
```

### High Error Rate in DLQ
```bash
# Check error reasons
docker exec stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT error_reason, COUNT(*) FROM dlq_messages 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY error_reason ORDER BY count DESC;"

# Check parser service logs for details
docker logs stacklens-parser-enricher | grep -i "validation\|error\|failed"

# Sample failed message
docker exec stacklens-postgres psql -U stacklens -d stacklens -c \
  "SELECT original_message, error_reason FROM dlq_messages LIMIT 1;"
```

## 🧹 Cleanup

### Stop Services
```bash
docker-compose -f docker-compose-phase2.yml stop
```

### Stop & Remove All
```bash
docker-compose -f docker-compose-phase2.yml down
```

### Remove Volumes (Reset Database)
```bash
docker-compose -f docker-compose-phase2.yml down -v
```

### View Service Logs After Shutdown
```bash
docker-compose -f docker-compose-phase2.yml logs stacklens-parser-enricher
```

## 📈 Performance Tuning

### Increase Throughput
```yaml
# In docker-compose-phase2.yml, parser-enricher service:
environment:
  BATCH_SIZE: "200"              # Increase batch size
  BATCH_TIMEOUT: "10"            # Increase timeout
  DB_POOL_SIZE: "10"             # Increase connection pool
  KAFKA_MAX_POLL_RECORDS: "200"  # Increase poll size
```

### Reduce Latency
```yaml
environment:
  BATCH_SIZE: "10"               # Smaller batches
  BATCH_TIMEOUT: "1"             # Shorter timeout
  DB_POOL_SIZE: "20"             # More connections
```

### Reduce Memory Usage
```yaml
environment:
  BATCH_SIZE: "50"               # Smaller batches
  DB_POOL_SIZE: "3"              # Fewer connections
  KAFKA_MAX_POLL_RECORDS: "50"   # Fewer records
```

## 📚 Next Steps

1. **Phase 2b - Schema Validator**: Extract schema validation into standalone module
2. **Phase 2c - Metadata Enricher**: Build advanced enrichment (geo-IP, business context)
3. **Phase 2d - Containerization**: Full CI/CD pipeline and registry push
4. **Phase 3**: Advanced analytics and aggregation
5. **Phase 4**: Real-time alerting and anomaly detection
6. **Phase 5**: ML-powered insights and predictions

## 💡 Tips & Tricks

### Monitor All Services at Once
```bash
watch -n 1 'docker-compose -f docker-compose-phase2.yml ps'
```

### Stream Logs from All Services
```bash
docker-compose -f docker-compose-phase2.yml logs -f
```

### Execute Commands in Container
```bash
# PostgreSQL
docker exec -it stacklens-postgres psql -U stacklens -d stacklens

# Bash
docker exec -it stacklens-parser-enricher /bin/bash

# Python
docker exec -it stacklens-parser-enricher python -c "import sys; print(sys.version)"
```

### Check Resource Usage
```bash
docker stats --no-stream stacklens-parser-enricher stacklens-postgres stacklens-kafka
```

---

**Status**: Phase 2 - Parser/Enricher Service ✅ Ready for testing

For detailed documentation, see [PHASE_2_PARSER_ENRICHER_GUIDE.md](./PHASE_2_PARSER_ENRICHER_GUIDE.md)
