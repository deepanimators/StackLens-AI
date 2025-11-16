# StackLens AI - Jira Integration Setup Guide

## Overview

This guide explains how to set up and use the complete Jira integration system with StackLens AI.

**Architecture**:
- 🎯 **Demo POS App** (Standalone): Generates intentional errors
- 🔍 **Log Watcher**: Monitors log files in real-time
- 🤖 **Error Automation**: Makes intelligent decisions
- 🎫 **Jira Integration**: Creates automatic tickets

---

## Quick Start (5 minutes)

### Step 1: Start Demo POS Application

```bash
cd demo-pos-app
npm install
npm run dev
```

The POS app will start on `http://localhost:3001`

**Test it**:
```bash
curl http://localhost:3001/health
# Output: {"status":"ok","service":"demo-pos"}
```

### Step 2: Configure Jira Integration

Create `.env` file in root directory with your Jira details:

```bash
JIRA_HOST=https://your-company.atlassian.net
JIRA_PROJECT_KEY=BUG
JIRA_USER_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token_here
POS_LOG_FILE_PATH=logs/pos-application.log
```

**How to get Jira API Token**:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Copy the token
4. Paste into `.env` file

### Step 3: Verify StackLens Configuration

```bash
# Check Jira status
curl http://localhost:3000/api/jira/status

# Expected response:
# {"success":true,"data":{"configured":true,"host":"https://...","project":"BUG"}}
```

### Step 4: Start Log Watcher

```bash
# Start watching log files
curl -X POST http://localhost:3000/api/watcher/start

# Check status
curl http://localhost:3000/api/watcher/status
```

### Step 5: Create Orders and Trigger Errors

Create an order with product #999 (no price = intentional error):

```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'
```

Expected response (400 error):
```json
{
  "success": false,
  "data": {
    "orderId": "uuid-xxx",
    "status": "failed",
    "error": "Product #999 (Mystery Product) has no pricing information"
  }
}
```

### Step 6: Check Jira Ticket

1. Open Jira: `https://your-company.atlassian.net`
2. Find the newly created bug ticket
3. Ticket title: `[CRITICAL] MISSING_PRICE_ERROR: Product #999...`
4. Ticket should be in "Blocker" priority

### Step 7: Monitor Real-time Events

```bash
# Open real-time stream
curl -N http://localhost:3000/api/monitoring/live

# You'll see events like:
# data: {"type":"connected","message":"..."}
# data: {"type":"error-detected","data":{...}}
# data: {"type":"ticket-created","data":{...}}
```

---

## Detailed Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Jira Cloud account with API access
- StackLens AI running on localhost:3000

### Installation

#### 1. Install Demo POS Dependencies

```bash
cd demo-pos-app
npm install
```

#### 2. Install StackLens AI Dependencies

```bash
cd apps/api
npm install
```

#### 3. Configure Environment Variables

Create `.env` file in project root:

```bash
# Jira Configuration (Required for integration)
JIRA_HOST=https://your-company.atlassian.net
JIRA_PROJECT_KEY=BUG
JIRA_USER_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_jira_api_token

# Demo POS Configuration (Optional)
POS_LOG_FILE_PATH=logs/pos-application.log
POS_PORT=3001
STORE_NUMBER=STORE_001
KIOSK_NUMBER=KIOSK_001

# StackLens Configuration
STACKLENS_PORT=3000
STACKLENS_URL=http://localhost:3000

# Automation Settings (Optional)
AUTOMATION_ENABLED=true
CRITICAL_THRESHOLD=0.0
HIGH_THRESHOLD=0.75
MEDIUM_THRESHOLD=0.90
```

### Running the System

#### Terminal 1: Demo POS Application

```bash
cd demo-pos-app
npm run dev
```

Output:
```
╔════════════════════════════════════════════════════════════╗
║        Demo POS Application - StackLens AI Showcase         ║
╚════════════════════════════════════════════════════════════╝

📍 Server running at http://localhost:3001
🔗 StackLens AI connected at: http://localhost:3000
```

#### Terminal 2: StackLens AI

```bash
npm run dev:server
```

StackLens API will start on `http://localhost:3000`

#### Terminal 3: StackLens Web UI (Optional)

```bash
npm run dev:client
```

Web UI will start on `http://localhost:5173`

---

## Testing Scenarios

### Scenario 1: Single Error Triggers Ticket

```bash
# Create order with product #999
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Check Jira - ticket should be created
# Check automation status
curl http://localhost:3000/api/automation/status
# Should show: "ticketsCreated": 1
```

### Scenario 2: Duplicate Error Updates Existing Ticket

```bash
# Create same error twice
curl -X POST http://localhost:3001/orders \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Wait 2 seconds
sleep 2

# Create again
curl -X POST http://localhost:3001/orders \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Check automation status
curl http://localhost:3000/api/automation/status
# Should show: "ticketsCreated": 1, "ticketsUpdated": 1
```

### Scenario 3: Successful Orders Don't Create Tickets

```bash
# Create order with valid product
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 1, "quantity": 2}]}'

# Check automation status - should not increase
curl http://localhost:3000/api/automation/status
```

### Scenario 4: Test Automation Toggle

