# StackLens AI - Jira Integration Architecture

## Overview

This document describes the complete architecture for integrating StackLens AI with Jira for automated error ticket creation and real-time monitoring.

## Architecture Diagram

```
┌─────────────────────────────────┐
│   Standalone Demo POS App       │
│   (Separate Project)            │
│  - Express Server (port 3001)   │
│  - Product Catalog              │
│  - Order Processing             │
│  - Real-time Logging            │
└──────────────┬──────────────────┘
               │
               │ Errors logged to:
               │ data/pos-application.log
               │
               ↓
┌─────────────────────────────────────────────────────────────────┐
│             StackLens AI Application (Main System)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Log Watcher Service                                    │  │
│  │  - Monitors external log files (demo-pos logs)          │  │
│  │  - Detects errors using LogParser                       │  │
│  │  - Emits error events                                   │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                     │
│                          ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Error Analysis (Existing ML Pipeline)                 │  │
│  │  - Feature Engineering                                  │  │
│  │  - ML Model Prediction                                  │  │
│  │  - Confidence Scoring                                   │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                     │
│                          ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Error Automation Service                               │  │
│  │  - Decision Engine (severity + confidence thresholds)   │  │
│  │  - Duplicate Detection                                  │  │
│  │  - Orchestration Logic                                  │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                     │
│                          ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Jira Integration Service                               │  │
│  │  - Jira Cloud API Client (axios + BasicAuth)            │  │
│  │  - Ticket CRUD Operations                               │  │
│  │  - JQL-based Duplicate Detection                        │  │
│  │  - Comment Management                                   │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           ↓
                    ┌──────────────┐
                    │  Jira Cloud  │
                    │   (API v3)   │
                    └──────────────┘
```

## Components

### 1. **Standalone Demo POS Application**
**Location**: `/demo-pos-app/`

