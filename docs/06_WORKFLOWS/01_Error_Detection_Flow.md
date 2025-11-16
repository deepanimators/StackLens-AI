# Error Detection Workflow - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**Audience:** Technical Team

---

## 📊 Complete Error Detection Workflow

This document walks through the entire process of detecting an error, from the moment it's written to a log file until it appears on the dashboard.

---

## 🔄 Step-by-Step Process

### Phase 1: Error Generation

**Where:** Application code  
**When:** Error occurs in production or development  
**Action:** Error is logged

```
┌─────────────────────────────────────────┐
│   Application Code                      │
│   try {                                 │
│     connectToDatabase()                 │
│   } catch (error) {                     │
│     logger.error(error)  ← Error here   │
│   }                                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │   Log File    │
         │ app.log       │
         │ pos-app.log   │
         │ error.log     │
         └───────────────┘
```

**Example Error Log Entry:**
```
[2025-11-16T10:30:45.123Z] ERROR: ECONNREFUSED - Database connection refused
    at Connection.connect (/app/db/connection.js:45:15)
    at Database.init (/app/db/database.js:78:12)
    at Object.<anonymous> (/app/index.js:23:7)
```

### Phase 2: File Change Detection

**Component:** LogWatcher Service  
**Technology:** Chokidar  
**Event:** File system change detected  

```
Log File Written
      ↓
Chokidar Detects Change
      ↓
┌─────────────────────────────────┐
│  File System Event:             │
│  - File: /data/app.log          │
│  - Event: "change"              │
│  - Timestamp: 10:30:45.123Z     │
└────────────┬────────────────────┘
             │
             ▼
    LogWatcher Triggered
             │
             ├─ Read file size
             ├─ Compare with last position
             ├─ Read new content
             └─ Emit event
```

**Code Flow:**
```typescript
// In log-watcher.ts
watcher.on("change", async (filePath) => {
  const newLines = await readNewLines(filePath);
  
  for (const line of newLines) {
    this.emit("new_log_line", {
      file: filePath,
      content: line,
      timestamp: new Date()
    });
  }
});
```

### Phase 3: Error Parsing

**Component:** LogWatcher  
**Action:** Extract error details from log line  
**Output:** Structured error object

```
Raw Log Line:
"[2025-11-16T10:30:45.123Z] ERROR: ECONNREFUSED - Database connection refused"
      ↓
Parser
      ↓
Extract Components:
  ├─ Timestamp: 2025-11-16T10:30:45.123Z
  ├─ Level: ERROR
  ├─ Message: ECONNREFUSED - Database connection refused
  └─ Stack: (from file)
      ↓
Structured Object Created:
{
  level: "ERROR",
  timestamp: "2025-11-16T10:30:45.123Z",
  message: "ECONNREFUSED - Database connection refused",
  source: "app.log"
}
```

### Phase 4: Pattern Matching

**Component:** Error Detection Engine  
**Action:** Match against known error patterns  
**Output:** Error type identified

```
Structured Error
      ↓
Pattern Database:
  [
    { pattern: /ECONNREFUSED|connection.*refused/i, type: "DATABASE_ERROR" },
    { pattern: /AUTH|UNAUTHORIZED|403/i, type: "AUTH_ERROR" },
    { pattern: /TIMEOUT|ECONNTIMEDOUT/i, type: "TIMEOUT_ERROR" },
    ...
  ]
      ↓
Iterate Patterns
      ├─ Test each regex against message
      ├─ Find matches (usually one or more)
      ├─ Priority: Most specific first
      └─ Return best match
      ↓
Classification Result:
{
  type: "DATABASE_ERROR",
  pattern: "ECONNREFUSED|connection.*refused",
  confidence: 0.95
}
```

### Phase 5: Severity Assignment

**Component:** Error Detection Engine  
**Action:** Determine error severity  
**Output:** Severity level assigned

```
Error Type: DATABASE_ERROR
      ↓
Severity Mapping:
  DATABASE_ERROR → CRITICAL
  AUTH_ERROR → HIGH
  NETWORK_ERROR → MEDIUM
  WARNING → LOW
      ↓
Other Factors:
  ├─ Frequency (errors in last 5 min?)
  ├─ Context (production vs dev?)
  ├─ Pattern confidence (0.0-1.0)
  └─ Custom rules
      ↓
Final Severity: CRITICAL
```

