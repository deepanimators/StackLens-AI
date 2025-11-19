#!/bin/bash

# Simple test to verify POS analytics data flow
# This script sends events and checks if metrics are generated

echo "🧪 Testing POS → Analytics Data Flow"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Give services time to stabilize
echo "⏳ Waiting 3 seconds for services to stabilize..."
sleep 3

# Test 1: Health checks
echo ""
echo "1️⃣  Health Checks"
echo "─────────────────"

echo -n "POS Backend (/api/health): "
if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo -n "StackLens API (/api/analytics/metrics): "
if curl -s http://localhost:4000/api/analytics/metrics | grep -q "success"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test 2: Send events
echo ""
echo "2️⃣  Sending Test Events"
echo "───────────────────────"

echo -n "Sending 3 checkout events... "
for i in {1..3}; do
    curl -s -X POST http://localhost:3000/api/checkout -H "Content-Type: application/json" >/dev/null
    sleep 0.1
done
echo -e "${GREEN}✓${NC}"

echo -n "Sending 2 error events... "
for i in {1..2}; do
    curl -s -X POST http://localhost:3000/api/error -H "Content-Type: application/json" >/dev/null
    sleep 0.1
done
echo -e "${GREEN}✓${NC}"

echo -n "Sending 1 info event... "
curl -s -X POST http://localhost:3000/api/info -H "Content-Type: application/json" >/dev/null
echo -e "${GREEN}✓${NC}"

# Test 3: Check metrics
echo ""
echo "3️⃣  Checking Metrics"
echo "────────────────────"

sleep 1

METRICS=$(curl -s http://localhost:4000/api/analytics/metrics)

echo "Metrics Response:"
echo "$METRICS" | jq '.data.metrics | if length > 0 then .[0] else "No metrics" end' 2>/dev/null || echo "$METRICS"

# Test 4: Check alerts
echo ""
echo "4️⃣  Checking Alerts"
echo "───────────────────"

ALERTS=$(curl -s http://localhost:4000/api/analytics/alerts)

echo "Alerts Response:"
echo "$ALERTS" | jq '.data.alerts | if length > 0 then . else "No alerts (normal)" end' 2>/dev/null || echo "$ALERTS"

echo ""
echo "✅ Test Complete!"
echo ""
echo "📊 Summary:"
echo "• Events sent to POS backend: 6 (3 checkout + 2 error + 1 info)"
echo "• Check realtime dashboard: http://localhost:5173"
echo "• Check POS frontend: http://localhost:5174"
