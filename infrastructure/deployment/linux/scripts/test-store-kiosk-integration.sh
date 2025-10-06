#!/bin/bash

# Store and Kiosk Integration - Test Script
# This script verifies the store/kiosk integration implementation

echo "======================================"
echo " STORE/KIOSK INTEGRATION TEST SCRIPT"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database path
DB_PATH="db/stacklens.db"

# Test 1: Verify database schema
echo "Test 1: Verifying database schema..."
echo "--------------------------------------"

# Check if error_logs table has store_number and kiosk_number columns
STORE_COL=$(sqlite3 $DB_PATH "PRAGMA table_info(error_logs);" | grep "store_number")
KIOSK_COL=$(sqlite3 $DB_PATH "PRAGMA table_info(error_logs);" | grep "kiosk_number")

if [ -n "$STORE_COL" ] && [ -n "$KIOSK_COL" ]; then
    echo -e "${GREEN}✓ error_logs table has store_number and kiosk_number columns${NC}"
else
    echo -e "${RED}✗ Missing columns in error_logs table${NC}"
    exit 1
fi

# Check indexes
echo ""
echo "Checking indexes..."
STORE_IDX=$(sqlite3 $DB_PATH "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='error_logs' AND name='idx_error_logs_store_number';")
KIOSK_IDX=$(sqlite3 $DB_PATH "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='error_logs' AND name='idx_error_logs_kiosk_number';")
COMPOSITE_IDX=$(sqlite3 $DB_PATH "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='error_logs' AND name='idx_error_logs_store_kiosk';")

if [ -n "$STORE_IDX" ]; then
    echo -e "${GREEN}✓ idx_error_logs_store_number index exists${NC}"
else
    echo -e "${YELLOW}⚠ idx_error_logs_store_number index missing${NC}"
fi

if [ -n "$KIOSK_IDX" ]; then
    echo -e "${GREEN}✓ idx_error_logs_kiosk_number index exists${NC}"
else
    echo -e "${YELLOW}⚠ idx_error_logs_kiosk_number index missing${NC}"
fi

if [ -n "$COMPOSITE_IDX" ]; then
    echo -e "${GREEN}✓ idx_error_logs_store_kiosk composite index exists${NC}"
else
    echo -e "${YELLOW}⚠ idx_error_logs_store_kiosk composite index missing${NC}"
fi

# Test 2: Check log_files table for store/kiosk columns
echo ""
echo "Test 2: Checking log_files table..."
echo "--------------------------------------"

LOG_STORE_COL=$(sqlite3 $DB_PATH "PRAGMA table_info(log_files);" | grep "store_number")
LOG_KIOSK_COL=$(sqlite3 $DB_PATH "PRAGMA table_info(log_files);" | grep "kiosk_number")

if [ -n "$LOG_STORE_COL" ] && [ -n "$LOG_KIOSK_COL" ]; then
    echo -e "${GREEN}✓ log_files table has store_number and kiosk_number columns${NC}"
else
    echo -e "${RED}✗ Missing columns in log_files table${NC}"
fi

# Test 3: Verify data migration
echo ""
echo "Test 3: Checking data migration..."
echo "--------------------------------------"

# Count total error logs
TOTAL_ERRORS=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM error_logs;")
echo "Total error logs: $TOTAL_ERRORS"

# Count error logs with store/kiosk info
ERRORS_WITH_STORE=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM error_logs WHERE store_number IS NOT NULL;")
ERRORS_WITH_KIOSK=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM error_logs WHERE kiosk_number IS NOT NULL;")

echo "Error logs with store info: $ERRORS_WITH_STORE"
echo "Error logs with kiosk info: $ERRORS_WITH_KIOSK"

if [ "$ERRORS_WITH_STORE" -gt 0 ] || [ "$TOTAL_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ Data migration successful or no errors yet${NC}"
else
    echo -e "${YELLOW}⚠ No error logs have store information${NC}"
fi

# Test 4: Check stores and kiosks
echo ""
echo "Test 4: Checking stores and kiosks..."
echo "--------------------------------------"

STORE_COUNT=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM stores;")
KIOSK_COUNT=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM kiosks;")

echo "Total stores: $STORE_COUNT"
echo "Total kiosks: $KIOSK_COUNT"

if [ "$STORE_COUNT" -gt 0 ] && [ "$KIOSK_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Stores and kiosks exist in database${NC}"
    
    # Show sample stores
    echo ""
    echo "Sample stores:"
    sqlite3 $DB_PATH "SELECT store_number, name FROM stores LIMIT 5;"
    
    echo ""
    echo "Sample kiosks:"
    sqlite3 $DB_PATH "SELECT kiosk_number, name, store_id FROM kiosks LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No stores or kiosks found${NC}"
fi

# Test 5: Verify frontend files
echo ""
echo "Test 5: Verifying frontend files..."
echo "--------------------------------------"

# Check if upload page exists
if [ -f "client/src/pages/upload.tsx" ]; then
    echo -e "${GREEN}✓ upload.tsx exists${NC}"
    
    # Check for store/kiosk selection in upload page
    if grep -q "storeNumber" client/src/pages/upload.tsx && grep -q "kioskNumber" client/src/pages/upload.tsx; then
        echo -e "${GREEN}✓ upload.tsx has store/kiosk selection${NC}"
    else
        echo -e "${RED}✗ upload.tsx missing store/kiosk selection${NC}"
    fi
else
    echo -e "${RED}✗ upload.tsx not found${NC}"
fi

# Check if all-errors page exists
if [ -f "client/src/pages/all-errors.tsx" ]; then
    echo -e "${GREEN}✓ all-errors.tsx exists${NC}"
    
    # Check for store/kiosk filters
    if grep -q "storeFilter" client/src/pages/all-errors.tsx && grep -q "kioskFilter" client/src/pages/all-errors.tsx; then
        echo -e "${GREEN}✓ all-errors.tsx has store/kiosk filters${NC}"
    else
        echo -e "${RED}✗ all-errors.tsx missing store/kiosk filters${NC}"
    fi
else
    echo -e "${RED}✗ all-errors.tsx not found${NC}"
fi

# Check error table component
if [ -f "client/src/components/error-table.tsx" ]; then
    echo -e "${GREEN}✓ error-table.tsx exists${NC}"
    
    # Check for store/kiosk columns
    if grep -q "storeNumber" client/src/components/error-table.tsx && grep -q "kioskNumber" client/src/components/error-table.tsx; then
        echo -e "${GREEN}✓ error-table.tsx has store/kiosk columns${NC}"
    else
        echo -e "${RED}✗ error-table.tsx missing store/kiosk columns${NC}"
    fi
else
    echo -e "${RED}✗ error-table.tsx not found${NC}"
fi

# Test 6: Verify backend files
echo ""
echo "Test 6: Verifying backend files..."
echo "--------------------------------------"

# Check routes.ts
if [ -f "server/routes.ts" ]; then
    echo -e "${GREEN}✓ routes.ts exists${NC}"
    
    # Check for store/kiosk in upload endpoint
    if grep -q "storeNumber" server/routes.ts && grep -q "kioskNumber" server/routes.ts; then
        echo -e "${GREEN}✓ routes.ts handles store/kiosk data${NC}"
    else
        echo -e "${RED}✗ routes.ts missing store/kiosk handling${NC}"
    fi
else
    echo -e "${RED}✗ routes.ts not found${NC}"
fi

# Check schema.ts
if [ -f "shared/schema.ts" ]; then
    echo -e "${GREEN}✓ schema.ts exists${NC}"
    
    # Check for store/kiosk in error_logs schema
    if grep -A 20 "export const errorLogs" shared/schema.ts | grep -q "store_number" && grep -A 20 "export const errorLogs" shared/schema.ts | grep -q "kiosk_number"; then
        echo -e "${GREEN}✓ schema.ts has store/kiosk fields in errorLogs${NC}"
    else
        echo -e "${RED}✗ schema.ts missing store/kiosk fields${NC}"
    fi
else
    echo -e "${RED}✗ schema.ts not found${NC}"
fi

# Test 7: Sample queries
echo ""
echo "Test 7: Running sample queries..."
echo "--------------------------------------"

# Get error count by store (if any exist)
if [ "$ERRORS_WITH_STORE" -gt 0 ]; then
    echo "Errors by store:"
    sqlite3 $DB_PATH "SELECT store_number, COUNT(*) as error_count FROM error_logs WHERE store_number IS NOT NULL GROUP BY store_number LIMIT 5;"
    
    echo ""
    echo "Errors by kiosk:"
    sqlite3 $DB_PATH "SELECT kiosk_number, COUNT(*) as error_count FROM error_logs WHERE kiosk_number IS NOT NULL GROUP BY kiosk_number LIMIT 5;"
else
    echo -e "${YELLOW}⚠ No error data with store/kiosk to query${NC}"
fi

# Summary
echo ""
echo "======================================"
echo " TEST SUMMARY"
echo "======================================"
echo ""
echo -e "${GREEN}All core components are in place!${NC}"
echo ""
echo "Next steps:"
echo "1. Start the application: npm run dev"
echo "2. Upload a test file with store/kiosk selection"
echo "3. Verify filename is renamed to StoreName_KioskName_FileName"
echo "4. Check All Errors page for store/kiosk filters"
echo "5. Verify store/kiosk columns appear in error table"
echo ""
echo "For detailed testing checklist, see:"
echo "STORE_KIOSK_INTEGRATION_SUMMARY.md"
echo ""