**Severity Levels:**
```
CRITICAL  →  Immediate action required
             (System unavailable, data loss risk)
             
HIGH      →  Urgent attention needed
             (Major feature broken)
             
MEDIUM    →  Should address soon
             (Feature degraded, workaround exists)
             
LOW       →  Can schedule for later
             (Minor issue, no impact)
```

### Phase 6: Confidence Scoring

**Component:** Error Detection Engine  
**Technology:** Machine Learning (TensorFlow.js)  
**Action:** Calculate confidence score (0.0 to 1.0)  

```
Input Factors:
  ├─ Pattern match quality: 0.95
  ├─ Historical frequency: 0.90
  ├─ Context alignment: 0.85
  └─ Keyword relevance: 0.92
      ↓
ML Model:
  confidence = 
    (patternMatch × 0.4) +
    (frequency × 0.3) +
    (context × 0.2) +
    (keywords × 0.1)
      ↓
Calculation:
  confidence =
    (0.95 × 0.4) +
    (0.90 × 0.3) +
    (0.85 × 0.2) +
    (0.92 × 0.1)
  = 0.38 + 0.27 + 0.17 + 0.092
  = 0.912 (91.2% confidence)
      ↓
Final Score: 0.91
```

**Score Interpretation:**
```
0.90-1.0  →  Very confident (Automatic action)
0.70-0.89 →  Confident (Likely real issue)
0.50-0.69 →  Moderate (Maybe real issue)
0.00-0.49 →  Low (Probably not an issue)
```

### Phase 7: Event Emission

**Component:** Error Detection Engine  
**Event:** "error:classified"  
**Listeners:** Error Automation Service, Database, Logger

```
Classification Complete
{
  type: "DATABASE_ERROR",
  severity: "CRITICAL",
  message: "ECONNREFUSED - Database connection refused",
  confidence: 0.91,
  timestamp: "2025-11-16T10:30:45Z",
  source: "app.log",
  id: "err_abc123"
}
      ↓
Event Emitted: "error:classified"
      ↓
┌─────────────────┬──────────────────┬──────────────────┐
│ Automation      │ Database Logger  │ Dashboard Notif  │
│ Service         │                  │                  │
│ (Listener 1)    │ (Listener 2)     │ (Listener 3)     │
└─────────────────┴──────────────────┴──────────────────┘
```

### Phase 8: Automation Rules Evaluation

**Component:** Error Automation Service  
**Action:** Evaluate configured rules  
**Output:** Decision (create ticket? notify?)

```
Classification Data:
  severity: CRITICAL
  confidence: 0.91
  type: DATABASE_ERROR
      ↓
Configured Rules:
  [
    {
      name: "Critical Database Errors",
      condition: {
        severity: ["CRITICAL"],
        type: ["DATABASE_ERROR"],
        confidence: 0.85
      },
      action: {
        createJiraTicket: true,
        sendNotification: true,
        updateDashboard: true
      }
    },
    ...
  ]
      ↓
Rule Matching:
  ├─ severity CRITICAL ✓ (matches)
  ├─ type DATABASE_ERROR ✓ (matches)
  ├─ confidence 0.91 >= 0.85 ✓ (matches)
      ↓
All Conditions Met ✓
      ↓
Rule Action: CREATE JIRA TICKET
```

### Phase 9: Deduplication Check

**Component:** Error Automation Service  
**Action:** Check if similar error already has ticket  
**Purpose:** Prevent duplicate Jira tickets

```
Error Details:
  type: DATABASE_ERROR
  source: database.js
      ↓
Query Recent Errors:
  Last 5 minutes, same type, same source
      ↓
Found Similar Error:
  ID: err_abc122
  Time: 10:30:30 (15 seconds ago)
  Status: Ticket created (STACK-1234)
      ↓
Deduplication Decision:
  IF error_exists AND ticket_exists:
    SKIP ticket creation
    LINK to existing error instead
  ELSE:
    PROCEED with new ticket
      ↓
Decision: SKIP (already handled)
```

### Phase 10: Jira Ticket Creation

**Component:** Jira Integration Service  
**API:** Jira Cloud REST API v3  
**Authentication:** Basic Auth with API Token

