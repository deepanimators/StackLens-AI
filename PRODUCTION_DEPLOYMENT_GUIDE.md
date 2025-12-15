# Production Deployment Guide - API Credential Priority System

## Overview
This document provides step-by-step instructions for deploying the API Credential Priority System to production, including pre-deployment checks, database migration, testing, and rollback procedures.

**Deployment Date:** December 15, 2025  
**Version:** 1.0.0  
**Status:** Ready for Production

---

## Pre-Deployment Checklist

### Code Changes ✅
- [x] Priority field added to database schema (both packages)
- [x] Credential service enhanced with priority methods
- [x] AI service updated to use priority ordering
- [x] API routes updated to handle priority
- [x] Frontend component updated with priority UI
- [x] Jira automation verified (disabled for uploads, enabled for real-time)
- [x] Database migration generated (drizzle/0000_fluffy_aqueduct.sql)

### Testing ✅
- [x] Schema migration tested locally
- [x] Credential service methods verified
- [x] AI service initialization tested
- [x] Frontend UI functional
- [x] Default priorities assigned correctly
- [x] Backward compatibility confirmed

### Documentation ✅
- [x] Implementation guide created (CREDENTIAL_PRIORITY_IMPLEMENTATION.md)
- [x] Verification checklist created (IMPLEMENTATION_VERIFICATION.md)
- [x] Test script created (test-credential-priority.sh)
- [x] Deployment guide created (this document)

---

## Pre-Deployment Steps (Before Production)

### Step 1: Backup Production Database
```bash
# On production server
cp /path/to/stacklens.db /path/to/stacklens.db.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Stop All Running Services
```bash
# Stop the running API
pm2 stop stacklens-api

# Verify it's stopped
pm2 list | grep stacklens
```

### Step 3: Pull Latest Code
```bash
cd /path/to/StackLens-AI-Deploy
git pull origin main
git log --oneline -5  # Verify latest commits
```

### Step 4: Install Dependencies
```bash
pnpm install
```

### Step 5: Build the Project
```bash
pnpm build
```

---

## Database Migration Steps

### Option A: Automated Migration (Recommended)
```bash
# Navigate to project directory
cd /path/to/StackLens-AI-Deploy

# Generate migrations (if not already generated)
pnpm db:generate

# Apply migrations with confirmation
pnpm db:push
# When prompted: Select "Yes, I want to execute all statements"
```

### Option B: Manual SQL Execution
If automated migration fails, execute the migration SQL manually:

```sql
-- Connect to SQLite database
sqlite3 /path/to/stacklens.db

-- Create temporary table with new schema
CREATE TABLE `__new_api_credentials` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `name` text NOT NULL,
    `provider` text NOT NULL,
    `api_key` text,
    `api_secret` text,
    `endpoint` text,
    `priority` integer DEFAULT 100 NOT NULL,
    `is_active` integer DEFAULT true NOT NULL,
    `is_global` integer DEFAULT true NOT NULL,
    `user_id` integer,
    `rate_limit` integer,
    `usage_count` integer DEFAULT 0 NOT NULL,
    `current_month_usage` integer DEFAULT 0 NOT NULL,
    `last_used` integer,
    `created_at` integer NOT NULL,
    `updated_at` integer NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

-- Copy data from old table
INSERT INTO `__new_api_credentials`("id", "name", "provider", "api_key", "api_secret", "endpoint", 
    "priority", "is_active", "is_global", "user_id", "rate_limit", "usage_count", "current_month_usage", 
    "last_used", "created_at", "updated_at") 
SELECT "id", "name", "provider", "api_key", "api_secret", "endpoint", "priority", "is_active", "is_global", 
    "user_id", "rate_limit", "usage_count", "current_month_usage", "last_used", "created_at", "updated_at" 
FROM `api_credentials`;

-- Replace old table with new one
DROP TABLE `api_credentials`;
ALTER TABLE `__new_api_credentials` RENAME TO `api_credentials`;
CREATE UNIQUE INDEX `api_credentials_name_unique` ON `api_credentials` (`name`);

-- Verify migration
SELECT COUNT(*) FROM api_credentials;
PRAGMA table_info(api_credentials);
```

### Verify Migration Success
```bash
# Check that priority column exists
sqlite3 /path/to/stacklens.db "PRAGMA table_info(api_credentials);" | grep priority

