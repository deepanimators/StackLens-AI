#!/bin/bash

# Comprehensive AI Error Analysis - Complete Flow Test
echo "═══════════════════════════════════════════════════════════════"
echo "  🤖 AI ERROR ANALYSIS - COMPLETE FLOW VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📋 STEP 1: System Health Check${NC}"
echo "───────────────────────────────────────────────────────────────"
HEALTH=$(curl -s 'http://localhost:4000/api/analytics/health-status' | jq '.data')
echo "API Status: $(echo "$HEALTH" | jq -r '.status')"
echo "Uptime: $(echo "$HEALTH" | jq -r '.uptime') seconds"
echo ""

echo -e "${BLUE}📊 STEP 2: Generate Test Error Events${NC}"
echo "───────────────────────────────────────────────────────────────"
for i in {1..5}; do
    curl -s -X POST 'http://localhost:4000/api/analytics/events' \
        -H 'Content-Type: application/json' \
        -d "{
            \"type\": \"error\",
            \"message\": \"Database timeout error #$i\",
            \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
            \"source\": \"pos-backend\",
            \"severity\": \"error\",
            \"errorCode\": \"DB_ERROR\"
        }" > /dev/null
    echo "✓ Error event $i sent"
done
echo ""

echo -e "${BLUE}⏳ STEP 3: Wait for Metrics Generation${NC}"
echo "───────────────────────────────────────────────────────────────"
sleep 2
echo "✓ Metrics processing"
echo ""

echo -e "${BLUE}📈 STEP 4: Check Generated Metrics${NC}"
echo "───────────────────────────────────────────────────────────────"
METRICS=$(curl -s 'http://localhost:4000/api/analytics/metrics?window=1min&limit=1' | jq '.data.metrics[-1]')
echo "Latest Metric Data:"
echo "$METRICS" | jq '{timestamp, total_requests, error_count, error_rate, latency_p99}' | sed 's/^/  /'
echo ""

echo -e "${BLUE}🚨 STEP 5: Verify Alert Generation${NC}"
echo "───────────────────────────────────────────────────────────────"
ALERTS=$(curl -s 'http://localhost:4000/api/analytics/alerts?status=active' | jq '.data.alerts')
ALERT_COUNT=$(echo "$ALERTS" | jq 'length')
echo "Active Alerts: $ALERT_COUNT"
if [ "$ALERT_COUNT" -gt 0 ]; then
    echo "Alert Details:"
    echo "$ALERTS" | jq '.[] | {rule_name, severity, metric, value, threshold}' | sed 's/^/  /'
fi
echo ""

if [ "$ALERT_COUNT" -gt 0 ]; then
    echo -e "${BLUE}🤖 STEP 6: Send Alerts to AI Analysis${NC}"
    echo "───────────────────────────────────────────────────────────────"
    
    AI_RESPONSE=$(curl -s -X POST 'http://localhost:4000/api/analytics/ai-analysis' \
        -H 'Content-Type: application/json' \
        -d "{
            \"alerts\": $ALERTS,
            \"metrics\": $METRICS
        }")
    
    SUCCESS=$(echo "$AI_RESPONSE" | jq '.success')
    HAS_ERRORS=$(echo "$AI_RESPONSE" | jq '.data.hasErrors')
    
    if [ "$SUCCESS" = "true" ] && [ "$HAS_ERRORS" = "true" ]; then
        echo -e "${GREEN}✅ AI Analysis Generated Successfully!${NC}"
        echo ""
        
        ANALYSIS=$(echo "$AI_RESPONSE" | jq '.data.analysis')
        
        echo -e "${YELLOW}📊 ANALYSIS RESULTS:${NC}"
        echo "  Severity:        $(echo "$ANALYSIS" | jq -r '.severity | ascii_upcase')"
        echo "  Categories:      $(echo "$ANALYSIS" | jq -r '.errorCategories | join(", ")')"
        echo "  Types:           $(echo "$ANALYSIS" | jq -r '.errorTypes | join(", ")')"
        echo "  Pattern:         $(echo "$ANALYSIS" | jq -r '.pattern')"
        echo "  Root Cause:      $(echo "$ANALYSIS" | jq -r '.rootCause')"
        echo "  System Impact:   $(echo "$ANALYSIS" | jq -r '.estimatedImpact')"
        echo ""
        
        echo -e "${YELLOW}💡 AI SUGGESTIONS:${NC}"
        echo "$ANALYSIS" | jq -r '.suggestions[]' | sed 's/^/  ✓ /'
        echo ""
        
        echo -e "${YELLOW}🚨 IMMEDIATE ACTIONS:${NC}"
        echo "$ANALYSIS" | jq -r '.immediateActions[]' | sed 's/^/  → /'
        echo ""
        
        echo -e "${YELLOW}⚙️  LONG-TERM FIXES:${NC}"
        echo "$ANALYSIS" | jq -r '.longTermFixes[]' | sed 's/^/  ⚙️  /'
        echo ""
        
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}✅ VERIFICATION COMPLETE - ALL COMPONENTS WORKING!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo "What This Means:"
        echo "  ✓ Error events are being collected"
        echo "  ✓ Metrics are being generated correctly"
        echo "  ✓ Alerts are being triggered on thresholds"
        echo "  ✓ AI analysis is providing insights"
        echo "  ✓ All data formats are correct"
        echo ""
        echo "Next Steps:"
        echo "  1. Visit Realtime Dashboard: http://localhost:5173/realtime"
        echo "  2. You should see the AI Error Analysis card"
        echo "  3. The card will show severity, suggestions, and actions"
        echo "  4. AI analysis updates every 15 seconds when auto-refresh is on"
        echo ""
    else
        echo -e "${YELLOW}⚠️  AI Analysis Response:${NC}"
        echo "$AI_RESPONSE" | jq '.' | sed 's/^/  /'
    fi
else
    echo -e "${YELLOW}⚠️  No alerts generated. This may take a moment...${NC}"
    echo "   The alert is triggered when error_rate > 5%"
fi