```
Decision: CREATE TICKET
      ↓
Prepare Ticket Payload:
{
  fields: {
    project: { key: "STACK" },
    summary: "CRITICAL: Database connection refused",
    description: `
    Error Type: DATABASE_ERROR
    Severity: CRITICAL
    Message: ECONNREFUSED - Database connection refused
    Source: app.log
    Confidence: 91%
    Time: 2025-11-16T10:30:45Z
    `,
    issuetype: { name: "Bug" },
    priority: { name: "Highest" },
    labels: ["auto-generated", "critical", "database"]
  }
}
      ↓
HTTP POST to Jira:
  POST /rest/api/3/issues
  Authorization: Basic <token>
  Content-Type: application/json
      ↓
Jira Response:
{
  id: "10001",
  key: "STACK-1234",
  self: "https://.../issues/STACK-1234"
}
      ↓
Ticket Created: STACK-1234
```

### Phase 11: Database Storage

**Component:** Database Service  
**Action:** Store error and ticket reference  
**Database:** PostgreSQL

```
Store Error Record:
INSERT INTO errors (
  id, type, severity, message,
  source, confidence, timestamp,
  jira_ticket_id, created_at
) VALUES (
  'err_abc123', 'DATABASE_ERROR', 'CRITICAL',
  'ECONNREFUSED - Database connection refused',
  'app.log', 0.91, '2025-11-16T10:30:45Z',
  'STACK-1234', NOW()
);
      ↓
Store Ticket Reference:
INSERT INTO jira_tickets (
  error_id, jira_key, status,
  created_at
) VALUES (
  'err_abc123', 'STACK-1234', 'Open',
  NOW()
);
      ↓
Database Updated
```

### Phase 12: Real-Time Dashboard Update

**Component:** SSE (Server-Sent Events)  
**Technology:** EventSource API  
**Delivery:** Real-time push to browsers

```
Error Complete
{
  id: "err_abc123",
  type: "DATABASE_ERROR",
  severity: "CRITICAL",
  message: "ECONNREFUSED - Database connection refused",
  jiraTicket: "STACK-1234",
  confidence: 0.91
}
      ↓
Broadcast to Connected Clients:
      ├─ Client 1 (Browser)
      ├─ Client 2 (Browser)
      └─ Client 3 (Browser)
      ↓
Each Client Receives:
event: error:detected
data: { ...error data... }
      ↓
React Component Updates:
  1. Receive SSE event
  2. Parse error data
  3. Update state
  4. Re-render component
  5. User sees new error
      ↓
User Sees:
┌──────────────────────────────┐
│ New Error Detected!          │
│ CRITICAL: Database Error     │
│ Ticket: STACK-1234           │
│ Confidence: 91%              │
└──────────────────────────────┘
```

---

## ⏱️ Performance Metrics

### End-to-End Timeline

```
Error Occurs in Log
      ↓ 0ms (baseline)
   ▼ 5-10ms
LogWatcher Detects
      ▼ 15-20ms
Error Parsing
      ▼ 25-30ms
Pattern Matching
      ▼ 35-40ms
Severity Assignment
      ▼ 40-50ms
ML Confidence Scoring
      ▼ 50-60ms
Rule Evaluation
      ▼ 60-80ms
Deduplication Check
      ▼ 80-150ms
Jira API Call
      ▼ 150-170ms
Database Insert
      ▼ 170-190ms
SSE Broadcast
      ▼ 190-200ms
User Sees Dashboard Update
```

**Total Time:** ~200ms from error log to dashboard

---

## 🔀 Alternative Flows

### Flow A: Error with No Ticket Creation

```
Error Detected
      ↓
Classification
      ↓
Severity: LOW
      ↓
Rule Match: Dashboard only
      ↓
No Jira Ticket
      ↓
Database Update
      ↓
Dashboard Update
```

### Flow B: Duplicate Error Detected

```
Error Detected
      ↓
Similar Error Found
      ↓
Existing Ticket: STACK-1234
      ↓
Increment Count
      ↓
Add Comment to Existing Ticket
      ↓
Database Update (link to existing)
      ↓
Dashboard Update
```

### Flow C: Critical Error - Multiple Actions

```
Error Detected
      ↓
Severity: CRITICAL
      ↓
Rule Matches:
  ├─ Create Jira Ticket
  ├─ Send Email Notification
  ├─ Send Slack Message
  ├─ Page On-Call Engineer
  └─ Update Dashboard
```

---

## 🔗 Related Documentation

- [Error Detection Engine](../03_CORE_COMPONENTS/00_Component_Overview.md)
- [Error Automation](../03_CORE_COMPONENTS/00_Component_Overview.md)
- [Complete Workflows](./00_Workflows_Index.md)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete
