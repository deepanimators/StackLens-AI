# StackLens OTel Pipeline - Quick Reference Card

## 🚀 Quick Start (5 minutes)

```bash
# Navigate to infrastructure
cd infra/compose

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps

# View health status
curl http://localhost:9200/_cluster/health
curl http://localhost:4318/v1/logs -X POST -d '{}' -H "Content-Type: application/json"

# Check logs
docker-compose logs -f otel-collector

# Stop services
docker-compose down

# Clean everything (removes volumes)
docker-compose down -v
```

## 📍 Service Endpoints

| Service | Endpoint | Health Check |
|---------|----------|--------------|
| **OTLP HTTP** | `http://localhost:4318` | `POST /v1/logs` → 200 |
| **OTLP gRPC** | `localhost:4317` | - |
| **Elasticsearch** | `http://localhost:9200` | `GET /_cluster/health` |
| **Kibana** | `http://localhost:5601` | `GET /api/status` |
| **Kafka** | `localhost:9092` | - |
| **PostgreSQL** | `localhost:5432` | `pg_isready -U stacklens` |
| **Redis** | `localhost:6379` | `redis-cli ping` |
| **Jaeger** | `http://localhost:16686` | `GET /api/services` |

## 📤 Send Logs

### OTLP/HTTP (Recommended)
```bash
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "1705316445000000000",
          "body": { "stringValue": "test log" },
          "attributes": [
            { "key": "service.name", "value": { "stringValue": "my-app" } }
          ]
        }]
      }]
    }]
  }'
```

### JSON Fallback
```bash
curl -X POST http://localhost:3001/api/ingest/log \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-15T10:30:45.123Z",
    "service": "my-app",
    "level": "error",
    "message": "Something went wrong",
    "error_code": "DB_ERROR"
  }'
```

## 🔍 Search Logs in Elasticsearch

```bash
# List indices
curl http://localhost:9200/_cat/indices

# Get recent logs
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": { "match_all": {} },
    "size": 10,
    "sort": [{ "timestamp": { "order": "desc" } }]
  }'

# Find by service
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": { "term": { "service.keyword": "order-service" } },
    "size": 5
  }'

# Find by error code
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": { "term": { "error_code.keyword": "PRICE_MISSING" } },
    "size": 5
  }'

# Search text
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{
    "query": { "match": { "message": "price missing" } }
  }'
```

## 🐘 PostgreSQL Commands

```bash
# Connect to database
docker-compose exec postgres psql -U stacklens -d stacklens

# List tables (in psql)
\dt

# View alerts
SELECT id, issue_code, severity, created_at FROM alerts ORDER BY created_at DESC LIMIT 10;

# Count alerts by type
SELECT issue_code, COUNT(*) FROM alerts GROUP BY issue_code;

# Clear alerts
DELETE FROM alerts;

# Export to CSV
\COPY (SELECT * FROM alerts) TO '/tmp/alerts.csv' WITH CSV HEADER;
```

## 📝 Kafka Commands

```bash
# List topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Create topic
docker exec kafka kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --partitions 3 \
  --replication-factor 1

# Describe topic
docker exec kafka kafka-topics --describe \
  --bootstrap-server localhost:9092 \
  --topic otel-logs

# Consume messages
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic otel-logs \
  --from-beginning \
  --max-messages 5

# Check consumer group lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group stacklens-consumer \
  --describe
```

## 🔧 Troubleshooting

### Collector not working
```bash
# Check if running
docker-compose ps otel-collector

# View logs
docker-compose logs otel-collector | tail -50

# Test endpoint
curl -v http://localhost:4318/v1/logs

# Check health
curl http://localhost:13133/healthz
```

### Elasticsearch not indexing
```bash
# Check health
curl http://localhost:9200/_cluster/health?pretty

# List shards
curl http://localhost:9200/_cat/shards

# Check settings
curl http://localhost:9200/stacklens-logs-*/_settings
```

### Kafka lag high
```bash
# Check consumer lag
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group stacklens-consumer \
  --describe

# Reset offsets (dangerous!)
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group stacklens-consumer \
  --reset-offsets \
  --to-earliest \
  --topic otel-logs \
  --execute
```

### Container OOMKilled
```bash
# Check memory usage
docker stats

# Increase limits in docker-compose.yml
# - For Elasticsearch: ES_JAVA_OPTS=-Xms1g -Xmx1g
# - For Collector: GOGC=80

# Restart
docker-compose down && docker-compose up -d
```