# Verify data integrity
sqlite3 /path/to/stacklens.db "SELECT COUNT(*) FROM api_credentials;"
```

---

## Post-Migration Steps

### Step 1: Set Default Priorities for Existing Credentials
If you have existing credentials in production, set appropriate priorities:

```sql
sqlite3 /path/to/stacklens.db

-- Set default priorities by provider
UPDATE api_credentials SET priority = 10 WHERE provider = 'gemini' AND priority = 100;
UPDATE api_credentials SET priority = 20 WHERE provider = 'groq' AND priority = 100;
UPDATE api_credentials SET priority = 30 WHERE provider = 'openrouter' AND priority = 100;
UPDATE api_credentials SET priority = 40 WHERE provider = 'openai' AND priority = 100;
UPDATE api_credentials SET priority = 50 WHERE provider = 'anthropic' AND priority = 100;

-- Verify
SELECT name, provider, priority FROM api_credentials ORDER BY priority;
```

### Step 2: Start the API Server
```bash
# Start with PM2 (if using PM2)
pm2 start dist/index.js --name stacklens-api

# Or with Node directly
NODE_ENV=production node dist/index.js

# Verify it's running
pm2 list | grep stacklens
```

### Step 3: Verify Server Startup
```bash
# Wait for server to start
sleep 5

# Check if port 4000 is listening
lsof -i :4000

# Test health endpoint
curl http://localhost:4000/api/test
# Expected response: {"message":"Server is working","timestamp":"..."}
```

### Step 4: Test Credential Selection
```bash
# Run the test script
./test-credential-priority.sh

# Expected output:
# - All credentials created successfully
# - Credentials listed in priority order
# - Real-time error automation works
# - Database schema verified
```

### Step 5: Verify Logging
Check that API service logs show correct initialization:

```bash
# Look for priority logging in startup
pm2 logs stacklens-api | grep -i "priority\|provider" | head -20

# Expected lines:
# "Provider: gemini | Priority: 10"
# "Provider: groq | Priority: 20"
# "Provider: openrouter | Priority: 30"
```

---

## Testing in Production

### Test 1: Add Test Credentials
```bash
curl -X POST http://localhost:4000/api/admin/credentials \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gemini-Prod",
    "provider": "gemini",
    "apiKey": "your-gemini-key",
    "priority": 10,
    "isGlobal": true
  }'
```

### Test 2: Verify Credential Retrieval
```bash
curl http://localhost:4000/api/admin/credentials \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.[] | {name, provider, priority}'

# Expected output (sorted by priority):
# {
#   "name": "Gemini-Prod",
#   "provider": "gemini",
#   "priority": 10
# }
# {
#   "name": "Groq-Prod",
#   "provider": "groq",
#   "priority": 20
# }
```

### Test 3: Verify Jira Automation
```bash
# File upload should NOT create Jira ticket
curl -X POST http://localhost:4000/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/logfile.txt"

# Real-time error SHOULD create Jira ticket
curl -X POST http://localhost:4000/api/automation/execute \
  -H "Content-Type: application/json" \
  -d '{
    "errorType": "CriticalError",
    "severity": "critical",
    "message": "Production error detected"
  }'

# Check Jira - should have a new ticket
```

---

## Monitoring and Validation

### Key Metrics to Monitor
1. **API Response Time:** Should remain under 200ms
2. **Error Rates:** Should not increase
3. **Credential Selection:** Monitor logs for proper provider selection
4. **Database Performance:** Monitor query times

### Logs to Watch
```bash
# Monitor API logs
pm2 logs stacklens-api

# Watch for initialization messages
tail -f /path/to/logs/stacklens.log | grep -i "credential\|priority\|provider"

# Check for errors
tail -f /path/to/logs/error.log
```

### Health Checks
```bash
# Check API health
curl http://localhost:4000/api/test

# Check database connectivity
curl http://localhost:4000/api/admin/credentials -H "Authorization: Bearer TOKEN"

# Check credential service
curl http://localhost:4000/api/admin/credentials?provider=gemini -H "Authorization: Bearer TOKEN"
```

---

## Rollback Procedure (If Needed)

### Option 1: Rollback to Previous Database Snapshot
```bash
# Stop the API
pm2 stop stacklens-api

