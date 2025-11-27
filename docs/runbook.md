# StackLens OTel Pipeline - Operations Runbook

## Quick Start

```bash
cd infra/compose
./bootstrap.sh up        # Start stack
./bootstrap.sh health    # Check health
./bootstrap.sh logs      # View logs
./bootstrap.sh down      # Stop stack
```

## Common Issues & Troubleshooting

### 1. OTLP Collector Not Receiving Logs

**Symptoms**: 
- OTLP endpoint returns 404
- No messages in Kafka topic `otel-logs`
- Collector logs show connection errors

**Diagnosis**:
```bash
# Check if collector is running
docker-compose ps otel-collector

# Check collector health endpoint
curl -v http://localhost:13133/healthz

# Check if port 4318 is listening
lsof -i :4318

# View collector logs
docker-compose logs otel-collector | head -50
```

**Solutions**:
1. Verify Docker container is running: `docker-compose ps otel-collector`
2. Check firewall: `curl -v http://localhost:4318/v1/logs`
3. Verify config file path in docker-compose.yml
4. Check CORS headers if calling from browser: `curl -i -X OPTIONS http://localhost:4318`
5. Restart collector: `docker-compose restart otel-collector`

**OTLP Protocol Validation**:
```bash
# Test OTLP HTTP POST (should return 200)
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "1000000",
          "body": { "stringValue": "test log" }
        }]
      }]
    }]
  }'

# Expected: HTTP 200 OK (empty body is normal)
```

---

### 2. Kafka Consumer Lag High / Not Consuming Messages

**Symptoms**:
- Messages in Kafka but not indexed in Elasticsearch
- High consumer lag
- Consumer service not processing

**Diagnosis**:
```bash
# Check Kafka broker health
docker-compose logs kafka | grep -i error

# List topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Check topic details
docker exec kafka kafka-topics --describe --topic otel-logs --bootstrap-server localhost:9092

# Check consumer group status
docker exec kafka kafka-consumer-groups --list --bootstrap-server localhost:9092
docker exec kafka kafka-consumer-groups --describe --group stacklens-consumer --bootstrap-server localhost:9092

# View messages in topic (first 5)
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic otel-logs \
  --from-beginning \
  --max-messages 5 \
  --timeout-ms 5000

# Check consumer service logs
docker-compose logs stacklens-consumer | head -50
```

**Solutions**:
1. Verify Kafka is healthy: `docker-compose logs kafka | grep "started"`
2. Verify consumer service is running: `docker-compose ps stacklens-consumer`
3. Check consumer has Kafka BROKERS env var: `docker-compose config stacklens-consumer | grep KAFKA`
4. Reset consumer group offset (careful!):
   ```bash
   docker exec kafka kafka-consumer-groups \
     --bootstrap-server localhost:9092 \
     --group stacklens-consumer \
     --reset-offsets \
     --to-earliest \
     --topic otel-logs \
     --execute
   ```
5. Restart consumer: `docker-compose restart stacklens-consumer`

**Kafka Broker Connection**:
```bash
# Test connection from host
kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# From inside container
docker exec kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```

---

### 3. Elasticsearch Not Indexing

**Symptoms**:
- No indices in Elasticsearch (`GET /_cat/indices` returns empty)
- Collector exports to ES but nothing appears
- ES health RED or YELLOW

**Diagnosis**:
```bash
# Check ES cluster health
curl http://localhost:9200/_cluster/health?pretty

# List indices
curl http://localhost:9200/_cat/indices

# Get index details
curl http://localhost:9200/stacklens-logs-*/_stats

# Check ES logs
docker-compose logs elasticsearch | grep -i error

# Test ES connectivity from collector
docker-compose exec otel-collector curl -v http://elasticsearch:9200/_cluster/health
```

