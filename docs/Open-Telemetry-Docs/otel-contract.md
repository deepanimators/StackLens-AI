# OpenTelemetry Data Contract

## Overview

This document defines the standard data formats and protocols for StackLens ingestion:
1. **Logs** - Structured log ingestion (JSON)
2. **Traces** - Distributed tracing (OTLP)
3. **Metrics** - Telemetry metrics (OTLP)

## Log Schema

See `stacklens/ingest/schema/log_schema.json` for the complete JSON Schema.

### Core Fields (Required)

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | ISO8601 | When the log was generated |
| `service` | string | Service/app name |
| `level` | enum | debug, info, warn, error, fatal |
| `message` | string | Main log message |

### Correlation Fields (Optional but Recommended)

| Field | Type | Description |
|-------|------|-------------|
| `trace_id` | hex(32) | OTel trace ID for correlation |
| `span_id` | hex(16) | OTel span ID |
| `request_id` | uuid | Cross-service request ID |

### Structured Fields (Optional)

| Field | Type | Description |
|-------|------|-------------|
| `error_code` | string | App-specific error code (e.g., PRICE_MISSING) |
| `user_id` | string/int | User associated with log |
| `product_id` | string/int | Product/resource ID |
| `action` | string | User action (e.g., create_order) |
| `status` | enum | success, failure, partial, pending |
| `app_version` | semver | Application version |
| `attrs` | object | Custom structured attributes |
| `stacktrace` | string | Full stack trace for errors |
| `duration_ms` | number | Operation duration |
| `http_method` | enum | GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS |
| `http_status_code` | int | HTTP response code |
| `http_url` | uri | Request URL |
| `ip_address` | string | Client IP |
| `user_agent` | string | Browser/client agent |
| `cost_center` | string | For billing |
| `team` | string | Owning team |

### Example Log Entry

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "trace_id": "abcdef0123456789abcdef0123456789",
  "span_id": "0123456789abcdef",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "service": "order-service",
  "env": "prod",
  "level": "error",
  "message": "Failed to process order: price is null",
  "error_code": "PRICE_MISSING",
  "user_id": "user-123",
  "product_id": "prod-456",
  "action": "create_order",
  "status": "failure",
  "app_version": "1.2.3",
  "attrs": {
    "order_id": "ord-789",
    "items_count": 3,
    "cart_value": 99.99
  },
  "http_method": "POST",
  "http_status_code": 400,
  "http_url": "https://api.example.com/orders",
  "duration_ms": 245,
  "stacktrace": "Error: Price is null\n  at createOrder (order.ts:45:12)\n..."
}
```

## OTLP Trace Format

StackLens accepts traces via OpenTelemetry Protocol (OTLP):

### Endpoints

- **HTTP/JSON**: `POST http://collector:4318/v1/traces`
- **gRPC**: `grpc://collector:4317` + `opentelemetry.proto.collector.trace.v1.TraceService`

### Trace Structure

```protobuf
ResourceSpans {
  resource: Resource {
    attributes: {
      "service.name": "my-service",
      "service.version": "1.0.0",
      "deployment.environment": "prod"
    }
  }
  instrumentation_scope_spans: [
    InstrumentationScopeSpans {
      scope: InstrumentationScope {
        name: "my-instrumentation",
        version: "1.0.0"
      }
      spans: [
        Span {
          trace_id: bytes(16),
          span_id: bytes(8),
          parent_span_id: bytes(8),
          name: "HTTP GET /orders",
          kind: SPAN_KIND_SERVER,
          start_time_unix_nano: uint64,
          end_time_unix_nano: uint64,
          attributes: {
            "http.method": "GET",
            "http.url": "https://api.example.com/orders",
            "http.status_code": 200,
            "span.kind": "server"
          },
          status: {
            code: STATUS_CODE_OK
          }
        }
      ]
    }
  ]
}
```

### Key Trace Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `service.name` | string | Service identifier |
| `service.version` | string | Service version |
| `deployment.environment` | string | prod, staging, dev |
| `http.method` | string | HTTP verb |
| `http.url` | string | Request URL |
| `http.status_code` | int | Response code |
| `http.client_ip` | string | Caller IP |
| `db.system` | string | postgres, mysql, redis |
| `db.operation` | string | SELECT, INSERT, UPDATE |
| `rpc.service` | string | Service being called |
| `messaging.system` | string | kafka, rabbitmq, sqs |
| `error.type` | string | Error class/type |

### Example Trace (JSON)

