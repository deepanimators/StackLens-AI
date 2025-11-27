# 🔧 Quick Fix Guide: Test Database & Bulk Delete

## ✅ What Was Fixed

### Issue 1: 404 Error on Bulk Delete
```
POST http://localhost:4000/api/analysis/history/bulk-delete 404 (Not Found)
```
**Status**: ✅ FIXED - Endpoint now exists in both route files

### Issue 2: Tests Using Production Database
```
Tests were writing to: data/database/stacklens.db (PRODUCTION)
```
**Status**: ✅ FIXED - Tests now use: data/database/stacklens.test.db (TEST)

---

## 🚀 Quick Start

### 1. Verify Setup
```bash
./scripts/verify-test-db-setup.sh
```
All checks should pass ✅

### 2. Run Tests
```bash
pnpm test:e2e
```
Tests will automatically use the test database.

### 3. Verify Database Isolation
Check server logs for:
```
🗄️  Database initialized: ./data/database/stacklens.test.db (TEST mode)
```

---

## 📋 Key Changes

### New API Endpoint
```typescript
POST /api/analysis/history/bulk-delete
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "historyIds": [1, 2, 3, 4, 5]
}

Response:
{
  "message": "Bulk delete completed: 5 analyses deleted, 0 failed",
  "totalDeleted": 5,
  "totalFailed": 0,
  "failedIds": [],
  "timestamp": "2025-11-27T..."
}
```

### Environment Variables
```env
# Production database
DATABASE_URL=./data/database/stacklens.db

# Test database (separate)
TEST_DATABASE_URL=./data/database/stacklens.test.db
```

### Automatic Database Selection
```typescript
// Production mode
NODE_ENV=development → Uses DATABASE_URL

// Test mode
NODE_ENV=test OR PLAYWRIGHT_TEST=1 → Uses TEST_DATABASE_URL
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `apps/api/src/config/test-database.ts` | Test DB utilities |
| `tests/global-setup.ts` | Initialize test DB |
| `tests/global-teardown.ts` | Clean up test DB |
| `docs/TEST_DATABASE_SETUP.md` | Full documentation |
| `scripts/verify-test-db-setup.sh` | Verification script |
| `TEST_DATABASE_FIX_SUMMARY.md` | Summary document |

## 📝 Files Modified

| File | Changes |
|------|---------|
| `playwright.config.ts` | Added global setup/teardown |
| `apps/api/src/config/database.ts` | Test mode detection |
| `apps/api/src/routes/main-routes.ts` | Bulk-delete endpoint |
| `apps/api/src/routes/legacy-routes.ts` | Bulk-delete endpoint |
| `.env` | Added TEST_DATABASE_URL |
| `.env.example` | Documented test config |

---

## 🔍 How to Verify It Works

### Check 1: Endpoint Exists
```bash
# With server running on port 4001
curl -X POST http://localhost:4001/api/analysis/history/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"historyIds": [1, 2, 3]}'
```
Should return 200 (not 404)

### Check 2: Test Database Used
```bash
# Before tests
ls -la data/database/stacklens.test.db  # Should not exist

# Run tests
pnpm test:e2e

# During tests (in another terminal)
ls -la data/database/stacklens.test.db  # Should exist

# After tests
ls -la data/database/stacklens.test.db  # Should not exist (cleaned up)
```

### Check 3: Production DB Unchanged
```bash
# Note the production DB size before tests
ls -lh data/database/stacklens.db

# Run tests
pnpm test:e2e

# Production DB should be unchanged
ls -lh data/database/stacklens.db
```

---

## 🐛 Troubleshooting

### Issue: Tests still using production DB

**Check environment variables:**
```bash
# Should be set during tests
echo $NODE_ENV           # Should be: test
echo $PLAYWRIGHT_TEST    # Should be: 1
echo $TEST_DATABASE_URL  # Should be: ./data/database/stacklens.test.db
```

**Check server logs:**
```
# Look for this when test server starts:
🗄️  Database initialized: ./data/database/stacklens.test.db (TEST mode)

# If you see this instead, env vars aren't working:
🗄️  Database initialized: ./data/database/stacklens.db (PRODUCTION mode)
```

**Solution:**
```bash
# Start test server manually with correct env vars
NODE_ENV=test PLAYWRIGHT_TEST=1 TEST_DATABASE_URL=./data/database/stacklens.test.db PORT=4001 pnpm run test:server
```

### Issue: 404 error persists

**Check the endpoint was added:**
```bash
# Should find the endpoint
grep -n "bulk-delete" apps/api/src/routes/main-routes.ts
grep -n "bulk-delete" apps/api/src/routes/legacy-routes.ts
```

**Restart the server:**
```bash
# Stop all running servers
pkill -f "test:server"
pkill -f "dev:server"

# Run verification
./scripts/verify-test-db-setup.sh

# Start tests (will auto-start server)
pnpm test:e2e
```

---

## 📚 Documentation

- **Full Guide**: [`docs/TEST_DATABASE_SETUP.md`](docs/TEST_DATABASE_SETUP.md)
- **Summary**: [`TEST_DATABASE_FIX_SUMMARY.md`](TEST_DATABASE_FIX_SUMMARY.md)
- **This File**: Quick reference for common tasks

---

## ✨ Benefits

| Benefit | Description |
|---------|-------------|
| 🛡️ **Safety** | Production data never touched during tests |
| 🧪 **Isolation** | Each test run starts fresh |
| 🚀 **Speed** | Parallel tests without conflicts |
| 🐛 **Debugging** | Easy to inspect test data |
| 🔄 **Consistency** | Predictable test behavior |

---

## 🎯 Quick Commands

```bash
# Verify everything is set up correctly
./scripts/verify-test-db-setup.sh

# Run all tests (auto-manages test DB)
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/integration/services.test.ts

# Start test server manually
NODE_ENV=test PLAYWRIGHT_TEST=1 TEST_DATABASE_URL=./data/database/stacklens.test.db PORT=4001 pnpm run test:server

# Check which database is being used
cat data/database/stacklens.db    # Production (should be larger)
cat data/database/stacklens.test.db # Test (may not exist when not testing)
```

---

## ❓ Questions?

1. Read the full documentation: `docs/TEST_DATABASE_SETUP.md`
2. Run the verification script: `./scripts/verify-test-db-setup.sh`
3. Check server logs for database initialization messages

---

**Last Updated**: 2025-11-27
**Status**: ✅ All issues resolved