A separate, independent Node.js/Express application that:
- Simulates a real Point of Sale system
- Contains 6 products (product #999 has no price - intentional error)
- Processes customer orders
- Logs all operations to file (`logs/pos-application.log`)
- Sends error notifications to StackLens (optional integration)

**Ports**: 3001 (configurable)

**Setup**:
```bash
cd demo-pos-app
npm install
npm run dev
```

**Key Files**:
- `src/pos-service.ts` - POS business logic
- `src/index.ts` - Express server and routes
- `README.md` - Detailed documentation

### 2. **Log Watcher Service**
**Location**: `apps/api/src/services/log-watcher.ts`

Part of StackLens AI, monitors external log files:
- Uses Chokidar for file system watching
- Detects file changes (debounced to 100ms)
- Tracks line counts to identify new entries
- Uses LogParser to detect error patterns
- Emits events for detected errors

**Key Methods**:
```typescript
start(filePaths: string[])      // Start watching files
stop()                          // Stop watching
addFile(filePath: string)       // Add file to watch
removeFile(filePath: string)    // Remove from watch
getStatus()                     // Get watcher status
```

**Events Emitted**:
- `change` - File changed, new errors found
- `error-detected` - Individual error detected
- `error` - Error in watcher process

### 3. **Jira Integration Service**
**Location**: `apps/api/src/services/jira-integration.ts`

Handles all Jira Cloud API interactions:

**Authentication**: Basic Auth (email + API token)
```
JIRA_HOST=https://your-company.atlassian.net
JIRA_PROJECT_KEY=YOUR_PROJECT
JIRA_USER_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token
```

**Key Methods**:
```typescript
// Create new Jira ticket
createTicket(data: JiraTicketData): Promise<JiraCreateResponse>

// Update existing ticket
updateTicket(ticketKey: string, data: JiraTicketData): Promise<void>

// Find existing ticket using JQL
findExistingTicket(errorType: string, storeNumber?: string): Promise<{key, id}>

// Add comment to ticket
addComment(ticketKey: string, message: string): Promise<void>

// Get Jira status
getStatus(): {configured, host, project, message}
```

**Severity to Priority Mapping**:
```
CRITICAL/FATAL/EMERGENCY  → Blocker
ERROR/SEVERE/HIGH         → High
WARNING/WARN/MEDIUM       → Medium
LOW/INFO                  → Low
```

### 4. **Error Automation Service**
**Location**: `apps/api/src/services/error-automation.ts`

Makes intelligent decisions about Jira ticket creation:

**Decision Logic**:
```
Severity Level    → ML Confidence Threshold
CRITICAL          → 0%   (always create)
HIGH              → 75%  (create if ≥ 75% confidence)
MEDIUM            → 90%  (create if ≥ 90% confidence)
LOW               → N/A  (skip, log only)
```

**Workflow**:
1. Receive parsed error with ML confidence score
2. Make decision (create vs skip)
3. Check for existing tickets (duplicate detection)
4. Create new ticket OR update existing with comment
5. Log automation action to database
6. Emit events for UI update

**Key Methods**:
```typescript
// Make automation decision
makeDecision(error: ParsedError, mlConfidence: number): AutomationDecision

// Execute full automation workflow
executeAutomation(error, mlConfidence, storeNumber, kioskNumber): Promise<Result>

// Enable/disable automation
setEnabled(enabled: boolean): void

// Get statistics
getStatistics(): AutomationStatistics
```

## Integration Flow

### Error Detection to Jira Ticket Flow

```
1. Demo POS App generates order
   ↓
2. Order with product #999 (no price) → ERROR logged
   ↓
3. Log Watcher detects file change
   ↓
4. LogParser detects "CRITICAL" error pattern
   ↓
5. Error passed to StackLens ML Pipeline
   ├─ Feature Engineering (25+ features)
   ├─ ML Model Prediction
   └─ Confidence Score (0-1)
   ↓
6. Error Automation Service
   ├─ Make decision (severity + confidence)
   ├─ Check for existing tickets
   └─ Action: CREATE, UPDATE, or SKIP
   ↓
7. Jira Integration Service
   └─ POST /issues (create ticket)
   ↓
8. Jira Cloud
   └─ New bug ticket created
   ↓
9. Real-time UI
   └─ Event stream updated (SSE)
```

## API Endpoints

### Jira Status
```
GET /api/jira/status
Response: {
  "configured": true,
  "host": "https://company.atlassian.net",
  "project": "BUG",
  "message": "Jira integration is configured and ready"
}
```

### Automation Status
```
GET /api/automation/status
Response: {
  "enabled": true,
  "totalProcessed": 5,
  "ticketsCreated": 3,
  "ticketsUpdated": 1,
  "skipped": 1,
  "failed": 0
}
```

### Log Watcher Status
```
GET /api/watcher/status
Response: {
  "isWatching": true,
  "watchedFiles": ["logs/pos-application.log"],
  "totalErrors": 5,
  "lastUpdate": "2024-11-13T..."
}
```

### Start Log Watcher
```
POST /api/watcher/start
Response: { "success": true, "message": "Log watcher started" }
```

### Stop Log Watcher
```
POST /api/watcher/stop
Response: { "success": true, "message": "Log watcher stopped" }
```

### Toggle Automation
```
POST /api/automation/toggle
Body: { "enabled": true|false }
Response: { "success": true, "data": { ...stats } }
```

### Demo POS Events Webhook
```
POST /api/demo-events
Body: {
  "type": "error_detected",
  "orderId": "...",
  "storeNumber": "STORE_001",
  "error": "Product #999 has no price"
}
```

### Real-time Monitoring Stream
```
GET /api/monitoring/live (Server-Sent Events)
Events:
  - { type: "connected", message: "..." }
  - { type: "error-detected", data: { ... } }
  - { type: "ticket-created", data: { ... } }
  - { type: "ticket-updated", data: { ... } }
```

## Database Tables

### errorLogs (existing)
- id, fileId, storeNumber, kioskNumber
- lineNumber, timestamp, severity, errorType, message
- mlConfidence, mlPrediction

### logFiles (existing)
- id, filename, originalName, fileType, fileSize
- storeNumber, kioskNumber, uploadTimestamp
- totalErrors, criticalErrors, status

### jiraTickets (new)
- id, errorLogId, issueKey, issueUrl
- summary, description, priority, status
- assignee, commentCount, createdAt, updatedAt

### automationLogs (new)
- id, errorLogId, action, reason
- severity, mlConfidence, decisionThreshold
- resultTicketKey, success, processingTime

## Environment Variables

```bash
# Jira Configuration
JIRA_HOST=https://your-company.atlassian.net
JIRA_PROJECT_KEY=BUG
JIRA_USER_EMAIL=your-email@company.com
JIRA_API_TOKEN=your_api_token_here

# Log Watching
POS_LOG_FILE_PATH=logs/pos-application.log

# Automation
AUTOMATION_ENABLED=true
```

## Testing Scenarios

### Scenario 1: Create Error via POS
```bash
# Start Demo POS
cd demo-pos-app && npm run dev

# Create order with product #999
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Expected: Order fails, error logged to file
```

### Scenario 2: Monitor Real-time Events
```bash
# In browser or with curl:
curl -N http://localhost:3000/api/monitoring/live

# You'll receive SSE events as errors are detected
```

### Scenario 3: Check Jira Integration
```bash
# Verify configuration
curl http://localhost:3000/api/jira/status

# Create orders with product #999
# Watch Jira Cloud for auto-created tickets
```

### Scenario 4: Duplicate Error Handling
```bash
# Create same error twice
curl -X POST http://localhost:3001/orders \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'
curl -X POST http://localhost:3001/orders \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Result: One Jira ticket created, second error adds comment
```

## System Architecture Benefits

✅ **Separation of Concerns**
- POS is completely independent
- StackLens AI is independent
- Services are loosely coupled

✅ **Scalability**
- Demo POS can run anywhere
- Multiple POS instances possible
- Log files can come from any source

✅ **Flexibility**
- Can monitor any log file format
- Customizable error patterns
- Configurable automation thresholds

✅ **Reliability**
- Error in POS doesn't affect StackLens
- Error in Jira integration logs gracefully
- Watcher continues if Jira is unavailable

✅ **Real-time**
- File watching is near-instant (100ms debounce)
- SSE streaming for live dashboard
- Event-driven architecture

## Troubleshooting

### Problem: Jira tickets not being created
```bash
# 1. Check Jira configuration
curl http://localhost:3000/api/jira/status

# 2. Verify environment variables are set
echo $JIRA_HOST
echo $JIRA_PROJECT_KEY

# 3. Check automation service status
curl http://localhost:3000/api/automation/status

# 4. Enable automation if disabled
curl -X POST http://localhost:3000/api/automation/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

### Problem: Log watcher not detecting errors
```bash
# 1. Check watcher is running
curl http://localhost:3000/api/watcher/status

# 2. Start watcher if stopped
curl -X POST http://localhost:3000/api/watcher/start

# 3. Verify log file exists and contains errors
tail -f logs/pos-application.log
```

### Problem: POS orders not showing as errors
```bash
# 1. Check if product #999 is being used
curl http://localhost:3001/products

# 2. Create order with product #999 specifically
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# 3. Check logs
tail logs/pos-application.log | grep CRITICAL
```

## Next Steps

1. ✅ **Setup Demo POS Application** (Complete)
   - Standalone Node.js/Express server
   - Generates intentional errors
   - Logs to file

2. ✅ **Implement Integration Services** (Complete)
   - Log Watcher Service
   - Jira Integration Service
   - Error Automation Service

3. ✅ **Add API Endpoints** (Complete)
   - Status endpoints
   - Webhook endpoints
   - Real-time SSE stream

4. 🔄 **Create Real-time UI** (Separate PR)
   - React dashboard component
   - Real-time error stream
   - Statistics display

5. 📋 **Documentation** (This file)
   - Architecture overview
   - Setup instructions
   - Testing scenarios

6. 🧪 **Testing** (Next phase)
   - Unit tests for services
   - Integration tests
   - End-to-end scenario tests

## Additional Resources

- [Jira Cloud REST API](https://developer.atlassian.com/cloud/jira/rest/v3)
- [Jira API Authentication](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/)
- [Chokidar File Watcher](https://github.com/paulmillr/chokidar)
- [Express SSE Implementation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Status**: ✅ Fully Integrated  
**Last Updated**: November 13, 2024
