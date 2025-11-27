# Test Database Configuration - Implementation Guide

## Overview
This document describes the implementation of a separate test database system for StackLens AI to prevent test data from contaminating the production database.

## Problems Solved

### 1. Missing Bulk Delete Endpoint (404 Error)
**Issue**: Frontend was calling `POST /api/analysis/history/bulk-delete` which didn't exist.

**Solution**: 
- Added bulk delete endpoint to both `main-routes.ts` and `legacy-routes.ts`
- Endpoint accepts `{ historyIds: number[] }` and deletes multiple analysis records
- Includes ownership validation and detailed response with success/failure counts

**Location**: 
- `apps/api/src/routes/main-routes.ts` (after line 5850)
- `apps/api/src/routes/legacy-routes.ts` (after line 4815)

### 2. Tests Using Production Database
**Issue**: All tests were using `data/database/stacklens.db` - the production database.

**Solution**: Implemented separate test database system with automatic lifecycle management.

## Implementation Details

### Configuration Files

#### 1. Environment Variables
**File**: `.env`
```env
DATABASE_URL=./data/database/stacklens.db
TEST_DATABASE_URL=./data/database/stacklens.test.db
```

#### 2. Playwright Configuration
**File**: `playwright.config.ts`

**Changes**:
- Set `NODE_ENV=test` and `PLAYWRIGHT_TEST=1` for test runs
- Added `globalSetup` and `globalTeardown` hooks
- Pass test environment variables to backend server during tests

**Environment Setup**:
```typescript
process.env.NODE_ENV = 'test';
process.env.PLAYWRIGHT_TEST = '1';
process.env.TEST_DATABASE_URL = './data/database/stacklens.test.db';
```

#### 3. Database Configuration
**File**: `apps/api/src/config/database.ts`

**Changes**:
- Detects test environment (`NODE_ENV=test` or `PLAYWRIGHT_TEST=1`)
- Uses `TEST_DATABASE_URL` when in test mode
- Uses `DATABASE_URL` for production
- Logs which database is being used

#### 4. Test Database Utilities
**File**: `apps/api/src/config/test-database.ts`

**Functions**:
- `initializeDatabase()` - Creates database connection
- `getDatabase()` - Returns database instance (lazy init)
- `closeDatabase()` - Closes connection
- `resetTestDatabase()` - Clears all data (test-only)
- `deleteTestDatabase()` - Removes database file (test-only)
- `createTestDatabase()` - Creates fresh database (test-only)

### Test Lifecycle Management

#### Global Setup
**File**: `tests/global-setup.ts`

**Actions**:
1. Sets test environment variables
2. Creates test database directory if needed
3. Removes existing test database for fresh start
4. Runs database migrations using drizzle
5. Initializes schema in test database

**Run**: Once before all test workers start

#### Global Teardown
**File**: `tests/global-teardown.ts`

**Actions**:
1. Removes test database file
2. Cleans up WAL and SHM files
3. Ensures no test artifacts remain

**Run**: Once after all test workers complete

## Database Separation Logic

### Production Mode
```
NODE_ENV=development (or production)
→ Uses DATABASE_URL
→ Database: data/database/stacklens.db
```

### Test Mode
```
NODE_ENV=test OR PLAYWRIGHT_TEST=1
→ Uses TEST_DATABASE_URL
→ Database: data/database/stacklens.test.db
```

## How It Works

### 1. Test Execution Flow

```
┌─────────────────────────────────────┐
│ Playwright Test Runner Starts       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Global Setup (global-setup.ts)      │
│ - Set test env vars                 │
│ - Create test database directory    │
│ - Remove old test database          │
│ - Run migrations on test DB         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Start Backend Server                │
│ - Detects test environment          │
│ - Connects to stacklens.test.db     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Run Tests                            │
│ - All operations use test database  │
│ - Data isolated from production     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Global Teardown (global-teardown.ts)│
│ - Remove test database              │
│ - Clean up temporary files          │
└─────────────────────────────────────┘
```

### 2. Database Selection Logic

**In `apps/api/src/config/database.ts`**:
```typescript
const isTestEnv = process.env.NODE_ENV === 'test' || 
                  process.env.PLAYWRIGHT_TEST === '1';

const getDatabaseUrl = () => {
  if (isTestEnv && process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL; // Test DB
  }
  return process.env.DATABASE_URL; // Production DB
};
```

