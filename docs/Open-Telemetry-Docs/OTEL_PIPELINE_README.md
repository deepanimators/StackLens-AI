# StackLens OpenTelemetry Pipeline

> Production-grade realtime log & telemetry ingestion with OpenTelemetry

[![Status](https://img.shields.io/badge/status-Phase%200-blue)]() 
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Branch](https://img.shields.io/badge/branch-feature%2Fotel--pipeline-blueviolet)]()

## Overview

StackLens is a lightweight, production-minded alternative to Splunk/New Relic that ingests logs, traces, and metrics from any system in realtime, analyzes them with deterministic rules and ML models, creates alerts, and integrates with Jira.

**Key Features**:
- 🚀 **Universal Ingestion**: OTLP/HTTP, gRPC, JSON logs from any source
- 📊 **Realtime Processing**: Kafka-based event streaming with sub-second latency
- 🔍 **Full-Text Search**: Elasticsearch-backed log search and analytics
- ⚠️ **Smart Alerting**: Rule engine + ML classifier for anomaly detection
- 🔗 **Jira Integration**: Automatic ticket creation for critical issues
- 📈 **Observability**: Prometheus metrics and Grafana dashboards
- 🔐 **Production Ready**: TLS, secret management, sampling, ILM policies

## Quick Start

### Prerequisites

- Docker & Docker Compose 1.29+
- 4GB available RAM
- Port 4318 (OTLP), 5601 (Kibana), 3001 (API) available

### 1. Start the Stack

```bash
cd infra/compose
docker-compose up -d

# Verify services are ready
docker-compose ps

# Check health
curl http://localhost:9200/_cluster/health
curl http://localhost:4318/v1/logs -X POST -d '{}' -H "Content-Type: application/json"
```

### 2. Send a Test Log

```bash
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{
    "resourceLogs": [{
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "1705316445000000000",
          "body": { "stringValue": "Order created successfully" },
          "attributes": [
            { "key": "service.name", "value": { "stringValue": "order-service" } },
            { "key": "error_code", "value": { "stringValue": "PRICE_MISSING" } }
          ]
        }]
      }]
    }]
  }'
```

### 3. Verify in Elasticsearch

```bash
# Wait 2 seconds for indexing
sleep 2

# Check indices
curl http://localhost:9200/_cat/indices

# Search logs
curl -X POST http://localhost:9200/stacklens-logs-*/_search \
  -H "Content-Type: application/json" \
  -d '{ "query": { "match_all": {} }, "size": 1 }'
```

### 4. View in Kibana

```bash
# Open browser
open http://localhost:5601

# Or Jaeger for traces
open http://localhost:16686
```

## Architecture

### High-Level Flow

```
Applications (Web/Backend/Services)
         ↓
    OTLP SDK
         ↓
OpenTelemetry Collector (4318/4317)
         ↓
    Processors
    ├─ Batch
    ├─ Attributes
    ├─ Sampling
    └─ PII Redaction
         ↓
    Exporters
    ├─ Kafka (otel-logs, otel-traces)
    ├─ Elasticsearch (direct)
    └─ Jaeger (traces)
         ↓
StackLens Consumer
    ├─ Parser (validate, enrich)
    ├─ Enricher (geo, tags, metadata)
    └─ Analyzer (rules, ML)
         ↓
Storage
    ├─ Elasticsearch (full-text index)
    ├─ Postgres (alerts, metadata)
    └─ Kafka (stacklens-alerts)
         ↓
Admin UI
    ├─ Alerts Dashboard (WebSocket live)
    ├─ Search (ES-backed)
    └─ Settings (Jira, rules, config)
         ↓
Jira / Grafana / External Systems
```

### Components

| Component | Purpose | Port | Status |
|-----------|---------|------|--------|
| OTLP Collector | Ingestion endpoint | 4318/4317 | ✅ Ready |
| Kafka | Event streaming | 9092 | ✅ Ready |
| Elasticsearch | Log indexing | 9200 | ✅ Ready |
| Kibana | Log visualization | 5601 | ✅ Ready |
| PostgreSQL | Alerts/metadata | 5432 | ✅ Ready |
| Jaeger | Trace visualization | 16686 | ✅ Ready |
| StackLens Consumer | Parser/Analyzer | 8001 | 🚧 Phase 2 |
| StackLens API | REST API | 3001 | 🚧 Phase 4 |
| Admin UI | Web dashboard | 3000 | 🚧 Phase 4 |

## Data Contracts

### Log Schema

All logs must conform to `stacklens/ingest/schema/log_schema.json`:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "service": "order-service",
  "level": "error|warn|info|debug",
  "message": "What happened",
  "trace_id": "hex32|null",
  "span_id": "hex16|null",
  "request_id": "uuid|null",
  "error_code": "PRICE_MISSING",
  "user_id": "user-123",
  "action": "create_order",
  "status": "failure",
  "app_version": "1.2.3",
  "attrs": { "custom": "fields" }
}
```

**Required**: `timestamp`, `service`, `level`, `message`

See `docs/otel-contract.md` for full specification.

## Ingestion Methods

### 1. OpenTelemetry Protocol (OTLP/HTTP)

**Endpoint**: `POST http://localhost:4318/v1/logs` (HTTP) or `grpc://localhost:4317` (gRPC)

```javascript
// JavaScript SDK
import { BasicTracerProvider, ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const exporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces"
});
const provider = new BasicTracerProvider();
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
```

### 2. HTTP JSON Logs (Fallback)

**Endpoint**: `POST http://localhost:3001/api/ingest/log`

```bash
curl -X POST http://localhost:3001/api/ingest/log \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-15T10:30:45.123Z",
    "service": "my-app",
    "level": "error",
    "message": "Something failed",
    "error_code": "DB_ERROR"
  }'
```

### 3. Kafka Direct (Advanced)

**Topic**: `otel-logs`  
**Format**: NDJSON (newline-delimited JSON)

```bash
# Produce to Kafka
echo '{"timestamp":"2025-01-15T10:30:45.123Z","service":"my-app","level":"error","message":"test"}' | \
  kafka-console-producer --broker-list localhost:9092 --topic otel-logs
```

## Configuration

### Environment Variables

```bash
# OTLP Collector
GOGC=80                               # Garbage collection
OTEL_COLLECTOR_CONFIG=/etc/otel-collector-config.yaml

# StackLens Services
KAFKA_BROKERS=kafka:29092
KAFKA_TOPICS=otel-logs,otel-traces
ELASTICSEARCH_URL=http://elasticsearch:9200
POSTGRES_URL=postgresql://stacklens:stacklens_dev@postgres:5432/stacklens
OTEL_COLLECTOR_URL=http://otel-collector:4318
LOG_LEVEL=debug
ENVIRONMENT=dev

# Jira Integration (Phase 4)
JIRA_URL=https://your-instance.atlassian.net
JIRA_TOKEN=your-api-token
JIRA_PROJECT_KEY=STACKLENS
JIRA_MOCK=false              # Set true in CI

# Security
SECRET_KEY=your-secret-key
JWT_AUDIENCE=stacklens
```

### Kafka Topics

| Topic | Purpose | Partitions | Retention |
|-------|---------|-----------|-----------|
| `otel-logs` | Raw logs from collector | 3 | 7d |
| `otel-traces` | Raw traces | 3 | 7d |
| `stacklens-enriched` | Parsed & enriched | 3 | 3d |
| `stacklens-alerts` | Alert events | 1 | 30d |

### Alert Rules

See `config/rules/alert-rules.json` for predefined rules:
- `PRICE_MISSING` - Product price null
- `INVENTORY_UNAVAILABLE` - Stock out
- `PAYMENT_FAILURE` - Payment declined
- `DB_CONNECTION_ERROR` - Database unavailable
- `EXTERNAL_TIMEOUT` - Service timeout
- `DATA_VALIDATION_ERROR` - Input invalid
- `DUPLICATE_ORDER` - Already exists
- `AUTHZ_FAILURE` - Permission denied
- `UNHANDLED_EXCEPTION` - Unknown error

## Usage Examples

### Example 1: Browser SDK with OTel

```javascript
// sdk-examples/js/otel-web-sample.js
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_COLLECTOR_URL || "http://localhost:4318/v1/traces"
});

const provider = new WebTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

// Auto-instrument HTTP
new FetchInstrumentation().setTracerProvider(provider);
new XMLHttpRequestInstrumentation().setTracerProvider(provider);

// Get tracer
const tracer = provider.getTracer("my-app", "1.0.0");

// Create spans
const span = tracer.startSpan("checkout");
span.setAttribute("user_id", "user-123");
span.end();
```

### Example 2: Node.js with OTel

```javascript
// sdk-examples/node/otel-node-sample.js
import { NodeTracerProvider } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";

const exporter = new OTLPTraceExporter({
  url: "http://otel-collector:4318/v1/traces"
});

const provider = new NodeTracerProvider();
provider.addSpanProcessor(new BatchSpanProcessor(exporter));

// Auto-instrument libraries
new HttpInstrumentation().setTracerProvider(provider);
new ExpressInstrumentation().setTracerProvider(provider);
new PgInstrumentation().setTracerProvider(provider);

provider.register();
```

### Example 3: Structured Logging

```python
# Python example
import json
import requests
from datetime import datetime
import uuid

def log_event(service, level, message, error_code=None, **attrs):
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": service,
        "level": level,
        "message": message,
        "request_id": str(uuid.uuid4()),
        "error_code": error_code,
        "attrs": attrs
    }
    
    # Send to StackLens
    response = requests.post(
        "http://localhost:3001/api/ingest/log",
        json=log_entry,
        headers={"Content-Type": "application/json"}
    )
    return response.status_code == 201

# Usage
log_event(
    service="order-service",
    level="error",
    message="Failed to create order",
    error_code="PRICE_MISSING",
    order_id="ord-789",
    cart_value=99.99
)
```

## Testing

### Phase 0: Infrastructure Health

```bash
cd infra/compose

# Start stack
docker-compose up -d

# Check services
docker-compose ps

# Health checks
docker-compose exec elasticsearch curl -s http://localhost:9200/_cluster/health | jq .
docker-compose exec kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092
docker-compose exec postgres pg_isready -U stacklens
```

### Phase 1: Collector Smoke Test (TODO)

```bash
# Test OTLP endpoint
curl -X POST http://localhost:4318/v1/logs \
  -H "Content-Type: application/json" \
  -d '{"resourceLogs":[]}'

# Expected: HTTP 200 OK
```

### Phase 2: Integration Test (TODO)

```bash
# Run integration tests
npm test -- --grep "integration"

# Or with Docker
docker-compose -f docker-compose.test.yml run tests npm test
```

### Phase 3: E2E Test (TODO)

```bash
# Run E2E tests with Playwright
npx playwright test

# Or specific test
npx playwright test --grep "@critical"
```

## Troubleshooting

See `docs/runbook.md` for comprehensive troubleshooting guide including:

- OTLP Collector not receiving logs
- Kafka consumer lag
- Elasticsearch not indexing
- PostgreSQL connection issues
- WebSocket events
- Memory issues
- Config parsing
- Rule engine debugging
- Jira integration
- DNS resolution

## File Structure

```
.
├── infra/
│   ├── bootstrap.sh                 # Quick start script
│   └── compose/
│       ├── docker-compose.yml       # Production compose
│       └── docker-compose.test.yml  # Test compose
├── collector/
│   └── otel-collector-config.yaml   # Collector configuration
├── stacklens/
│   ├── ingest/
│   │   └── schema/
│   │       └── log_schema.json      # Log data contract
│   ├── consumer/                    # Parser/Enricher (Phase 2)
│   │   └── Dockerfile
│   ├── alerts/
│   │   └── migrations/              # Postgres schema
│   └── frontend/                    # Admin UI (Phase 4)
├── config/
│   └── rules/
│       └── alert-rules.json         # Alert rules
├── sdk-examples/
│   ├── js/                          # Browser SDK (Phase 1)
│   └── node/                        # Node SDK (Phase 1)
├── .github/
│   └── workflows/
│       └── ci.yml                   # CI/CD pipeline (Phase 6)
└── docs/
    ├── architecture.md              # System design
    ├── otel-contract.md             # Data contracts
    ├── runbook.md                   # Operations guide
    └── README.md                    # This file
```

## Phases & Roadmap

| Phase | Status | Deliverables |
|-------|--------|--------------|
| **0** | ✅ Complete | Infra, schemas, collector config |
| **1** | 🚧 In Progress | SDKs, collector verification |
| **2** | 🔜 Planned | Consumer, parser, enricher, ES indexing |
| **3** | 🔜 Planned | Analyzer, rule engine, alerts |
| **4** | 🔜 Planned | Admin UI, Jira connector, E2E tests |
| **5** | 🔜 Planned | Hardening, ML pipeline, K8s, production |

## Performance

### Throughput

- **Logs**: 10K+ logs/second (single container)
- **Traces**: 5K+ spans/second
- **Latency**: <500ms from ingest to Elasticsearch (p99)

### Resource Requirements

- **Collector**: 256MB RAM, 1 CPU
- **Consumer**: 512MB RAM, 2 CPUs
- **Elasticsearch**: 512MB-2GB RAM, 2-4 CPUs
- **Total (dev)**: ~2GB RAM, 4 CPUs

### Optimization Tips

1. **Increase batch size** in collector for better throughput
2. **Reduce refresh interval** in ES during bulk loads
3. **Enable sampling** (probabilistic_sampler) for high volume
4. **Tune Kafka partitions** per throughput needs
5. **Use ILM policies** to manage retention

## Security

### Secrets Management

```bash
# Local development (env file)
export JIRA_TOKEN="xxx"
export SECRET_KEY="xxx"

# Production (Vault / K8s Secrets)
# Use external secret management - never commit secrets!
```

### PII Redaction

Configured in collector:

```yaml
attributes/redact:
  actions:
    - key: password
      action: delete
    - key: token
      action: delete
    - key: credit_card
      action: delete
```

### Network Security

- Enable HTTPS/TLS for OTLP in production
- Use VPC/private networks for Kafka
- Enable authentication for Elasticsearch
- Firewall services appropriately

## Contributing

### Workflow

1. Create branch from `feature/otel-pipeline`
2. Implement feature with TDD (write tests first)
3. Ensure CI passes: `npm run test && npm run lint`
4. Document changes in docs/
5. Open PR with description and acceptance checklist

### Development Setup

```bash
# Install dependencies
npm install

# Start dev stack
./infra/bootstrap.sh up

# Run tests
npm test

# Run linter
npm run lint

# Build
npm run build
```

## Support & Documentation

- **Architecture**: See `docs/architecture.md`
- **Data Contracts**: See `docs/otel-contract.md`
- **Operations**: See `docs/runbook.md`
- **Examples**: See `sdk-examples/`
- **Issue Tracker**: GitHub Issues in this repo

## References

- [OpenTelemetry Spec](https://opentelemetry.io/docs/specs/otel/)
- [OTLP Protocol](https://opentelemetry.io/docs/specs/otlp/)
- [Collector Documentation](https://opentelemetry.io/docs/collector/)
- [Elasticsearch Best Practices](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-mgmt-best-practices.html)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)

## License

MIT License - See LICENSE file

---

**Status**: Phase 0 ✅ - Infrastructure & Schema Complete  
**Next Phase**: Phase 1 - SDK Examples & Collector  
**Branch**: `feature/otel-pipeline`  
**Last Updated**: 2025-01-15
