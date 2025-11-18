# OpenTelemetry Log Contract (Schema v1)

All logs ingested into StackLens must adhere to this schema.

## Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `timestamp` | string (ISO8601) | Yes | Time of the event. |
| `trace_id` | string (hex) | No | OpenTelemetry Trace ID. |
| `span_id` | string (hex) | No | OpenTelemetry Span ID. |
| `request_id` | string (UUID) | Yes | Unique request identifier. |
| `service` | string | Yes | Service name (e.g., `pos-backend`). |
| `env` | string | Yes | Environment (`prod`, `staging`, `dev`). |
| `level` | string | Yes | Log level (`info`, `warn`, `error`, `debug`). |
| `message` | string | Yes | Human-readable log message. |
| `error_code` | string | No | Specific error code (e.g., `PRICE_MISSING`). |
| `user_id` | string | No | User identifier. |
| `product_id` | string | No | Product identifier. |
| `action` | string | No | Action being performed. |
| `status` | string | No | Outcome status. |
| `app_version` | string | No | Application version. |
| `attrs` | object | No | Additional structured attributes. |

## Example JSON

```json
{
  "timestamp": "2023-10-27T10:00:00.000Z",
  "trace_id": "5b8aa5a2d2c872e9",
  "span_id": "5152152556",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "service": "pos-backend",
  "env": "prod",
  "level": "error",
  "message": "Failed to process order",
  "error_code": "PRICE_MISSING",
  "user_id": "u_123",
  "action": "create_order",
  "app_version": "1.0.0"
}
```