**Solutions**:
1. Verify ES is running: `docker-compose ps elasticsearch`
2. Check ES health: `curl http://localhost:9200/_cluster/health?pretty`
3. If health is RED:
   ```bash
   # Check for unassigned shards
   curl http://localhost:9200/_cat/shards?h=index,shard,prirep,state,node | grep -i unassigned
   
   # Try cluster recovery
   curl -X POST http://localhost:9200/_cluster/reroute?retry_failed=true
   ```
4. Verify memory settings in docker-compose.yml (default 512MB may be too low)
5. Delete corrupt indices and retry:
   ```bash
   curl -X DELETE http://localhost:9200/stacklens-logs-*
   ```

**Index Template Creation**:
```bash
# Create index template for time-based indices
curl -X PUT http://localhost:9200/_index_template/stacklens-logs \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["stacklens-logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0
      },
      "mappings": {
        "properties": {
          "timestamp": { "type": "date" },
          "service": { "type": "keyword" },
          "level": { "type": "keyword" },
          "message": { "type": "text" },
          "trace_id": { "type": "keyword" },
          "request_id": { "type": "keyword" }
        }
      }
    }
  }'
```

---

### 4. PostgreSQL Connection Issues

**Symptoms**:
- Consumer can't connect to Postgres
- "permission denied" or "connection refused"
- Alerts not being persisted

**Diagnosis**:
```bash
# Check Postgres is running
docker-compose ps postgres

# Check Postgres logs
docker-compose logs postgres | grep -i error

# Test Postgres connection
docker-compose exec postgres psql -U stacklens -d stacklens -c "SELECT version();"

# Check Postgres port
lsof -i :5432
```

**Solutions**:
1. Verify container is running: `docker-compose ps postgres`
2. Wait for Postgres to be ready:
   ```bash
   docker-compose exec postgres pg_isready -U stacklens
   # Should return "accepting connections"
   ```
3. Check credentials in docker-compose.yml match consumer service
4. Run migrations: `docker-compose exec postgres psql -U stacklens -d stacklens -f migrations.sql`
5. Test connectivity from consumer:
   ```bash
   docker-compose exec stacklens-consumer \
     psql -h postgres -U stacklens -d stacklens -c "SELECT 1"
   ```

**Create Test Table**:
```bash
docker-compose exec postgres psql -U stacklens -d stacklens -c "
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  issue_code VARCHAR(64),
  severity VARCHAR(16),
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
"
```

---

### 5. WebSocket Events Not Arriving in Admin UI

**Symptoms**:
- Alerts created but UI doesn't update in realtime
- WebSocket connection closed/refused
- Console shows WebSocket errors

**Diagnosis**:
```bash
# Check if WebSocket endpoint is listening
curl -i -N -H "Upgrade: websocket" -H "Connection: Upgrade" \
  http://localhost:3001/ws/alerts

# Expected: HTTP 101 Switching Protocols

# Check API service logs
docker-compose logs stacklens-api | grep -i "websocket\|ws\|upgrade"

# Test from inside container
docker-compose exec stacklens-api curl -v \
  http://localhost:3001/health
```

**Solutions**:
1. Verify API service is running: `docker-compose ps stacklens-api`
2. Check API service has WebSocket handler configured
3. Verify proxy/firewall allows WebSocket upgrade headers
4. Check browser console for specific error message
5. Restart API: `docker-compose restart stacklens-api`

---

### 6. High Memory Usage / OOMKilled Containers

**Symptoms**:
- Container exits with code 137 (OOMKilled)
- Elasticsearch/Kafka memory spikes
- docker-compose ps shows container stopped

**Diagnosis**:
```bash
# Check memory limits
docker inspect <container_id> | grep -i memory

# Monitor real-time memory usage
docker stats

# Check Elasticsearch specifically
docker-compose logs elasticsearch | grep -i "out of memory\|oom"
```

**Solutions**:
1. Increase memory limits in docker-compose.yml:
   ```yaml
   elasticsearch:
     environment:
       - "ES_JAVA_OPTS=-Xms1g -Xmx1g"  # Increase from 512m
   ```