## API Endpoint: Bulk Delete

### Endpoint Details
```
POST /api/analysis/history/bulk-delete
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "historyIds": [1, 2, 3, 4, 5]
}

Response:
{
  "message": "Bulk delete completed: 5 analyses deleted, 0 failed",
  "totalDeleted": 5,
  "totalFailed": 0,
  "failedIds": [],
  "timestamp": "2025-11-27T10:00:00.000Z"
}
```

### Features
- ✅ Validates all IDs are valid numbers
- ✅ Checks ownership for each analysis
- ✅ Continues on individual failures
- ✅ Returns detailed success/failure counts
- ✅ Lists failed IDs for debugging

## Running Tests

### Automatic (Recommended)
```bash
# Playwright automatically manages test database
pnpm test:e2e
```

### Manual Test Server
```bash
# Start server with test database
NODE_ENV=test PLAYWRIGHT_TEST=1 TEST_DATABASE_URL=./data/database/stacklens.test.db PORT=4001 pnpm run test:server
```

## Verification

### Check Which Database is Being Used
Look for log output when server starts:
```
🗄️  Database initialized: ./data/database/stacklens.test.db (TEST mode)
```
or
```
🗄️  Database initialized: ./data/database/stacklens.db (PRODUCTION mode)
```

### Verify Test Database Isolation
1. Run tests: `pnpm test:e2e`
2. Check production database: `data/database/stacklens.db` should be unchanged
3. Test database `data/database/stacklens.test.db` should be created and removed

## Benefits

### ✅ Data Isolation
- Tests never touch production data
- Safe to run tests in any environment
- No cleanup required in production DB

### ✅ Parallel Testing
- Each test suite can have clean database state
- No conflicts between test runs
- Faster test execution

### ✅ Consistent State
- Fresh database for each test run
- Predictable test behavior
- No flaky tests due to leftover data

### ✅ Easy Debugging
- Test database preserved on failure (if configured)
- Can inspect test data without affecting production
- Clear separation of concerns

## Troubleshooting

### Test Database Not Created
**Symptom**: Tests fail with database errors

**Solution**:
1. Check `TEST_DATABASE_URL` is set in `.env`
2. Ensure directory exists: `mkdir -p data/database`
3. Check global setup runs: Look for "Global Setup" in test output

### Still Using Production Database
**Symptom**: Tests modify production data

**Solution**:
1. Verify environment variables: `NODE_ENV=test` and `PLAYWRIGHT_TEST=1`
2. Check backend server logs for database path
3. Restart backend server with test env vars

### Migration Errors
**Symptom**: Test database schema is incorrect

**Solution**:
```bash
# Run migrations manually on test database
DATABASE_URL=./data/database/stacklens.test.db pnpm run db:push
```

## Files Changed

### Created
1. `apps/api/src/config/test-database.ts` - Test database utilities
2. `tests/global-setup.ts` - Test initialization
3. `tests/global-teardown.ts` - Test cleanup
4. `tests/test-setup.ts` - Per-test setup helper

### Modified
1. `playwright.config.ts` - Added global setup/teardown, test env vars
2. `apps/api/src/config/database.ts` - Added test mode detection
3. `apps/api/src/routes/main-routes.ts` - Added bulk-delete endpoint
4. `apps/api/src/routes/legacy-routes.ts` - Added bulk-delete endpoint
5. `.env` - Added TEST_DATABASE_URL
6. `.env.example` - Added TEST_DATABASE_URL documentation

## Best Practices

### For Test Writers
1. Don't manually manage database connections in tests
2. Let global setup/teardown handle database lifecycle
3. Tests should be idempotent and isolated
4. Don't assume specific data exists - create what you need

### For Developers
1. Always check environment when debugging database issues
2. Never manually edit test database during test runs
3. Use `resetTestDatabase()` if you need clean state in specific test
4. Keep production and test database schemas in sync

## Future Improvements

### Potential Enhancements
1. Database seeding with common test data
2. Snapshot/restore functionality for test database
3. Per-test-suite database isolation
4. Database migration testing
5. Test data factories for common entities

### Performance Optimizations
1. Cache test database between test runs (optional)
2. Use in-memory SQLite for faster tests
3. Parallel test worker database isolation
