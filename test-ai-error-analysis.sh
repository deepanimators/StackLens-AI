#!/bin/bash

# Test AI Error Analysis Feature Implementation
echo "🤖 Testing AI Error Analysis Feature"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Current System Status:${NC}"
curl -s http://localhost:4000/api/analytics/health-status | jq '.data' 2>/dev/null || echo "❌ API not responding"
echo ""

echo -e "${BLUE}1️⃣  Fetching Current Alerts${NC}"
ALERTS_RESPONSE=$(curl -s http://localhost:4000/api/analytics/alerts?status=active)
ALERTS_COUNT=$(echo "$ALERTS_RESPONSE" | jq '.data.alerts | length' 2>/dev/null || echo "0")
echo "Current active alerts: $ALERTS_COUNT"
if [ "$ALERTS_COUNT" -gt 0 ]; then
    echo "Alerts:"
    echo "$ALERTS_RESPONSE" | jq '.data.alerts | .[] | {rule_name, severity, metric, value}' 2>/dev/null
fi
echo ""

echo -e "${BLUE}2️⃣  Fetching Latest Metrics${NC}"
METRICS_RESPONSE=$(curl -s http://localhost:4000/api/analytics/metrics?window=1min&limit=1)
LATEST_METRIC=$(echo "$METRICS_RESPONSE" | jq '.data.metrics[-1]' 2>/dev/null)
echo "Latest Metric:"
echo "$LATEST_METRIC" | jq '.' 2>/dev/null || echo "No metrics available"
echo ""

if [ "$ALERTS_COUNT" -gt 0 ]; then
    echo -e "${BLUE}3️⃣  Testing AI Analysis Endpoint${NC}"
    
    ALERTS=$(echo "$ALERTS_RESPONSE" | jq '.data.alerts' 2>/dev/null)
    
    echo "Sending request to POST /api/analytics/ai-analysis..."
    AI_RESPONSE=$(curl -s -X POST http://localhost:4000/api/analytics/ai-analysis \
        -H "Content-Type: application/json" \
        -d "{
            \"alerts\": $ALERTS,
            \"metrics\": $LATEST_METRIC
        }")
    
    echo -e "${GREEN}✅ AI Analysis Response:${NC}"
    echo "$AI_RESPONSE" | jq '.' 2>/dev/null || echo "$AI_RESPONSE"
    
    # Extract analysis details
    HAS_ERRORS=$(echo "$AI_RESPONSE" | jq '.data.hasErrors' 2>/dev/null)
    if [ "$HAS_ERRORS" = "true" ]; then
        echo ""
        echo -e "${YELLOW}📊 Analysis Details:${NC}"
        ANALYSIS=$(echo "$AI_RESPONSE" | jq '.data.analysis' 2>/dev/null)
        
        echo "Severity: $(echo "$ANALYSIS" | jq -r '.severity' 2>/dev/null)"
        echo "Error Categories: $(echo "$ANALYSIS" | jq -r '.errorCategories[]' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')"
        echo "Error Pattern: $(echo "$ANALYSIS" | jq -r '.pattern' 2>/dev/null)"
        echo "Error Types: $(echo "$ANALYSIS" | jq -r '.errorTypes[]' 2>/dev/null | tr '\n' ', ' | sed 's/,$//')"
        echo "Root Cause: $(echo "$ANALYSIS" | jq -r '.rootCause' 2>/dev/null)"
        echo ""
        echo -e "${YELLOW}💡 AI Suggestions:${NC}"
        echo "$ANALYSIS" | jq -r '.suggestions[]' 2>/dev/null | while read -r suggestion; do
            echo "  • $suggestion"
        done
        echo ""
        echo -e "${YELLOW}🚨 Immediate Actions:${NC}"
        echo "$ANALYSIS" | jq -r '.immediateActions[]' 2>/dev/null | while read -r action; do
            echo "  → $action"
        done
    fi
else
    echo -e "${YELLOW}⚠️  No active alerts to analyze${NC}"
    echo "Generate alerts by triggering errors through the POS backend..."
fi

echo ""
echo -e "${GREEN}✅ Test Complete!${NC}"
