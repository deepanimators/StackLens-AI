# OpenTelemetry Realtime Log Pipeline - StackLens Integration

## Overview

This is a production-grade OpenTelemetry-based log and telemetry pipeline for StackLens. It ingests logs, traces, and metrics from any system (browser, backend, services), processes them in realtime, and turns them into alerts, dashboards, and tickets (Jira integration).

**Status**: Phase 0 - Infrastructure Scaffold ✅

## Quick Start

### Prerequisites
- Docker & Docker Compose 1.29+
- Node.js 18+ (for SDKs)
- Python 3.9+ (for consumer service)
- GNU Make (optional but recommended)

### Start the Stack

```bash
# Clone and navigate to project
cd infra/compose

# Bring up all services
docker-compose up -d

# Check service health
docker-compose ps

# View logs
docker-compose logs -f otel-collector
docker-compose logs -f kafka
docker-compose logs -f elasticsearch
```

### Verify Services

```bash
# OTLP Collector (HTTP)
curl -X POST http://localhost:4318/v1/logs -H "Content-Type: application/json" \
  -d '{"resourceLogs":[{"scopeLogs":[{"logRecords":[{"timeUnixNano":"1000000","body":{"stringValue":"test"}}]}]}]}'

# Elasticsearch
curl http://localhost:9200/_cluster/health

# Kibana
open http://localhost:5601

# Jaeger (distributed tracing)
open http://localhost:16686

# Kafka (check topics)
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Client Applications                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Web SDK    │  │  Node SDK   │  │  Custom JSON Logger      │  │
│  │  (OTel JS)  │  │  (OTel Node)│  │  /api/ingest/log         │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬─────────────┘  │
└─────────┼─────────────────┼──────────────────────┼────────────────┘
          │                 │                      │
          └─────────────────┼──────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  OTLP Collector │
                   │  HTTP 4318      │
                   │  gRPC 4317      │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
        │   Kafka    │ │Jaeger  │ │Elasticsearch│
        │otel-logs   │ │ (Traces)│ │(Demo only) │
        │otel-traces │ │        │ │            │
        └─────┬──────┘ └────────┘ └────────────┘
              │
              │ [Messages]
              │
    ┌─────────▼──────────┐
    │  StackLens         │
    │  Consumer Service  │
    │  ┌──────────────┐  │
    │  │   Parser     │  │
    │  │ • Validate   │  │
    │  │ • Enrich     │  │
    │  │ • Redact PII │  │
    │  └──────┬───────┘  │
    │         │          │
    │  ┌──────▼───────┐  │
    │  │  Analyzer    │  │
    │  │ • Rules      │  │
    │  │ • ML Model   │  │
    │  │ • Alerts     │  │
    │  └──────┬───────┘  │
    └─────────┼──────────┘
              │
         ┌────┴─────────┬──────────┐
         │              │          │
    ┌────▼──────┐ ┌────▼─────┐ ┌─▼─────────┐
    │ Postgres  │ │Elasticsearch│ │Kafka    │
    │ Alerts    │ │ Enriched   │ │Alerts   │
    │ Raw Logs  │ │ Logs       │ │Topic    │
    └───────────┘ └───────────┘ └─────────┘
         │              │          │
         │              │          │
    ┌────▼──────────────▼──────────▼─────┐
    │     Admin UI                        │
    │  ┌──────────────────────────────┐   │
    │  │ Alerts Dashboard (WebSocket) │   │
    │  │ Search (ES-backed)           │   │
    │  │ Jira Integration Settings    │   │
    │  │ Observability Metrics        │   │
    │  └──────────────────────────────┘   │
    └─────────────────────────────────────┘
         │              │
    ┌────▼──────┐  ┌───▼────┐
    │    Jira   │  │Grafana  │
    │ (Tickets) │  │Dashboards│
    └───────────┘  └─────────┘
```

## Deliverables Checklist

### Phase 0: Infrastructure & Schema ✅
- [x] `infra/compose/docker-compose.yml` - Local staging with all services
- [x] `collector/otel-collector-config.yaml` - OTLP receiver, Kafka/ES exporters
- [x] `stacklens/ingest/schema/log_schema.json` - Data contract v1
- [x] `config/rules/alert-rules.json` - Alert rule definitions
- [x] `docs/architecture.md` - This file

### Phase 1: SDK Examples & Collector (In Progress)
- [ ] `sdk-examples/js/otel-web-sample.js`
- [ ] `sdk-examples/node/otel-node-sample.js`
- [ ] CI job: smoke-collector

### Phase 2: Parser/Enricher + Elasticsearch
- [ ] `stacklens/consumer/parser.ts`
- [ ] `stacklens/consumer/enricher.ts`
- [ ] ES index template & mapping
- [ ] Postgres migrations
- [ ] Unit & integration tests

### Phase 3: Analyzer + Alerts
- [ ] Rule engine
- [ ] ML classifier
- [ ] Alert persistence
- [ ] WebSocket events
- [ ] Integration tests

### Phase 4: Admin UI & Jira
- [ ] React alerts dashboard
- [ ] Search UI
- [ ] Jira connector
- [ ] E2E tests

### Phase 5: Hardening & Production
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] ILM policies
- [ ] K8s manifests
- [ ] ML pipeline
- [ ] Security audit

## Data Contracts

### Log Format (JSON Schema)

See `stacklens/ingest/schema/log_schema.json` for full spec. Required fields:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "service": "order-service",
  "level": "error|warn|info|debug",
  "message": "What happened",
  "trace_id": "hex32|null",
  "span_id": "hex16|null",
  "request_id": "uuid|null",
  "error_code": "PRICE_MISSING|PAYMENT_FAILURE|...",
  "user_id": "optional",
  "product_id": "optional",
  "action": "create_order",
  "status": "success|failure",
  "app_version": "semver",
  "attrs": { "custom": "fields" }
}
```

### Trace Format

Uses OpenTelemetry standard (OTLP protocol). See `docs/otel-contract.md` (TODO).

### Alert Event Format

Published to Kafka topic `stacklens-alerts` and WebSocket:

```json
{
  "id": "alert-uuid",
  "issue_code": "PRICE_MISSING",
  "severity": "error|warn|info",
  "message": "Product price is null or missing",
  "suggested_fix": "Check inventory service response",
  "confidence": 0.95,
  "automation_possible": true,
  "automation_action": "retry_with_fallback_price",
  "related_trace_id": "hex32",
  "related_logs": ["doc-id-1", "doc-id-2"],
  "created_at": "2025-01-15T10:31:00Z",
  "created_by": "system"
}
```

## Kafka Topics

| Topic | Purpose | Partitions | Retention |
|-------|---------|-----------|-----------|
| `otel-logs` | Raw logs from collector | 3 | 7 days |
| `otel-traces` | Raw traces from collector | 3 | 7 days |
| `stacklens-enriched` | Parsed & enriched logs | 3 | 3 days |
| `stacklens-alerts` | Alert events | 1 | 30 days |

## Environment Variables

### OTLP Collector

```bash
# docker-compose sets these defaults
GOGC=80                        # Garbage collection target
```

### StackLens Services

```bash
KAFKA_BROKERS=kafka:29092
KAFKA_TOPICS=otel-logs,otel-traces
ELASTICSEARCH_URL=http://elasticsearch:9200
POSTGRES_URL=postgresql://stacklens:stacklens_dev@postgres:5432/stacklens
OTEL_COLLECTOR_URL=http://otel-collector:4318
LOG_LEVEL=debug
```

## Common Commands

```bash
# Navigate to compose directory
cd infra/compose

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View specific service logs
docker-compose logs -f otel-collector
docker-compose logs -f stacklens-consumer

# Execute commands in containers
docker-compose exec postgres psql -U stacklens -d stacklens -c "SELECT * FROM alerts;"
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Rebuild services
docker-compose build stacklens-consumer

# Clean up volumes (careful!)
docker-compose down -v
```

## Accessing Services

| Service | URL | Port |
|---------|-----|------|
| OTLP Collector (HTTP) | http://localhost:4318 | 4318 |
| OTLP Collector (gRPC) | http://localhost:4317 | 4317 |
| Kibana | http://localhost:5601 | 5601 |
| Jaeger | http://localhost:16686 | 16686 |
| Elasticsearch | http://localhost:9200 | 9200 |
| Kafka | localhost:9092 | 9092 |
| PostgreSQL | localhost:5432 | 5432 |
| Redis | localhost:6379 | 6379 |
| StackLens API | http://localhost:3001 | 3001 |
| StackLens Consumer (health) | http://localhost:8001 | 8001 |

## Testing

### Phase 0: Infrastructure Health Check

```bash
# Run docker-compose health checks
docker-compose ps

# Should show all services as "healthy" or "running"
```

### Phase 1: Collector Smoke Test (TODO)

```bash
# Test OTLP POST
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d @sample-log.json

# Verify exported to Kafka
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic otel-logs \
  --from-beginning \
  --max-messages 1
```

## Security Considerations

- **PII Redaction**: Configured in collector (removes `password`, `token`, `api_key`, `credit_card`, `ssn`)
- **Secrets Management**: Use env vars for local dev; use Vault/K8s secrets for prod
- **TLS**: Configure for production (OTLP HTTPS, Kafka SSL, Elasticsearch TLS)
- **Authentication**: PostgreSQL, Elasticsearch, Kafka can be hardened with auth
- **Sampling**: Set `probabilistic_sampler` to <100% in production

## Troubleshooting

### Collector not receiving logs

```bash
# Check collector logs
docker-compose logs otel-collector | grep -i error

# Verify health endpoint
curl http://localhost:13133/healthz

# Check OTLP endpoint is listening
curl -v http://localhost:4318/v1/logs
```

### Kafka not consuming messages

```bash
# Check Kafka is running
docker-compose logs kafka | head -20

# Verify Zookeeper is up
docker-compose logs zookeeper | head -20

# Check topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Elasticsearch not indexing

```bash
# Check ES health
curl http://localhost:9200/_cluster/health?pretty

# Check indices
curl http://localhost:9200/_cat/indices

# View logs
docker-compose logs elasticsearch | grep -i error
```

## Next Steps

1. **Phase 1**: Implement SDK examples (JS and Node)
2. **Phase 2**: Build consumer service (parser + enricher)
3. **Phase 3**: Implement analyzer + alert rules
4. **Phase 4**: Build Admin UI + Jira integration
5. **Phase 5**: Harden for production + ML pipeline

## References

- [OpenTelemetry Spec](https://opentelemetry.io/docs/reference/specification/)
- [Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)
- [Elasticsearch Indexing](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-mgmt-best-practices.html)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)
- [Jaeger Sampling](https://www.jaegertracing.io/docs/sampling/)

## File Structure

```
.
├── infra/
│   └── compose/
│       └── docker-compose.yml          # Local staging
├── collector/
│   └── otel-collector-config.yaml      # OTLP config
├── stacklens/
│   ├── ingest/
│   │   └── schema/
│   │       └── log_schema.json         # Data contract
│   ├── consumer/                       # Parser/Enricher (TODO)
│   ├── alerts/
│   │   └── migrations/                 # Postgres schema (TODO)
│   └── frontend/                       # Admin UI (TODO)
├── config/
│   └── rules/
│       └── alert-rules.json            # Alert rules
├── sdk-examples/
│   ├── js/                             # Web SDK (TODO)
│   └── node/                           # Node SDK (TODO)
└── docs/
    ├── architecture.md                 # This file
    ├── otel-contract.md                # Trace schema (TODO)
    ├── runbook.md                      # Operations (TODO)
    └── README.md                       # Main README (TODO)
```

---

**Branch**: `feature/otel-pipeline`  
**Last Updated**: 2025-01-15  
**Status**: Phase 0 Complete ✅