## 🔑 Key Files

| Path | Purpose |
|------|---------|
| `infra/compose/docker-compose.yml` | Main compose file |
| `infra/bootstrap.sh` | Quick start script |
| `collector/otel-collector-config.yaml` | Collector configuration |
| `stacklens/ingest/schema/log_schema.json` | Log validation schema |
| `config/rules/alert-rules.json` | Alert rule definitions |
| `docs/architecture.md` | System architecture |
| `docs/otel-contract.md` | Data contract spec |
| `docs/runbook.md` | Operations guide |

## 📊 Log Structure

```json
{
  "timestamp": "ISO8601",
  "service": "service-name",
  "level": "debug|info|warn|error|fatal",
  "message": "what happened",
  "trace_id": "hex32|null",
  "span_id": "hex16|null",
  "request_id": "uuid|null",
  "error_code": "ERROR_CODE|null",
  "user_id": "id|null",
  "product_id": "id|null",
  "action": "action-name|null",
  "status": "success|failure|null",
  "app_version": "x.y.z",
  "attrs": { "key": "value" }
}
```

## 🎯 Alert Rules

| Code | Severity | Automation |
|------|----------|-----------|
| PRICE_MISSING | error | retry_with_fallback_price |
| INVENTORY_UNAVAILABLE | warn | notify_customer_alternatives |
| PAYMENT_FAILURE | error | retry_payment_with_backoff |
| DB_CONNECTION_ERROR | error | ❌ |
| EXTERNAL_TIMEOUT | warn | use_cached_response |
| DATA_VALIDATION_ERROR | warn | ❌ |
| DUPLICATE_ORDER | info | return_existing_order |
| AUTHZ_FAILURE | warn | ❌ |
| UNHANDLED_EXCEPTION | error | ❌ |

## 📡 Kafka Topics

| Topic | Purpose | Partitions | Retention |
|-------|---------|-----------|-----------|
| `otel-logs` | Raw logs | 3 | 7 days |
| `otel-traces` | Raw traces | 3 | 7 days |
| `stacklens-enriched` | Enriched logs | 3 | 3 days |
| `stacklens-alerts` | Alert events | 1 | 30 days |

## 🌐 UI Dashboards

- **Kibana**: http://localhost:5601 (log visualization)
- **Jaeger**: http://localhost:16686 (distributed tracing)
- **Admin Dashboard** (Phase 4): http://localhost:3000

## 🛠️ Common Tasks

### Add new alert rule
```bash
# Edit config/rules/alert-rules.json
# Add object with: id, name, severity, conditions, suggested_fix, priority
# Restart consumer service
docker-compose restart stacklens-consumer
```

### Export logs to file
```bash
# Elasticsearch query to file
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{"query":{"match_all":{}},"size":1000}' \
  | jq '.hits.hits[] | ._source' > logs.jsonl
```

### Backup database
```bash
docker-compose exec postgres pg_dump -U stacklens stacklens > backup.sql
```

### Monitor in real-time
```bash
# Watch container stats
watch -n 1 'docker stats --no-stream'

# Tail collector logs
docker-compose logs -f otel-collector
```

## 📚 Documentation

- **Architecture**: `docs/architecture.md`
- **Data Contract**: `docs/otel-contract.md`
- **Operations**: `docs/runbook.md`
- **This Guide**: `QUICK_REFERENCE.md`
- **README**: `OTEL_PIPELINE_README.md`

## 🚦 Status & Phases

- **Phase 0** ✅ Infrastructure scaffold
- **Phase 1** 🚧 SDK examples & collector
- **Phase 2** 🔜 Parser/Enricher
- **Phase 3** 🔜 Analyzer & alerts
- **Phase 4** 🔜 Admin UI & Jira
- **Phase 5** 🔜 Production hardening

## 🆘 Getting Help

1. Check `docs/runbook.md` for troubleshooting
2. Review logs: `docker-compose logs <service>`
3. Search Kibana: http://localhost:5601
4. Check Jaeger traces: http://localhost:16686
5. Review git history: `git log --oneline`

---

**Branch**: `feature/otel-pipeline`  
**Last Updated**: 2025-01-15  
**Status**: Phase 0 ✅
