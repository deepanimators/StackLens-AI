# StackLens OTel Pipeline Runbook

## Operational Guides

### 1. Starting the Stack
```bash
cd infra
docker-compose up -d
```
Verify all containers are running: `docker-compose ps`

### 2. Ingesting Logs
- **Via OTLP**: Send traces/logs to `http://localhost:4318`
- **Via API**: POST to `http://localhost:3001/api/ingest/log`

### 3. Troubleshooting
- **Kafka Lag**: Check if `stacklens-consumer` is keeping up.
- **ES Errors**: Check Elasticsearch logs for mapping errors.
- **Missing Alerts**: Verify `otel-collector` is exporting to `otel-logs` topic.

### 4. Maintenance
- **Pruning Indices**: Run `curl -X DELETE "localhost:9200/stacklens-logs-*"` to clear old logs.
