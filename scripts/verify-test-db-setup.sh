#!/bin/bash

# Test Database Setup Verification Script
# Verifies that test database configuration is working correctly

set -e

echo "🔍 StackLens AI - Test Database Configuration Verification"
echo "=========================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
echo "1️⃣  Checking .env configuration..."
if [ -f .env ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check for TEST_DATABASE_URL
    if grep -q "TEST_DATABASE_URL" .env; then
        TEST_DB_URL=$(grep "TEST_DATABASE_URL" .env | cut -d '=' -f2)
        echo -e "${GREEN}✅ TEST_DATABASE_URL is set: ${TEST_DB_URL}${NC}"
    else
        echo -e "${RED}❌ TEST_DATABASE_URL not found in .env${NC}"
        echo -e "${YELLOW}   Add: TEST_DATABASE_URL=./data/database/stacklens.test.db${NC}"
        exit 1
    fi
    
    # Check for DATABASE_URL
    if grep -q "DATABASE_URL" .env; then
        PROD_DB_URL=$(grep "^DATABASE_URL" .env | cut -d '=' -f2)
        echo -e "${GREEN}✅ DATABASE_URL is set: ${PROD_DB_URL}${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    echo -e "${YELLOW}   Run: cp .env.example .env${NC}"
    exit 1
fi

echo ""
echo "2️⃣  Checking test database directory..."
TEST_DB_DIR="data/database"
if [ -d "$TEST_DB_DIR" ]; then
    echo -e "${GREEN}✅ Test database directory exists: ${TEST_DB_DIR}${NC}"
else
    echo -e "${YELLOW}⚠️  Creating test database directory...${NC}"
    mkdir -p "$TEST_DB_DIR"
    echo -e "${GREEN}✅ Directory created${NC}"
fi

echo ""
echo "3️⃣  Checking test setup files..."
FILES=(
    "tests/global-setup.ts"
    "tests/global-teardown.ts"
    "apps/api/src/config/test-database.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ ${file}${NC}"
    else
        echo -e "${RED}❌ Missing: ${file}${NC}"
    fi
done

echo ""
echo "4️⃣  Checking playwright.config.ts..."
if grep -q "globalSetup" playwright.config.ts; then
    echo -e "${GREEN}✅ globalSetup configured${NC}"
else
    echo -e "${RED}❌ globalSetup not configured${NC}"
fi

if grep -q "globalTeardown" playwright.config.ts; then
    echo -e "${GREEN}✅ globalTeardown configured${NC}"
else
    echo -e "${RED}❌ globalTeardown not configured${NC}"
fi

if grep -q "TEST_DATABASE_URL" playwright.config.ts; then
    echo -e "${GREEN}✅ TEST_DATABASE_URL environment variable set${NC}"
else
    echo -e "${RED}❌ TEST_DATABASE_URL not set in playwright.config.ts${NC}"
fi

echo ""
echo "5️⃣  Checking API endpoints..."
if grep -q "/api/analysis/history/bulk-delete" apps/api/src/routes/main-routes.ts; then
    echo -e "${GREEN}✅ bulk-delete endpoint exists in main-routes.ts${NC}"
else
    echo -e "${RED}❌ bulk-delete endpoint missing in main-routes.ts${NC}"
fi

if grep -q "/api/analysis/history/bulk-delete" apps/api/src/routes/legacy-routes.ts; then
    echo -e "${GREEN}✅ bulk-delete endpoint exists in legacy-routes.ts${NC}"
else
    echo -e "${RED}❌ bulk-delete endpoint missing in legacy-routes.ts${NC}"
fi

echo ""
echo "6️⃣  Checking database configuration..."
if grep -q "isTestEnv" apps/api/src/config/database.ts; then
    echo -e "${GREEN}✅ Test environment detection configured${NC}"
else
    echo -e "${RED}❌ Test environment detection not configured${NC}"
fi

echo ""
echo "=========================================================="
echo -e "${GREEN}✅ Verification Complete!${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Run tests: pnpm test:e2e"
echo "   2. Check logs for: 'Database initialized: ... (TEST mode)'"
echo "   3. Verify production DB is unchanged after tests"
echo ""
echo "📖 For more details, see: docs/TEST_DATABASE_SETUP.md"
echo ""