```bash
# Disable automation
curl -X POST http://localhost:3000/api/automation/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'

# Create error - should skip
curl -X POST http://localhost:3001/orders \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Check status - "skipped" should increase
curl http://localhost:3000/api/automation/status

# Re-enable
curl -X POST http://localhost:3000/api/automation/toggle \
  -d '{"enabled": true}'
```

---

## API Reference

### Jira Status Endpoint

```bash
GET /api/jira/status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "configured": true,
    "host": "https://company.atlassian.net",
    "project": "BUG",
    "message": "Jira integration is configured and ready"
  }
}
```

### Automation Status Endpoint

```bash
GET /api/automation/status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "totalProcessed": 5,
    "ticketsCreated": 3,
    "ticketsUpdated": 1,
    "skipped": 1,
    "failed": 0
  }
}
```

### Log Watcher Status Endpoint

```bash
GET /api/watcher/status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "isWatching": true,
    "watchedFiles": ["logs/pos-application.log"],
    "totalErrors": 5,
    "lastUpdate": "2024-11-13T10:30:45.123Z",
    "fileStats": {
      "logs/pos-application.log": {
        "path": "logs/pos-application.log",
        "lastLineCount": 150,
        "errorCount": 5
      }
    }
  }
}
```

### Start Log Watcher Endpoint

```bash
POST /api/watcher/start
```

**Response**:
```json
{
  "success": true,
  "message": "Log watcher started",
  "data": { ...status }
}
```

### Stop Log Watcher Endpoint

```bash
POST /api/watcher/stop
```

**Response**:
```json
{
  "success": true,
  "message": "Log watcher stopped"
}
```

### Toggle Automation Endpoint

```bash
POST /api/automation/toggle
Content-Type: application/json

{
  "enabled": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Automation enabled",
  "data": { ...statistics }
}
```

### Real-time Monitoring Stream

```bash
GET /api/monitoring/live (Server-Sent Events)
```

**Events**:
```
event: message
data: {"type":"connected","message":"Monitoring stream started"}

event: message
data: {"type":"error-detected","data":{"file":"logs/...","error":{...}}}

event: message
data: {"type":"ticket-created","data":{"action":"CREATED",...}}

event: message
data: {"type":"ticket-updated","data":{"action":"UPDATED",...}}
```

---

## Troubleshooting

### Issue: "Jira integration not configured"

**Solution**: Verify environment variables:
```bash
echo $JIRA_HOST
echo $JIRA_PROJECT_KEY
echo $JIRA_USER_EMAIL
echo $JIRA_API_TOKEN
```

All must be set. If any are missing, restart the server after setting them.

### Issue: "Failed to create ticket: 401 Unauthorized"

**Solution**: Check your Jira API token:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Verify token is valid (not expired)
3. Regenerate if necessary
4. Update `.env` file
5. Restart server

### Issue: Log watcher not detecting errors

**Solution**: Check log file path:
```bash
# Verify file exists
ls -la logs/pos-application.log

# Check content
tail logs/pos-application.log

# Verify environment variable
echo $POS_LOG_FILE_PATH

# Restart watcher
curl -X POST http://localhost:3000/api/watcher/stop
curl -X POST http://localhost:3000/api/watcher/start
```

### Issue: Tickets not being created for errors

**Solution**: Check automation settings:
```bash
# Get automation status
curl http://localhost:3000/api/automation/status

# If disabled, enable it
curl -X POST http://localhost:3000/api/automation/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Check if error severity/confidence meets threshold
# CRITICAL = always create
# HIGH = needs 75% confidence
# MEDIUM = needs 90% confidence
```

### Issue: Port already in use

**Solution**: Use different port:
```bash
# For Demo POS
PORT=3002 npm run dev

# For StackLens API
STACKLENS_PORT=3001 npm run dev:server
```

### Issue: CORS errors in browser

**Solution**: CORS is already configured in endpoints. Check:
1. Browser console for actual error message
2. Network tab for response details
3. Ensure servers are running on correct ports

---

## Project Structure

```
StackLens-AI-Deploy/
├── demo-pos-app/                    # Standalone Demo POS Application
│   ├── src/
│   │   ├── index.ts                 # Express server
│   │   └── pos-service.ts           # POS business logic
│   ├── logs/                        # Generated log files
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   └── SETUP.md
│
├── apps/api/src/services/
│   ├── jira-integration.ts          # Jira Cloud API wrapper
│   ├── log-watcher.ts               # File watching & error detection
│   ├── error-automation.ts          # Decision engine
│   ├── log-parser.ts                # Error pattern parsing (existing)
│   └── ... (other services)
│
├── apps/api/src/routes/
│   └── main-routes.ts               # API endpoints (added integration routes)
│
├── JIRA_INTEGRATION_ARCHITECTURE.md # Full architecture documentation
├── SETUP.md                         # This file
└── .env                             # Configuration (create manually)
```

---

## Next Steps

1. ✅ **Setup Demo POS** - Complete
2. ✅ **Configure Jira** - Complete
3. ✅ **Start Log Watcher** - Complete
4. 📋 **Create Orders** - Start testing
5. 🎫 **Verify Jira Tickets** - Check ticket creation
6. 📊 **Monitor Real-time** - Watch SSE stream

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `JIRA_INTEGRATION_ARCHITECTURE.md` for detailed architecture
3. Check server logs for error messages
4. Verify environment variables are correctly set

---

**Status**: ✅ Ready for Testing  
**Last Updated**: November 13, 2024
