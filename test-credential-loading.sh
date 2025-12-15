#!/bin/bash

# Test script to verify credential loading from database instead of environment

echo "🧪 Credential Loading Test Suite"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if database has credentials
echo "📋 Step 1: Checking database for credentials..."
sqlite3 db/stacklens.db "SELECT id, name, provider, priority, is_active FROM api_credentials WHERE is_active = 1 ORDER BY priority ASC;" 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Database credentials checked${NC}"
else
  echo -e "${RED}❌ Failed to query database${NC}"
  exit 1
fi

echo ""

# Step 2: Check environment variables
echo "📋 Step 2: Checking environment variables..."
echo "GEMINI_API_KEY: $([ -z "$GEMINI_API_KEY" ] && echo "Not set" || echo "***REDACTED***")"
echo "GOOGLE_API_KEY: $([ -z "$GOOGLE_API_KEY" ] && echo "Not set" || echo "***REDACTED***")"
echo "GROQ_API_KEY: $([ -z "$GROQ_API_KEY" ] && echo "Not set" || echo "***REDACTED***")"
echo "OPENROUTER_API_KEY: $([ -z "$OPENROUTER_API_KEY" ] && echo "Not set" || echo "***REDACTED***")"

echo ""

# Step 3: Start the API and test suggestion endpoint
echo "📋 Step 3: Testing suggestion endpoint with database credentials..."
echo ""

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
sleep 3

# Test with a sample error
TEST_PAYLOAD=$(cat <<EOF
{
  "errorMessage": "TypeError: Cannot read property 'length' of undefined",
  "errorType": "TypeError",
  "severity": "high",
  "filename": "src/index.ts",
  "lineNumber": 42,
  "stack": "at Object.<anonymous> (src/index.ts:42:1)"
}
EOF
)

echo "🧪 Sending test request to create error..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/errors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "$TEST_PAYLOAD")

ERROR_ID=$(echo "$RESPONSE" | jq -r '.id // .data.id // empty' 2>/dev/null)

if [ -z "$ERROR_ID" ]; then
  echo -e "${RED}❌ Failed to create error${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Error created with ID: $ERROR_ID${NC}"
echo ""

# Get suggestion for the created error
echo "🧪 Requesting suggestion for error $ERROR_ID..."
SUGGESTION_RESPONSE=$(curl -s -X POST http://localhost:3001/api/errors/$ERROR_ID/suggestion \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token")

echo "Response:"
echo "$SUGGESTION_RESPONSE" | jq . 2>/dev/null || echo "$SUGGESTION_RESPONSE"

# Check which source was used
SOURCE=$(echo "$SUGGESTION_RESPONSE" | jq -r '.source // "unknown"' 2>/dev/null)
echo ""
echo "📊 Suggestion Source: $SOURCE"

if [[ "$SOURCE" == "trained_model" ]]; then
  echo -e "${GREEN}✅ EXCELLENT: Using trained model (ML model works!)${NC}"
elif [[ "$SOURCE" == "api_service" ]]; then
  echo -e "${GREEN}✅ GOOD: Using API service from database credentials${NC}"
elif [[ "$SOURCE" == "fallback" ]]; then
  echo -e "${YELLOW}⚠️  WARNING: Using fallback (check API keys)${NC}"
else
  echo -e "${RED}❌ ERROR: Unknown source: $SOURCE${NC}"
fi

echo ""
echo "=================================="
echo "✅ Test completed"