```json
{
  "resourceSpans": [
    {
      "resource": {
        "attributes": [
          {
            "key": "service.name",
            "value": { "stringValue": "order-service" }
          },
          {
            "key": "service.version",
            "value": { "stringValue": "1.2.3" }
          },
          {
            "key": "deployment.environment",
            "value": { "stringValue": "prod" }
          }
        ]
      },
      "scopeSpans": [
        {
          "scope": {
            "name": "@opentelemetry/instrumentation-http",
            "version": "0.45.0"
          },
          "spans": [
            {
              "traceId": "abcdef0123456789abcdef0123456789",
              "spanId": "0123456789abcdef",
              "name": "POST /orders",
              "kind": 2,
              "startTimeUnixNano": "1705316445000000000",
              "endTimeUnixNano": "1705316445245000000",
              "attributes": [
                { "key": "http.method", "value": { "stringValue": "POST" } },
                { "key": "http.url", "value": { "stringValue": "http://localhost:3000/orders" } },
                { "key": "http.status_code", "value": { "intValue": 201 } },
                { "key": "http.duration_ms", "value": { "doubleValue": 245 } }
              ],
              "status": { "code": 0 }
            }
          ]
        }
      ]
    }
  ]
}
```

## OTLP Metrics Format

### Metric Types

| Type | Description | Example |
|------|-------------|---------|
| Counter | Monotonically increasing | `ingest_count`, `requests_total` |
| Gauge | Current value | `active_connections`, `memory_usage_bytes` |
| Histogram | Value distribution | `request_latency_ms`, `response_size_bytes` |
| Summary | Percentile distribution | `query_duration_ms` (p50, p90, p99) |

### Key Metrics

**StackLens Internal Metrics** (should be exported by all components):

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| `stacklens.ingest.rate` | Counter | messages/sec | Ingestion rate |
| `stacklens.ingest.latency` | Histogram | ms | Time from receipt to index |
| `stacklens.kafka.lag` | Gauge | messages | Consumer lag |
| `stacklens.alerts.created` | Counter | alerts | Alerts created |
| `stacklens.elasticsearch.index_latency` | Histogram | ms | ES indexing time |
| `stacklens.jira.api_calls` | Counter | calls | Jira API calls |
| `stacklens.jira.api_latency` | Histogram | ms | Jira API latency |
| `stacklens.parser.validation_errors` | Counter | errors | Schema validation failures |
| `stacklens.enricher.processing_time` | Histogram | ms | Enrichment time |
| `stacklens.analyzer.rule_matches` | Counter | matches | Rule matches |
| `stacklens.analyzer.ml_inference_time` | Histogram | ms | ML model inference |

### Example Metrics (JSON)

```json
{
  "resourceMetrics": [
    {
      "resource": {
        "attributes": [
          { "key": "service.name", "value": { "stringValue": "stacklens-consumer" } }
        ]
      },
      "scopeMetrics": [
        {
          "scope": {
            "name": "stacklens-consumer",
            "version": "1.0.0"
          },
          "metrics": [
            {
              "name": "stacklens.ingest.rate",
              "description": "Number of logs ingested per second",
              "unit": "1",
              "gauge": {
                "dataPoints": [
                  {
                    "attributes": [
                      { "key": "service", "value": { "stringValue": "order-service" } }
                    ],
                    "timeUnixNano": "1705316445000000000",
                    "asDouble": 1234.5
                  }
                ]
              }
            },
            {
              "name": "stacklens.ingest.latency",
              "description": "Time from receipt to index (milliseconds)",
              "unit": "ms",
              "histogram": {
                "dataPoints": [
                  {
                    "attributes": [
                      { "key": "service", "value": { "stringValue": "order-service" } }
                    ],
                    "timeUnixNano": "1705316445000000000",
                    "count": 1000,
                    "sum": 245000,
                    "bucketCounts": [10, 50, 200, 400, 250, 90],
                    "explicitBounds": [1, 5, 10, 50, 100]
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## Ingestion Endpoints

### HTTP Log Ingestion (Fallback)

**Endpoint**: `POST /api/ingest/log`  
**Content-Type**: `application/json`  
**Batch Support**: Yes (array of logs)

```bash
# Single log
curl -X POST http://localhost:3001/api/ingest/log \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-15T10:30:45.123Z",
    "service": "my-app",
    "level": "error",
    "message": "Something went wrong"
  }'

# Batch (array)
curl -X POST http://localhost:3001/api/ingest/log \
  -H "Content-Type: application/json" \
  -d '[
    { "timestamp": "...", "service": "...", "level": "...", "message": "..." },
    { "timestamp": "...", "service": "...", "level": "...", "message": "..." }
  ]'
```

**Response (201 Created)**:
```json
{
  "status": "success",
  "count": 1,
  "message": "Log(s) accepted"
}
```

### OTLP HTTP Ingestion

**Endpoint**: `POST http://localhost:4318/v1/logs`  
**Protocol**: OpenTelemetry Protocol (OTLP)

See [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/).

## Message Formats (Kafka Topics)

### Topic: `otel-logs`

Raw log entries from collector. Format: NDJSON (newline-delimited JSON)

