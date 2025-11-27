# OpenTelemetry Pipeline Architecture

## Overview
This system implements a universal log and telemetry pipeline using OpenTelemetry, Kafka, Elasticsearch, and StackLens.

## Components

1.  **Client SDKs**:
    *   **OTel JS Web**: Captures browser logs, errors, and traces. Exports via OTLP/HTTP.
    *   **OTel Node**: Captures backend logs and traces. Exports via OTLP/HTTP.
    *   **Fallback Logger**: Custom JSON logger for when OTLP is unavailable.

2.  **OpenTelemetry Collector**:
    *   Receives OTLP/HTTP data.
    *   Processors: Batch, Attributes (env, service), Redaction.
    *   Exporters: Kafka (`otel-logs`), Elasticsearch (direct debug).

3.  **Message Bus (Kafka)**:
    *   Topic `otel-logs`: Raw logs from collector.
    *   Topic `stacklens-enriched`: Processed logs.
    *   Topic `stacklens-alerts`: Generated alerts.

4.  **StackLens Consumer (Parser/Enricher)**:
    *   Consumes `otel-logs`.
    *   Validates against JSON schema.
    *   Enriches with metadata (GeoIP, etc.).
    *   Indexes to Elasticsearch (`stacklens-logs-*`).
    *   Persists to Postgres (`raw_logs`).

5.  **StackLens Analyzer**:
    *   Consumes `stacklens-enriched`.
    *   **Rule Engine**: Deterministic rules for known errors.
    *   **ML Model**: Anomaly detection (PoC).
    *   Creates alerts in Postgres.
    *   Emits to `stacklens-alerts`.

6.  **StackLens Backend**:
    *   API for log ingest (fallback).
    *   WebSocket server for live alerts.
    *   Jira Connector.

7.  **StackLens Frontend**:
    *   React Admin UI.
    *   Live Alerts Dashboard.
    *   Log Search.

## Data Flow
`Client -> OTel Collector -> Kafka -> Consumer -> ES/Postgres -> Analyzer -> Alert -> UI/Jira`
