#!/bin/bash

# Direct Test of AI Error Analysis - Send Events to Analytics
echo "🤖 Direct Testing AI Error Analysis Feature"
echo "==========================================="
echo ""

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}1️⃣  Sending Error Events to Analytics${NC}"
for i in {1..5}; do
    echo "   Sending error event $i..."
    curl -s -X POST http://localhost:4000/api/analytics/events \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"error\",
            \"message\": \"Database connection timeout - error $i\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
            \"source\": \"pos-backend\",
            \"severity\": \"error\",
            \"errorCode\": \"DB_TIMEOUT\"
        }" > /dev/null
    sleep 0.5
done

echo ""
echo -e "${BLUE}2️⃣  Waiting for metrics to be generated...${NC}"
sleep 3

echo ""
echo -e "${BLUE}3️⃣  Fetching Current Metrics${NC}"
METRICS_RESPONSE=$(curl -s http://localhost:4000/api/analytics/metrics?window=1min&limit=5)
METRICS_COUNT=$(echo "$METRICS_RESPONSE" | jq '.data.metrics | length' 2>/dev/null || echo "0")
echo "Available metrics: $METRICS_COUNT"
if [ "$METRICS_COUNT" -gt 0 ]; then
    LATEST_METRIC=$(echo "$METRICS_RESPONSE" | jq '.data.metrics[-1]' 2>/dev/null)
    echo "Latest Metric:"
    echo "$LATEST_METRIC" | jq '{timestamp, total_requests, error_count, error_rate, latency_p99}' 2>/dev/null
fi

echo ""
echo -e "${BLUE}4️⃣  Checking for Generated Alerts${NC}"
ALERTS_RESPONSE=$(curl -s http://localhost:4000/api/analytics/alerts?status=active)
ALERTS_COUNT=$(echo "$ALERTS_RESPONSE" | jq '.data.alerts | length' 2>/dev/null || echo "0")
echo "Active alerts: $ALERTS_COUNT"
if [ "$ALERTS_COUNT" -gt 0 ]; then
    echo "Alerts:"
    echo "$ALERTS_RESPONSE" | jq '.data.alerts | .[] | {rule_name, severity, metric, value, threshold}' 2>/dev/null
fi

echo ""
if [ "$ALERTS_COUNT" -gt 0 ]; then
    echo -e "${BLUE}5️⃣  Testing AI Analysis with Generated Alerts${NC}"
    
    ALERTS=$(echo "$ALERTS_RESPONSE" | jq '.data.alerts' 2>/dev/null)
    
    echo -e "${YELLOW}Sending to AI Analysis endpoint...${NC}"
    AI_RESPONSE=$(curl -s -X POST http://localhost:4000/api/analytics/ai-analysis \
        -H "Content-Type: application/json" \
        -d "{
            \"alerts\": $ALERTS,
            \"metrics\": $LATEST_METRIC
        }")
    
    SUCCESS=$(echo "$AI_RESPONSE" | jq '.success' 2>/dev/null)
    HAS_ERRORS=$(echo "$AI_RESPONSE" | jq '.data.hasErrors' 2>/dev/null)
    
    if [ "$SUCCESS" = "true" ] && [ "$HAS_ERRORS" = "true" ]; then
        echo -e "${GREEN}✅ AI Analysis Generated Successfully!${NC}"
        echo ""
        echo "Full Response:"
        echo "$AI_RESPONSE" | jq '.' 2>/dev/null
        
        echo ""
        echo -e "${YELLOW}📊 Analysis Summary:${NC}"
        ANALYSIS=$(echo "$AI_RESPONSE" | jq '.data.analysis' 2>/dev/null)
        
        echo "Severity: $(echo "$ANALYSIS" | jq -r '.severity')"
        echo "Error Categories:"
        echo "$ANALYSIS" | jq -r '.errorCategories[]' | sed 's/^/  • /'
        echo ""
        echo "Error Pattern: $(echo "$ANALYSIS" | jq -r '.pattern')"
        echo ""
        echo "Error Types:"
        echo "$ANALYSIS" | jq -r '.errorTypes[]' | sed 's/^/  • /'
        echo ""
        echo "Root Cause: $(echo "$ANALYSIS" | jq -r '.rootCause')"
        echo ""
        echo "System Impact: $(echo "$ANALYSIS" | jq -r '.estimatedImpact')"
        echo ""
        echo -e "${YELLOW}💡 AI Suggestions:${NC}"
        echo "$ANALYSIS" | jq -r '.suggestions[]' | sed 's/^/  💡 /'
        echo ""
        echo -e "${YELLOW}🚨 Immediate Actions:${NC}"
        echo "$ANALYSIS" | jq -r '.immediateActions[]' | sed 's/^/  → /'
        echo ""
        echo -e "${YELLOW}⚙️  Long-term Fixes:${NC}"
        echo "$ANALYSIS" | jq -r '.longTermFixes[]' | sed 's/^/  ⚙️  /'
    else
        echo -e "${YELLOW}⚠️  AI Analysis Response:${NC}"
        echo "$AI_RESPONSE" | jq '.' 2>/dev/null || echo "$AI_RESPONSE"
    fi
else
    echo -e "${YELLOW}⚠️  No alerts generated yet. Try sending more error events.${NC}"
fi

echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
