#!/bin/bash

# stop-kafka-otel.sh
# Stops Kafka and OpenTelemetry Collector

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping Kafka and OpenTelemetry..."

# Stop Kafka
if [ -f "$SCRIPT_DIR/data/kafka.pid" ]; then
    KAFKA_PID=$(cat "$SCRIPT_DIR/data/kafka.pid")
    if kill -0 "$KAFKA_PID" 2>/dev/null; then
        echo "   Stopping Kafka (PID: $KAFKA_PID)..."
        kill "$KAFKA_PID" 2>/dev/null || true
        sleep 2
        kill -9 "$KAFKA_PID" 2>/dev/null || true
    fi
    rm -f "$SCRIPT_DIR/data/kafka.pid"
fi

# Also kill by process name
pkill -f "kafka.Kafka" 2>/dev/null || true

# Stop OTEL
if [ -f "$SCRIPT_DIR/data/otel.pid" ]; then
    OTEL_PID=$(cat "$SCRIPT_DIR/data/otel.pid")
    if kill -0 "$OTEL_PID" 2>/dev/null; then
        echo "   Stopping OTEL Collector (PID: $OTEL_PID)..."
        kill "$OTEL_PID" 2>/dev/null || true
        sleep 1
        kill -9 "$OTEL_PID" 2>/dev/null || true
    fi
    rm -f "$SCRIPT_DIR/data/otel.pid"
fi

pkill -f "otelcol" 2>/dev/null || true

echo "✅ Kafka and OTEL stopped."
