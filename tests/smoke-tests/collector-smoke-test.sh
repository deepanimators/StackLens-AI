#!/usr/bin/env bash

#####################################################################
# StackLens OTLP Collector Smoke Test
#
# This script verifies that the OTLP Collector is running and
# accepting logs/traces correctly.
#
# Usage:
#   ./collector-smoke-test.sh
#
# Environment Variables:
#   OTEL_COLLECTOR_URL - OTLP HTTP endpoint (default: http://localhost:4318)
#####################################################################

set -e

COLLECTOR_URL="${OTEL_COLLECTOR_URL:-http://localhost:4318}"
SERVICE_NAME="smoke-test"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
TRACE_ID=$(od -An -tx1 -N16 /dev/urandom | tr -d ' ')
SPAN_ID=$(od -An -tx1 -N8 /dev/urandom | tr -d ' ')

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  StackLens OTLP Collector Smoke Test        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

#####################################################################
# Test 1: Collector Health Check
#####################################################################

echo -e "${YELLOW}[TEST 1/5]${NC} Health check endpoint..."

response=$(curl -s -o /dev/null -w "%{http_code}" "${COLLECTOR_URL}/healthz" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed (HTTP 200)${NC}"
else
  echo -e "${RED}✗ Health check failed (HTTP ${response})${NC}"
  echo "  Collector may not be running. Start with:"
  echo "    cd infra/compose && docker-compose up -d"
  exit 1
fi

#####################################################################
# Test 2: OTLP Log Ingestion (HTTP)
#####################################################################

echo -e "${YELLOW}[TEST 2/5]${NC} Testing OTLP logs endpoint (HTTP)..."

log_payload=$(cat <<EOF
{
  "resourceLogs": [
    {
      "resource": {
        "attributes": [
          {
            "key": "service.name",
            "value": { "stringValue": "${SERVICE_NAME}" }
          },
          {
            "key": "service.version",
            "value": { "stringValue": "1.0.0" }
          }
        ]
      },
      "scopeLogs": [
        {
          "scope": {
            "name": "smoke-test",
            "version": "1.0.0"
          },
          "logRecords": [
            {
              "timeUnixNano": "1705316445000000000",
              "body": {
                "stringValue": "Smoke test log entry"
              },
              "attributes": [
                {
                  "key": "service.name",
                  "value": { "stringValue": "${SERVICE_NAME}" }
                },
                {
                  "key": "log.level",
                  "value": { "stringValue": "info" }
                },
                {
                  "key": "error_code",
                  "value": { "stringValue": null }
                }
              ],
              "severityNumber": 9,
              "severityText": "Info"
            }
          ]
        }
      ]
    }
  ]
}
EOF
)

response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${COLLECTOR_URL}/v1/logs" \
  -H "Content-Type: application/json" \
  -d "$log_payload" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ OTLP logs endpoint accepted request (HTTP 200)${NC}"
else
  echo -e "${RED}✗ OTLP logs endpoint returned HTTP ${response}${NC}"
  echo "  Expected 200. Response:"
  curl -s -X POST \
    "${COLLECTOR_URL}/v1/logs" \
    -H "Content-Type: application/json" \
    -d "$log_payload" 2>/dev/null | head -5
  exit 1
fi

#####################################################################
# Test 3: OTLP Trace Ingestion (HTTP)
#####################################################################

echo -e "${YELLOW}[TEST 3/5]${NC} Testing OTLP traces endpoint (HTTP)..."

trace_payload=$(cat <<EOF
{
  "resourceSpans": [
    {
      "resource": {
        "attributes": [
          {
            "key": "service.name",
            "value": { "stringValue": "${SERVICE_NAME}" }
          },
          {
            "key": "service.version",
            "value": { "stringValue": "1.0.0" }
          },
          {
            "key": "deployment.environment",
            "value": { "stringValue": "dev" }
          }
        ]
      },
      "scopeSpans": [
        {
          "scope": {
            "name": "smoke-test",
            "version": "1.0.0"
          },
          "spans": [
            {
              "traceId": "${TRACE_ID}",
              "spanId": "${SPAN_ID}",
              "name": "smoke-test-span",
              "kind": 2,
              "startTimeUnixNano": "1705316445000000000",
              "endTimeUnixNano": "1705316445100000000",
              "attributes": [
                {
                  "key": "http.method",
                  "value": { "stringValue": "POST" }
                },
                {
                  "key": "http.url",
                  "value": { "stringValue": "http://localhost:4318/v1/traces" }
                },
                {
                  "key": "http.status_code",
                  "value": { "intValue": 200 }
                }
              ],
              "status": { "code": 0 }
            }
          ]
        }
      ]
    }
  ]
}
EOF
)

response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${COLLECTOR_URL}/v1/traces" \
  -H "Content-Type: application/json" \
  -d "$trace_payload" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ OTLP traces endpoint accepted request (HTTP 200)${NC}"
else
  echo -e "${RED}✗ OTLP traces endpoint returned HTTP ${response}${NC}"
  echo "  Expected 200."
  exit 1
fi

#####################################################################
# Test 4: Metrics Endpoint
#####################################################################

echo -e "${YELLOW}[TEST 4/5]${NC} Testing metrics endpoint..."

response=$(curl -s -o /dev/null -w "%{http_code}" "${COLLECTOR_URL}:8888/metrics" 2>/dev/null || echo "000")

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✓ Metrics endpoint available (HTTP 200)${NC}"
else
  # Metrics endpoint may not be available in all configs, that's OK
  echo -e "${YELLOW}⚠ Metrics endpoint not available (HTTP ${response}) - this is optional${NC}"
fi

#####################################################################
# Test 5: Verify Kafka Export
#####################################################################

echo -e "${YELLOW}[TEST 5/5]${NC} Verifying Kafka export (if available)..."

# Check if Kafka is accessible
kafka_response=$(docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | grep -c "otel-logs" || echo "0")

if [ "$kafka_response" = "1" ]; then
  echo -e "${GREEN}✓ Kafka topic 'otel-logs' exists${NC}"
  
  # Try to consume recent messages
  messages=$(docker exec -T kafka kafka-console-consumer \
    --bootstrap-server localhost:9092 \
    --topic otel-logs \
    --from-beginning \
    --max-messages 1 \
    --timeout-ms 5000 2>/dev/null | wc -l)
  
  if [ "$messages" -gt "0" ]; then
    echo -e "${GREEN}✓ Kafka topic contains messages (Collector exporting successfully)${NC}"
  else
    echo -e "${YELLOW}⚠ Kafka topic is empty (may not have had time to export yet)${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Kafka not accessible - Docker execution failed (optional)${NC}"
fi

#####################################################################
# Summary
#####################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✓ Smoke test completed successfully!${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo "Collector is working correctly and accepting:"
echo "  • OTLP Logs (HTTP POST /v1/logs)"
echo "  • OTLP Traces (HTTP POST /v1/traces)"
echo ""
echo "Next steps:"
echo "  1. Check Elasticsearch for indexed logs:"
echo "     curl http://localhost:9200/stacklens-logs-*/_count"
echo ""
echo "  2. View in Kibana:"
echo "     open http://localhost:5601"
echo ""
echo "  3. View traces in Jaeger:"
echo "     open http://localhost:16686"
echo ""

exit 0