2. Reduce sample rate if too many logs: update `probabilistic_sampler.sampling_percentage` in collector config
3. Enable Kafka log cleanup: `log.cleanup.policy: delete` + `log.retention.hours: 24`
4. Restart stack: `docker-compose down -v && docker-compose up -d`

---

### 7. Collector Config Parsing Errors

**Symptoms**:
- Collector fails to start
- Logs show "failed to load config"
- YAML syntax error

**Diagnosis**:
```bash
# Check collector logs
docker-compose logs otel-collector | grep -i "error\|yaml\|parse"

# Validate YAML syntax
python3 -m yaml collector/otel-collector-config.yaml

# Try to read config file
cat collector/otel-collector-config.yaml
```

**Solutions**:
1. Verify YAML indentation (use 2 spaces, not tabs)
2. Validate YAML with: `yamllint collector/otel-collector-config.yaml`
3. Check that volume mount path is correct in docker-compose.yml
4. Use environment variable substitution if needed:
   ```yaml
   processors:
     attributes:
       actions:
         - key: env
           value: ${ENVIRONMENT:-dev}
           action: insert
   ```

---

### 8. Rule Engine Not Matching Logs

**Symptoms**:
- Logs ingested but no alerts created
- Expected alerts missing
- All logs labeled "no rule match"

**Diagnosis**:
```bash
# Check rule definitions
cat config/rules/alert-rules.json | jq .

# Check recent alerts
docker-compose exec postgres psql -U stacklens -d stacklens -c "
SELECT issue_code, COUNT(*) as count FROM alerts 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY issue_code;
"

# Trace analyzer logs
docker-compose logs stacklens-consumer | grep -i "rule\|alert\|analyzer"
```

**Solutions**:
1. Verify rule conditions match log structure
2. Check error_code field is populated correctly in logs
3. Add debug logging to analyzer for rule matching
4. Test rule with curl:
   ```bash
   # Send test log that should trigger rule
   curl -X POST http://localhost:3001/api/ingest/log \
     -H "Content-Type: application/json" \
     -d '{
       "timestamp": "2025-01-15T10:30:45.123Z",
       "service": "order-service",
       "level": "error",
       "message": "Price is missing",
       "error_code": "PRICE_MISSING",
       "action": "create_order"
     }'
   
   # Wait 2s and check alerts
   curl http://localhost:3001/admin/alerts?limit=1 | jq .
   ```

---

### 9. Jira Integration Not Creating Issues

**Symptoms**:
- Alerts created but no Jira tickets
- "jira_issue_key": null on all alerts
- Jira API errors in logs

**Diagnosis**:
```bash
# Check Jira token is set
docker-compose exec stacklens-api env | grep -i jira

# Check Jira endpoint config
docker-compose exec stacklens-api curl -H "Authorization: Bearer $JIRA_TOKEN" \
  https://your-jira-instance.atlassian.net/rest/api/3/projects

# Check API logs for Jira calls
docker-compose logs stacklens-api | grep -i jira
```

**Solutions**:
1. Set JIRA_TOKEN env var: Add to docker-compose.yml
   ```yaml
   environment:
     JIRA_TOKEN: "your-api-token"
     JIRA_URL: "https://your-instance.atlassian.net"
     JIRA_PROJECT_KEY: "STACKLENS"
   ```
2. Use mock Jira in CI: Set `JIRA_MOCK: "true"`
3. Verify token has permissions: Create issue via Jira UI first
4. Check firewall allows egress to Jira
5. Test endpoint directly:
   ```bash
   curl -H "Authorization: Bearer $JIRA_TOKEN" \
     $JIRA_URL/rest/api/3/myself
   # Should return current user info
   ```

---

### 10. DNS Resolution Issues

**Symptoms**:
- "Can't resolve hostname" errors
- Services can't talk to each other
- Network unreachable

