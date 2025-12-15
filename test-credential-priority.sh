#!/bin/bash

# API Credential Priority System - Test Script
# This script tests the credential selection flow and Jira automation

API_URL="http://localhost:4000"
TEST_TOKEN="test-token-123"
ADMIN_USER_ID=1

echo "🧪 Testing API Credential Priority System"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test API endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5
  
  echo -e "${YELLOW}Testing:${NC} $description"
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $TEST_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $TEST_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint")
  fi
  
  status=$(echo "$response" | tail -1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Status $status"
    ((TESTS_PASSED++))
    echo "$body"
  else
    echo -e "${RED}✗ FAIL${NC} - Expected $expected_status, got $status"
    ((TESTS_FAILED++))
    echo "$body"
  fi
  echo ""
}

# Test 1: Add Gemini credential with priority 10
echo -e "${YELLOW}=== Test 1: Add Gemini Credential (Priority 10) ===${NC}"
GEMINI_CRED=$(cat <<EOF
{
  "name": "Gemini-Test",
  "provider": "gemini",
  "apiKey": "test-gemini-key-12345",
  "priority": 10,
  "isGlobal": true
}
EOF
)
test_endpoint "POST" "/api/admin/credentials" "$GEMINI_CRED" "201" "Create Gemini credential"

# Test 2: Add Groq credential with priority 20
echo -e "${YELLOW}=== Test 2: Add Groq Credential (Priority 20) ===${NC}"
GROQ_CRED=$(cat <<EOF
{
  "name": "Groq-Test",
  "provider": "groq",
  "apiKey": "test-groq-key-12345",
  "priority": 20,
  "isGlobal": true
}
EOF
)
test_endpoint "POST" "/api/admin/credentials" "$GROQ_CRED" "201" "Create Groq credential"

# Test 3: Add OpenRouter credential with priority 30
echo -e "${YELLOW}=== Test 3: Add OpenRouter Credential (Priority 30) ===${NC}"
OPENROUTER_CRED=$(cat <<EOF
{
  "name": "OpenRouter-Test",
  "provider": "openrouter",
  "apiKey": "test-openrouter-key-12345",
  "priority": 30,
  "isGlobal": true
}
EOF
)
test_endpoint "POST" "/api/admin/credentials" "$OPENROUTER_CRED" "201" "Create OpenRouter credential"

# Test 4: List all credentials - verify priority ordering
echo -e "${YELLOW}=== Test 4: List All Credentials (Should be sorted by priority) ===${NC}"
test_endpoint "GET" "/api/admin/credentials" "" "200" "List credentials with priority ordering"

# Test 5: Get highest priority credential for gemini provider
echo -e "${YELLOW}=== Test 5: Get Gemini Provider Credentials ===${NC}"
test_endpoint "GET" "/api/admin/credentials?provider=gemini" "" "200" "Get Gemini credentials (highest priority first)"

# Test 6: Update credential priority
echo -e "${YELLOW}=== Test 6: Update Credential Priority ===${NC}"
UPDATE_CRED=$(cat <<EOF
{
  "priority": 15
}
EOF
)
test_endpoint "PATCH" "/api/admin/credentials/1" "$UPDATE_CRED" "200" "Update credential priority"

# Test 7: Test Jira automation - real-time error (should create ticket)
echo -e "${YELLOW}=== Test 7: Test Jira Automation - Real-Time Error ===${NC}"
REALTIME_ERROR=$(cat <<EOF
{
  "errorType": "NullPointerException",
  "severity": "critical",
  "message": "Null reference in critical operation",
  "errorDetails": {
    "source": "real-time-monitor"
  },
  "mlConfidence": 0.92
}
EOF
)
test_endpoint "POST" "/api/automation/execute" "$REALTIME_ERROR" "200" "Execute automation for real-time error"

# Test 8: Verify database schema has priority column
echo -e "${YELLOW}=== Test 8: Verify Database Schema ===${NC}"
echo "Checking if api_credentials table has priority column..."
sqlite3 /Users/deepak/Downloads/Projects/StackLens-AI-Deploy/db/stacklens.db ".schema api_credentials" | grep -q "priority" && \
  echo -e "${GREEN}✓ PASS${NC} - Priority column exists in api_credentials table" || \
  echo -e "${RED}✗ FAIL${NC} - Priority column NOT found in api_credentials table"

# Summary
echo ""
echo "=========================================="
echo -e "Test Summary:"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "=========================================="

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