```
{"timestamp":"...","service":"...","level":"...","message":"...","trace_id":"..."}
{"timestamp":"...","service":"...","level":"...","message":"...","trace_id":"..."}
```

### Topic: `otel-traces`

Raw trace spans from collector. Format: OTLP JSON

```json
{
  "resourceSpans": [
    { "resource": {...}, "scopeSpans": [...] }
  ]
}
```

### Topic: `stacklens-enriched`

Parsed, validated, and enriched logs (post-consumer). Same structure as `stacklens/ingest/schema/log_schema.json` plus enrichment metadata:

```json
{
  "...log_fields...",
  "_enriched": {
    "geo": { "country": "US", "city": "San Francisco" },
    "parsed_error_code": "PRICE_MISSING",
    "fingerprint": "abc123def456",
    "cost_center": "sales-team",
    "team_owner": "platform"
  },
  "_indexed": {
    "es_index": "stacklens-logs-2025.01.15",
    "es_doc_id": "doc-xyz-123",
    "indexed_at": "2025-01-15T10:30:46.000Z"
  }
}
```

### Topic: `stacklens-alerts`

Alert events (post-analyzer). Format: JSON

```json
{
  "id": "alert-550e8400-e29b-41d4-a716-446655440000",
  "issue_code": "PRICE_MISSING",
  "severity": "error",
  "title": "Price Missing",
  "message": "Product price is null or missing during order creation",
  "suggested_fix": "Check inventory service response; ensure price is set before order submission",
  "automation_possible": true,
  "automation_action": "retry_with_fallback_price",
  "confidence": 0.95,
  "matched_rules": ["PRICE_MISSING", "DATA_VALIDATION_ERROR"],
  "related_logs": [
    {
      "trace_id": "abcdef0123456789abcdef0123456789",
      "request_id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2025-01-15T10:30:45.123Z",
      "es_doc_id": "doc-xyz-123"
    }
  ],
  "jira_issue_key": null,
  "status": "open",
  "created_at": "2025-01-15T10:30:46.000Z",
  "created_by": "system",
  "tags": ["critical", "order-service", "price-validation"]
}
```

## Validation Rules

### Log Validation

1. **Schema Validation**: Must conform to `stacklens/ingest/schema/log_schema.json`
2. **Timestamp**: Must be valid ISO8601; if missing, use current time
3. **Service**: Required; alphanumeric + underscore/hyphen only
4. **Level**: Must be one of: debug, info, warn, error, fatal
5. **Message**: Required; non-empty string
6. **IDs**: trace_id & span_id must be valid hex if provided
7. **Semver**: app_version must be valid semantic version

### Trace Validation

1. **Resource Attributes**: service.name required
2. **Span Fields**: trace_id, span_id, name required
3. **Timestamps**: start_time <= end_time
4. **Status**: Must be valid code (OK, ERROR, UNSET)

## Sampling & Filtering

### Collector-Level Sampling

Configured in `collector/otel-collector-config.yaml`:

```yaml
probabilistic_sampler:
  sampling_percentage: 100  # Keep all in dev; use 10% in prod for scale
```

### Consumer-Level Filtering

The consumer can apply additional filters per service/environment:

```json
{
  "filters": [
    {
      "service": "vendor-library",
      "level": "debug",
      "action": "drop"
    },
    {
      "error_code": "RATE_LIMIT",
      "service": "*",
      "action": "sample_10_percent"
    }
  ]
}
```

## Error Codes

Standard error codes used across StackLens:

| Code | Severity | Category | Description |
|------|----------|----------|-------------|
| PRICE_MISSING | error | Data | Product price null/missing |
| INVENTORY_UNAVAILABLE | warn | Business | Stock unavailable |
| PAYMENT_FAILURE | error | Payment | Payment gateway rejected |
| DB_CONNECTION_ERROR | error | Infrastructure | Database unreachable |
| EXTERNAL_TIMEOUT | warn | Integration | External service timeout |
| DATA_VALIDATION_ERROR | warn | Data | Input validation failed |
| DUPLICATE_ORDER | info | Business | Order already exists |
| AUTHZ_FAILURE | warn | Security | Permission denied |
| UNHANDLED_EXCEPTION | error | Application | Unknown error |

## Environment Values

Valid values for `env` field:

| Value | Purpose |
|-------|---------|
| `prod` | Production |
| `staging` | Staging/UAT |
| `dev` | Development |
| `test` | Automated tests |

## HTTP Status Codes

StackLens endpoints use standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 202 | Accepted - Request accepted (async) |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Auth required |
| 403 | Forbidden - Permission denied |
| 404 | Not Found - Resource not found |
| 422 | Unprocessable Entity - Schema validation failed |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## References

- [OpenTelemetry Data Model](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)
- [JSON Schema Spec](https://json-schema.org/)
- [Kafka Protocol](https://kafka.apache.org/protocol.html)
- [Elasticsearch Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-15
