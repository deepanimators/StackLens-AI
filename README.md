# StackLens & OpenTelemetry Pipeline

A production-grade OpenTelemetry pipeline for ingesting, processing, and analyzing logs and traces.

## Architecture

`Client SDK -> OTel Collector -> Kafka -> StackLens Consumer -> Elasticsearch/Postgres -> Analyzer -> Alerts`

## Components

- **OTel Collector**: Receives OTLP data, exports to Kafka.
- **Kafka**: Message bus for decoupling ingest and processing.
- **StackLens Backend**:
  - **Ingest API**: `POST /api/ingest/log`
  - **Consumer**: Reads from Kafka, enriches, indexes to ES.
  - **Analyzer**: Rule engine for detecting errors.
  - **Alerting**: WebSocket server for real-time alerts.
- **StackLens Frontend**: React Admin UI for viewing alerts.

## Quick Start

1. **Start Infrastructure**
   ```bash
   cd infra
   docker-compose up -d
   ```

2. **Start Backend**
   ```bash
   cd stacklens/backend
   npm install
   npm run build
   npm start
   ```

3. **Start Frontend**
   ```bash
   cd stacklens/frontend
   npm install
   npm run dev
   ```

4. **Run SDK Examples**
   - **Node**: `node sdk-examples/node/index.js`
   - **Web**: Open `sdk-examples/js/index.html` in browser.

## Testing

- **Unit Tests**: `cd stacklens/backend && npm test`
- **E2E Tests**: `cd tests && npx playwright test`

## Configuration

- **OTel Collector**: `collector/otel-collector-config.yaml`
- **Backend**: `stacklens/backend/.env` (see `src/config`)

## Troubleshooting

- **Kafka Lag**: Check consumer group lag using `kafka-consumer-groups`.
- **ES Indexing**: Check `stacklens-logs-*` indices in Kibana.
- **WebSocket**: Ensure port 3001 is open and accessible.



right now you can check in this application there will be a POS application added but I could not see if I run the stacklens and POS using  ./start-stack.sh and click on any button on the POS should trigger a Log and if it is an error it should be populated inside the Stacklens but right now this is not working as expected.
can you fix and understand the issue correctly.
Investigate more if you want please write some testcases to validate these scenarios and fix it correctly