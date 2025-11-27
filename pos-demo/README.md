# POS Demo App

A production-minded POS demo application built with React, Node.js, and OpenTelemetry.

## Features

- **POS UI**: Product list, checkout, and order management.
- **Backend API**: Express.js with TypeScript, structured logging, and error handling.
- **Observability**: OpenTelemetry instrumentation for traces and structured JSON logs.
- **Scenarios**: Built-in triggers for common error scenarios (Price Missing, Inventory Unavailable, etc.).
- **Docker**: Full stack containerization with Docker Compose.

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd pos-demo
   ```

2. **Run with Docker Compose**
   ```bash
   cd docker
   docker-compose up --build
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000
   - Jaeger UI: http://localhost:16686

3. **Run Locally (Dev Mode)**

   **Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## StackLens Integration

### Logs
The application writes structured JSON logs to `pos-demo/backend/logs/app.log`.
Configure Filebeat or Fluent Bit to tail this file and forward to StackLens.

Example Filebeat input:
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /path/to/pos-demo/backend/logs/app.log
  json.keys_under_root: true
  json.add_error_key: true
```

### Traces
OpenTelemetry traces are exported via OTLP/HTTP to `http://localhost:4318/v1/traces`.
Set `OTEL_COLLECTOR_URL` environment variable to point to your collector.

## Testing

**Backend Tests:**
```bash
cd backend
npm test
```

**E2E Tests:**
(Requires Playwright setup)
```bash
npx playwright test
```

## Error Scenarios

Trigger these scenarios via the Frontend Checkout UI by selecting the corresponding User ID:

- **Price Missing**: Seed a product with no price, then try to order it.
- **Inventory Unavailable**: Order more quantity than available stock.
- **Payment Failure**: Select User ID `user_payment_fail`.
- **DB Connection Error**: Select User ID `user_db_fail`.
- **External Timeout**: Select User ID `user_timeout`.
