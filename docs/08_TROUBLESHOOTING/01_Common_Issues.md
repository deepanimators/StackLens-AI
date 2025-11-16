# Common Issues & Solutions - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**Audience:** Everyone

---

## 🆘 Troubleshooting Guide

Solutions for the most common issues encountered with StackLens AI.

---

## ⚡ Quick Diagnosis

Before diving into specific issues, try these first:

```bash
# Check if both servers are running
ps aux | grep node

# Verify ports are accessible
lsof -i :4000
lsof -i :5173

# Check logs
npm run logs

# Restart everything
npm run clean
npm install
npm run dev
```

---

## 🐛 Common Issues

### Issue 1: Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE :::4000
Port 4000 is already in use
```

**Causes:**
- Previous process didn't shut down cleanly
- Another application using the port
- Multiple npm dev processes running

**Solutions:**

**Option A: Kill Process Using Port**
```bash
# macOS/Linux
lsof -i :4000
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

**Option B: Use Different Port**
```bash
# Start on different port
PORT=4001 npm run dev:api

# Or update .env
echo "PORT=4001" >> .env
```

**Option C: Check What's Using Port**
```bash
# macOS
lsof -i :4000

# Linux
sudo netstat -tlnp | grep 4000

# See full process details
ps -ef | grep <PID>
```

### Issue 2: npm install Fails

**Error Message:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Cause:** Conflicting package versions

**Solution:**
```bash
# Option 1: Use legacy peer deps
npm install --legacy-peer-deps

# Option 2: Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Option 3: Use exact versions
npm install --save-exact
```

### Issue 3: TypeScript Errors

**Error Message:**
```
Error: Unable to compile TypeScript:
  src/index.ts(45,12) - error TS2307: Cannot find module
```

**Cause:** Missing type definitions or import paths

**Solution:**
```bash
# Check TypeScript errors
npm run type-check

# Install missing types
npm install --save-dev @types/node

# Fix imports
# Ensure paths are correct relative to file location
```

### Issue 4: Database Connection Error

**Error Message:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Database connection refused
```

**Causes:**
- PostgreSQL not running
- Wrong connection string
- Database doesn't exist

**Solutions:**

**Check PostgreSQL Status:**
```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql

# Start if stopped
sudo systemctl start postgresql
```

**Verify Connection String:**
```bash
# Test connection
psql postgresql://user:password@localhost:5432/dbname

# Check .env file
cat .env | grep DATABASE_URL
```

**Create Database:**
```bash
# Connect as admin
psql -U postgres

# Create database
CREATE DATABASE stacklens_dev;

# Create user
CREATE USER stacklens_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE stacklens_dev TO stacklens_user;

# Exit
\q
```

### Issue 5: Jira Integration Not Working

**Error Message:**
```
Error: Jira authentication failed
401 Unauthorized
```

**Causes:**
- Invalid API token
- Wrong project key
- Jira URL incorrect
- API not enabled

**Solutions:**

**Verify Jira Configuration:**
```bash
# Check environment variables
echo $JIRA_API_URL
echo $JIRA_USERNAME
echo $JIRA_API_TOKEN

# Test connection
curl -X GET https://your-domain.atlassian.net/rest/api/3/myself \
  -u "email@example.com:api-token"
```

**Get New API Token:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token
4. Update `.env` with new token
5. Restart API server

**Verify Project Key:**
```bash
# List all projects (requires authentication)
curl -X GET https://your-domain.atlassian.net/rest/api/3/project \
  -H "Authorization: Basic $(echo -n 'email:token' | base64)"
```

### Issue 6: LogWatcher Service Not Starting

**Error Message:**
```
LogWatcher service failed to start
Error: ENOENT - File not found
```

**Causes:**
- Log file path doesn't exist
- Permission denied
- Wrong path in configuration

**Solutions:**

**Create Log Directories:**
```bash
mkdir -p data/logs
mkdir -p logs
chmod 755 data/ logs/
```

**Check Log Path Configuration:**
```typescript
// In demo-pos-app/src/pos-service.ts
this.logPath = path.resolve(
  process.cwd(), 
  "..", 
  "data", 
  "pos-application.log"
);
```

**Verify Path Exists:**
```bash
# Check if directory exists
ls -la data/

# Create if missing
mkdir -p data
touch data/pos-application.log
chmod 644 data/pos-application.log
```

### Issue 7: Dashboard Not Updating

**Error Message:**
```
Dashboard shows old data
SSE connection failing
```

**Causes:**
- SSE not configured correctly
- CORS issue
- Browser cache
- Connection timeout

**Solutions:**

**Check CORS Configuration:**
```bash
# Verify CORS headers
curl -I http://localhost:4000/api/sse/events

# Should include:
# Access-Control-Allow-Origin: http://localhost:5173
```

**Clear Browser Cache:**
```bash
# In Chrome DevTools:
1. Open DevTools (F12)
2. Application → Cache Storage
3. Clear all entries
4. Hard refresh (Ctrl+Shift+R)
```

**Check SSE Connection:**
```javascript
// In browser console
const events = new EventSource('http://localhost:4000/api/sse/events');
events.addEventListener('error', console.error);
events.addEventListener('message', console.log);
```

### Issue 8: High Memory Usage

**Error Message:**
```
Process using excessive memory
Kill due to memory limit exceeded
```

**Causes:**
- Memory leak in service
- Large error queue
- Unclosed database connections

**Solutions:**

**Monitor Memory:**
```bash
# Use PM2 (if production)
pm2 monit

# Manual monitoring
node --max-old-space-size=4096 index.js
```

**Check for Memory Leaks:**
```bash
# Restart service
npm run dev:api

# Monitor over time
npm run test:memory
```

**Clear Old Data:**
```bash
# Archive old errors (weekly)
npm run db:archive

# Check database size
du -sh data/database.db
```

### Issue 9: Slow API Responses

**Error Message:**
```
API response time > 1000ms
Dashboard loading slowly
```

**Causes:**
- Large error list
- Unindexed database queries
- Network latency
- Insufficient resources

**Solutions:**

**Check Response Time:**
```bash
# Time API calls
time curl http://localhost:4000/api/errors

# Monitor in browser DevTools
1. Open Network tab
2. Check response times for API calls
```

**Optimize Database:**
```bash
# Create indexes
npm run db:index

# Analyze queries
npm run db:analyze

# Run maintenance
npm run db:vacuum
```

**Limit Results:**
```javascript
// In API call, use pagination
fetch('/api/errors?limit=50&offset=0')
```

### Issue 10: Build Fails

**Error Message:**
```
Build failed with exit code 1
npm run build returns error
```

**Causes:**
- TypeScript errors
- Missing dependencies
- Vite configuration issue
- Insufficient disk space

**Solutions:**

**Check Build Output:**
```bash
# Verbose build
npm run build -- --debug

# Check for errors
npm run type-check
npm run lint
```

**Clear Build Cache:**
```bash
# Remove build artifacts
rm -rf dist/ .vite/ node_modules/.vite

# Rebuild
npm run build
```

**Check Disk Space:**
```bash
# macOS/Linux
df -h

# Free up space if needed
npm cache clean --force
rm -rf node_modules
```

---

## 🔍 Debugging Techniques

### Enable Debug Logging

```bash
# Set debug mode
DEBUG=* npm run dev

# Or specific module
DEBUG=stacklens:* npm run dev

# Check logs
tail -f logs/debug.log
```

### Inspect Network Requests

**In Browser:**
1. Open DevTools (F12)
2. Go to Network tab
3. Check API calls
4. Look for failed requests (red)
5. Examine response/request headers

### Check Server Logs

```bash
# API server logs
npm run logs:api

# Frontend errors
npm run logs:web

# Full logs
npm run logs
```

### Database Debugging

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Check recent errors
SELECT * FROM errors ORDER BY created_at DESC LIMIT 5;

# Check stuck transactions
SELECT * FROM pg_stat_activity;
```

---

## 📊 Performance Optimization

### Frontend Optimization

```bash
# Build analysis
npm run build:analyze

# Check bundle size
npm run build && du -sh dist/
```

### Backend Optimization

```bash
# Check database query performance
npm run db:analyze

# Review slow endpoints
npm run test:performance
```

---

## 🆘 When Nothing Works

### Nuclear Option: Reset Everything

```bash
# Backup important data first!
cp -r data/ data.backup/

# Stop servers
npm run stop

# Clean everything
npm run clean

# Reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild database
rm -rf data/database.db
npm run db:migrate

# Start fresh
npm run dev
```

### Get Help

1. Check [FAQ](./04_FAQ.md)
2. Search [GitHub Issues](https://github.com/deepanimators/StackLens-AI/issues)
3. Read [Debug Guide](./02_Debug_Guide.md)
4. Open new issue with:
   - Full error message
   - Steps to reproduce
   - System info (OS, Node version, etc.)
   - Relevant logs

---

## 📞 Error Reference Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `EADDRINUSE` | Port in use | Kill process or use different port |
| `ECONNREFUSED` | Connection refused | Check database/service running |
| `ENOENT` | File not found | Create missing directory/file |
| `EACCES` | Permission denied | Fix file permissions |
| `ERESOLVE` | Dependency conflict | Use --legacy-peer-deps |
| `ERR_HTTP_HEADERS_SENT` | Headers already sent | Check response sending code |
| `TIMEOUT` | Operation timed out | Increase timeout or check network |

---

## 📈 Monitoring Checklist

- [ ] Check API health endpoint daily
- [ ] Review error trends weekly
- [ ] Check disk space usage weekly
- [ ] Verify backups working weekly
- [ ] Review Jira integration status weekly
- [ ] Check LogWatcher service running
- [ ] Verify database connections
- [ ] Monitor memory usage

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete  
**Related:** [FAQ](./04_FAQ.md) | [Debug Guide](./02_Debug_Guide.md)