**Diagnosis**:
```bash
# Check if services are on same network
docker network ls
docker network inspect stacklens-network

# Test DNS from inside container
docker-compose exec stacklens-consumer nslookup kafka
docker-compose exec stacklens-consumer ping elasticsearch

# Check container network config
docker inspect <container_id> | grep -A 10 NetworkSettings
```

**Solutions**:
1. Verify all services use same network in docker-compose.yml:
   ```yaml
   networks:
     default:
       name: stacklens-network
   ```
2. Use service name (not localhost) for inter-container communication
3. Recreate network: `docker network rm stacklens-network && docker-compose up -d`
4. For host->container communication: use `localhost:port`
5. For container->container: use `service-name:internal-port`

---

## Performance Tuning

### Increase Collector Throughput

```yaml
# collector/otel-collector-config.yaml
processors:
  batch:
    send_batch_size: 2048        # Increase from 1024
    timeout: 10s
    send_batch_max_size: 4096    # Increase from 2048
```

### Optimize Elasticsearch Indexing

```bash
# Reduce refresh interval for better throughput (trade latency for throughput)
curl -X PUT http://localhost:9200/stacklens-logs-*/_settings \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "refresh_interval": "30s"
    }
  }'

# Bulk ingest optimization
curl -X PUT http://localhost:9200/stacklens-logs-*/_settings \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "number_of_replicas": 0
    }
  }'
```

### Monitor Kafka Lag

```bash
# Check consumer lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group stacklens-consumer \
  --describe

# Consumer should lag <= 100 messages in normal operation
```

---

## Monitoring & Metrics

### Collect Metrics Endpoints

```bash
# Collector metrics
curl http://localhost:8888/metrics

# API service metrics (if instrumented)
curl http://localhost:3001/metrics

# Consumer service metrics (if instrumented)
curl http://localhost:8001/metrics
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Kafka lag | > 100 | > 1000 |
| ES indexing latency | > 1s | > 5s |
| Collector dropped | > 0 | > 10/s |
| API response time | > 500ms | > 2000ms |
| DB connection pool exhausted | warning | error |

---

## Graceful Shutdown

```bash
# Signal services to gracefully shut down
docker-compose down

# Wait for Kafka offsets to be committed (~10s)
# Postgres connections to close (~5s)
# Elasticsearch shards to stabilize (~10s)

# If stuck, force kill
docker-compose down --timeout 30
```

---

## Backup & Recovery

### Backup Elasticsearch Indices

```bash
# Create snapshot repo
curl -X PUT http://localhost:9200/_snapshot/backup \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/snapshots"
    }
  }'

# Create snapshot
curl -X PUT http://localhost:9200/_snapshot/backup/snap1
```

### Backup PostgreSQL

```bash
# Dump database
docker-compose exec postgres pg_dump -U stacklens stacklens > backup.sql

# Restore from dump
docker-compose exec -T postgres psql -U stacklens stacklens < backup.sql
```

---

## Log Analysis Examples

### Find all PRICE_MISSING errors in last hour

```bash
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "term": { "error_code.keyword": "PRICE_MISSING" } },
          { "range": { "timestamp": { "gte": "now-1h" } } }
        ]
      }
    },
    "size": 100
  }' | jq .
```

### Count logs by service (last 24h)

```bash
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "range": {
        "timestamp": { "gte": "now-24h" }
      }
    },
    "aggs": {
      "by_service": {
        "terms": {
          "field": "service.keyword",
          "size": 100
        }
      }
    },
    "size": 0
  }' | jq .aggregations
```

---

## Escalation Path

1. Check service logs: `docker-compose logs <service>`
2. Verify service health: `docker-compose ps`
3. Check resource utilization: `docker stats`
4. Review recent config changes
5. Consult this runbook's troubleshooting section
6. Escalate to on-call engineering team with:
   - Full docker-compose logs output
   - docker stats snapshot
   - Timestamp of issue
   - Related Kibana search URL

---

**Last Updated**: 2025-01-15  
**Version**: 1.0.0
