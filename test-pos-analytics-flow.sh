#!/bin/bash

# Test script to verify POS → Analytics → Realtime Dashboard data flow
# This script simulates POS events and verifies they appear in the analytics metrics

echo "🧪 Testing POS Analytics Data Flow"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if services are running
echo "📋 Checking if services are running..."
sleep 2

# Test POS Backend
echo -n "Testing POS Backend (port 3000)... "
if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not Running${NC}"
    echo "Start with: cd pos-demo/backend && npm start"
    exit 1
fi

# Test StackLens API Backend
echo -n "Testing StackLens API (port 4000)... "
if curl -s http://localhost:4000/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not Running${NC}"
    echo "Start with: cd apps/api && npm run dev"
    exit 1
fi

echo ""
echo "🔄 Starting analytics flow test..."
echo ""

# Send test events via POS Backend
send_pos_event() {
    local event_type=$1
    local endpoint="log${event_type^}"
    
    echo -n "📤 Sending $event_type event to POS backend... "
    response=$(curl -s -X POST http://localhost:3000/api/$endpoint \
        -H "Content-Type: application/json" \
        -w "\n%{http_code}")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Success (HTTP $http_code)${NC}"
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo "Response: $(echo "$response" | head -n1)"
        return 1
    fi
}

# Test events
echo "📨 Simulating POS events (sending 5 checkout events + errors)..."
echo ""

for i in {1..5}; do
    send_pos_event "checkout"
    sleep 0.2
done

send_pos_event "error"
send_pos_event "error"
send_pos_event "info"

echo ""
echo "⏳ Waiting for metrics to be generated..."
sleep 2

# Check if metrics were generated
echo ""
echo "📊 Verifying metrics generation..."
echo -n "Fetching metrics from /api/analytics/metrics... "

response=$(curl -s http://localhost:4000/api/analytics/metrics)
metric_count=$(echo "$response" | grep -o '"total":' | wc -l)
events_received=$(echo "$response" | grep -o '"total_events"' | wc -l)

if [ "$metric_count" -gt 0 ]; then
    echo -e "${GREEN}✓ Metrics found${NC}"
    
    # Parse and display metrics
    echo ""
    echo -e "${BLUE}📈 Latest Metrics:${NC}"
    echo "$response" | grep -o '"throughput":[0-9.]*\|"error_rate":[0-9.]*\|"latency_p99":[0-9.]*\|"total_requests":[0-9]*' | sed 's/^/   /'
else
    echo -e "${RED}✗ No metrics found${NC}"
    echo "Response: $response"
fi

# Check alerts
echo ""
echo "⚠️  Checking alerts generation..."
echo -n "Fetching alerts from /api/analytics/alerts... "

response=$(curl -s http://localhost:4000/api/analytics/alerts)
alert_count=$(echo "$response" | grep -o '"id":' | wc -l)

if [ "$alert_count" -gt 0 ]; then
    echo -e "${GREEN}✓ Alerts found ($alert_count)${NC}"
    echo ""
    echo -e "${BLUE}⚠️  Active Alerts:${NC}"
    echo "$response" | grep -o '"rule_name":"[^"]*"\|"severity":"[^"]*"' | sed 's/^/   /'
else
    echo -e "${YELLOW}ℹ️  No alerts (may be normal if thresholds not exceeded)${NC}"
fi

# Check health status
echo ""
echo "💚 Checking health status..."
response=$(curl -s http://localhost:4000/api/analytics/health-status)
status=$(echo "$response" | grep -o '"status":"[^"]*"')

if echo "$status" | grep -q "healthy"; then
    echo -e "${GREEN}✓ System Healthy${NC}"
else
    echo -e "${YELLOW}ℹ️  Status: $status${NC}"
fi

echo ""
echo "✅ Analytics Flow Test Complete!"
echo ""
echo "📲 Frontend realtime dashboard should now show:"
echo "   • Updated metrics with non-zero throughput"
echo "   • Error rate > 0 (from the 2 error events sent)"
echo "   • Request count > 0"
echo ""
echo "Navigate to: ${BLUE}http://localhost:5173${NC}"
echo ""
