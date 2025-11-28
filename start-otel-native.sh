#!/bin/bash

# start-otel-native.sh
# Downloads and runs OpenTelemetry Collector locally on macOS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OTEL_VERSION="0.91.0"
OTEL_DIR="$SCRIPT_DIR/tools/otel-collector"
OTEL_BINARY="$OTEL_DIR/otelcol-contrib"
OTEL_LOG_DIR="$SCRIPT_DIR/logs/otel"

echo "🔭 OpenTelemetry Collector Setup"
echo ""

# Create directories
mkdir -p "$OTEL_DIR"
mkdir -p "$OTEL_LOG_DIR"

# Check if already running
if pgrep -f "otelcol" > /dev/null 2>&1; then
    echo "✅ OpenTelemetry Collector is already running"
    echo "   PID: $(pgrep -f 'otelcol')"
    exit 0
fi

# Download if not exists
if [ ! -f "$OTEL_BINARY" ]; then
    echo "📥 Downloading OpenTelemetry Collector v${OTEL_VERSION}..."
    
    # Detect architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then
        OTEL_ARCH="arm64"
    else
        OTEL_ARCH="amd64"
    fi
    
    DOWNLOAD_URL="https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${OTEL_VERSION}/otelcol-contrib_${OTEL_VERSION}_darwin_${OTEL_ARCH}.tar.gz"
    
    echo "   URL: $DOWNLOAD_URL"
    curl -L "$DOWNLOAD_URL" -o "$OTEL_DIR/otelcol.tar.gz"
    
    echo "📦 Extracting..."
    cd "$OTEL_DIR"
    tar -xzf otelcol.tar.gz
    rm otelcol.tar.gz
    chmod +x otelcol-contrib
    cd "$SCRIPT_DIR"
    
    echo "✅ Downloaded OpenTelemetry Collector"
fi

# Create config if not exists
OTEL_CONFIG="$SCRIPT_DIR/config/otel-collector-config.yaml"
mkdir -p "$SCRIPT_DIR/config"

if [ ! -f "$OTEL_CONFIG" ]; then
    echo "📝 Creating OpenTelemetry Collector configuration..."
    cat > "$OTEL_CONFIG" << 'EOF'
# OpenTelemetry Collector Configuration
# For StackLens local development

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "http://localhost:*"
            - "http://127.0.0.1:*"
  
  # Prometheus metrics receiver (optional)
  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 10s
          static_configs:
            - targets: ['localhost:8888']

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  # Console/Debug output
  debug:
    verbosity: basic
  
  # OTLP exporter (for Jaeger, etc.)
  otlp:
    endpoint: localhost:4317
    tls:
      insecure: true
  
  # Logging exporter
  logging:
    loglevel: info

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [health_check, zpages]
  
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug]
    
    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [debug]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug]

  telemetry:
    logs:
      level: info
    metrics:
      address: 0.0.0.0:8888
EOF
    echo "✅ Created OTEL configuration at $OTEL_CONFIG"
fi

# Start OpenTelemetry Collector
echo ""
echo "🚀 Starting OpenTelemetry Collector..."
nohup "$OTEL_BINARY" --config "$OTEL_CONFIG" > "$OTEL_LOG_DIR/otel.log" 2>&1 &
OTEL_PID=$!
echo "$OTEL_PID" > "$SCRIPT_DIR/data/otel.pid"

# Wait for OTEL to start
echo "⏳ Waiting for OTEL Collector to be ready..."
for i in {1..20}; do
    if curl -sf http://localhost:13133/ > /dev/null 2>&1; then
        echo ""
        echo "✅ OpenTelemetry Collector is running!"
        echo "   PID: $OTEL_PID"
        echo ""
        echo "📋 Endpoints:"
        echo "   OTLP gRPC:    localhost:4317"
        echo "   OTLP HTTP:    localhost:4318"
        echo "   Health:       localhost:13133"
        echo "   zPages:       localhost:55679/debug/tracez"
        echo "   Metrics:      localhost:8888/metrics"
        echo ""
        echo "   Logs: $OTEL_LOG_DIR/otel.log"
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "❌ OTEL Collector failed to start. Check logs:"
echo "   tail -50 $OTEL_LOG_DIR/otel.log"
exit 1