# Restore from backup
cp /path/to/stacklens.db.backup.TIMESTAMP /path/to/stacklens.db

# Restart API
pm2 start stacklens-api

# Verify
pm2 logs stacklens-api | head -30
```

### Option 2: Rollback Code
```bash
# Stop the API
pm2 stop stacklens-api

# Revert to previous commit
git revert <commit-hash>
git push origin main

# Rebuild
pnpm build

# Restart
pm2 start dist/index.js --name stacklens-api

# Verify
pm2 logs stacklens-api | head -30
```

### Option 3: Full Rollback
```bash
# Stop services
pm2 stop stacklens-api

# Restore database backup
cp /path/to/stacklens.db.backup.TIMESTAMP /path/to/stacklens.db

# Revert code
git checkout <previous-release-tag>

# Rebuild and restart
pnpm install
pnpm build
pm2 start dist/index.js --name stacklens-api
```

---

## Post-Deployment Validation

### Checklist
- [ ] API server started successfully
- [ ] Database migration completed without errors
- [ ] Health checks passing
- [ ] Credential endpoints responding correctly
- [ ] Jira automation verified:
  - [ ] Real-time errors create tickets
  - [ ] File uploads do NOT create tickets
- [ ] Logs show correct provider initialization with priorities
- [ ] Users can access admin UI
- [ ] Credentials can be created with priorities
- [ ] Credentials can be edited to change priorities
- [ ] Performance metrics normal

### User Communication
Send deployment notification:
```
Subject: StackLens-AI Production Deployment Complete

The API Credential Priority System has been successfully deployed to production.

Key Changes:
- Added priority-based API credential selection
- Credentials now loaded from database (not environment variables)
- Default priorities: Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50
- Jira automation only for real-time errors (not file uploads)

How to Use:
1. Navigate to Admin > API Credentials
2. Add your API credentials with priorities
3. System will use highest priority credential (lowest number)
4. Credentials are encrypted and secure

No action required. All existing functionality preserved.
```

---

## Success Criteria

✅ **Deployment successful when:**
1. API server starts without errors
2. Database migration completes successfully
3. All health checks pass
4. Credentials can be created and listed with priorities
5. AI service initializes with correct priority ordering
6. Real-time error automation creates Jira tickets
7. File upload automation does NOT create Jira tickets
8. Performance metrics remain normal
9. No increase in error rates
10. All users can access the system

---

## Support and Troubleshooting

### Common Issues

**Issue: Port 4000 already in use**
```bash
lsof -i :4000
kill -9 <PID>
```

**Issue: Database locked**
```bash
# Check for open connections
sqlite3 /path/to/stacklens.db ".open /path/to/stacklens.db"

# Force close
pkill -9 sqlite3
```

**Issue: Migration failed - column already exists**
```bash
# Check existing schema
sqlite3 /path/to/stacklens.db "PRAGMA table_info(api_credentials);"

# If priority column exists, rollback migration attempt
git reset --hard HEAD~1
```

**Issue: Credentials not loading from database**
```bash
# Check encryption key is set
echo $ENCRYPTION_KEY

# Verify credentials exist in database
sqlite3 /path/to/stacklens.db "SELECT COUNT(*) FROM api_credentials;"

# Check API logs for errors
pm2 logs stacklens-api | grep -i "error\|credential"
```

### Contact
For deployment issues, contact the development team with:
- Error message and timestamp
- Server logs (last 100 lines)
- Database state (count of tables and rows)
- Steps taken to reproduce the issue

---

## Deployment Completed ✅

**Deployment Date:** [Date]  
**Deployed By:** [Name]  
**Verification Status:** All checks passed  
**Rollback Status:** Ready (backup at [path])  

**Notes:**
- Migration completed successfully
- All services started
- Health checks passing
- Ready for user access

---

## Version Information

- **Code Version:** Main branch (commit hash: `git rev-parse --short HEAD`)
- **Database Schema Version:** 0000_fluffy_aqueduct.sql
- **API Version:** 1.0.0
- **Deployment Type:** Blue-Green / Rolling Update / In-Place
- **Estimated Downtime:** 5-10 minutes (during migration)

---

**Document Version:** 1.0  
**Last Updated:** December 15, 2025  
**Next Review:** After successful production deployment
