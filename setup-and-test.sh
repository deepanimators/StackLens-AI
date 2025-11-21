#!/usr/bin/env bash

# StackLens AI - Test Setup and Runner
# This script:
# 1. Generates a fresh Firebase token
# 2. Updates .env file
# 3. Runs the test suite

set -e

echo "========================================"
echo "🔧 StackLens AI Test Setup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Generating fresh Firebase token...${NC}"
node scripts/generate-test-token.js 2>&1 || {
    echo -e "${YELLOW}⚠️  Token generation script not found, using existing token${NC}"
}

echo ""
echo -e "${BLUE}Step 2: Verifying token in .env...${NC}"
TOKEN=$(grep "TEST_FIREBASE_TOKEN=" /Users/deepak/Downloads/Projects/StackLens-AI-Deploy/.env | cut -d'=' -f2)
if [ -z "$TOKEN" ]; then
    echo "❌ ERROR: TEST_FIREBASE_TOKEN not found in .env"
    exit 1
fi

# Verify token is not corrupted (check if it's a valid JWT with 3 parts)
TOKEN_PARTS=$(echo "$TOKEN" | tr '.' '\n' | wc -l)
if [ "$TOKEN_PARTS" -ne "3" ]; then
    echo "❌ ERROR: Invalid token format (not a valid JWT)"
    exit 1
fi

TOKEN_EXPIRY=$(node -e "
const token = '$TOKEN';
try {
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
  const expiry = new Date(payload.exp * 1000);
  const now = new Date();
  if (expiry < now) {
    console.log('EXPIRED');
  } else {
    const daysLeft = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    console.log('VALID_' + daysLeft + '_DAYS');
  }
} catch(e) {
  console.log('ERROR');
}
" 2>/dev/null || echo "ERROR")

if [[ "$TOKEN_EXPIRY" == "EXPIRED" ]]; then
    echo "❌ ERROR: Token has expired!"
    echo "🔄 Regenerating token..."
    node scripts/generate-test-token.js
    exit 1
elif [[ "$TOKEN_EXPIRY" == "ERROR" ]]; then
    echo "⚠️  Warning: Could not parse token expiry"
else
    DAYS=$(echo "$TOKEN_EXPIRY" | sed 's/VALID_\([0-9]*\)_DAYS/\1/')
    echo -e "${GREEN}✅ Token is valid for $DAYS more days${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Building the project...${NC}"
npm run build > /dev/null 2>&1 && echo -e "${GREEN}✅ Build successful${NC}" || {
    echo "⚠️  Build warning (continuing with tests)"
}

echo ""
echo -e "${BLUE}Step 4: Running tests...${NC}"
echo "========================================"
echo ""

npm run test

echo ""
echo "========================================"
echo -e "${GREEN}✅ Test run complete${NC}"
echo "========================================"
