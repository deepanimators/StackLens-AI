# Core Components - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**Status:** Complete

---

## 📚 Component Overview

StackLens AI is built on **5 core components** that work together to detect errors and create Jira tickets automatically.

```
┌─────────────────────────────────────────────────────────────┐
│                    StackLens AI System                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Demo POS Application (Error Source)          │  │
│  │         Generates intentional errors for demo        │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │ writes logs                        │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Log Watcher Service (Real-time Monitor)      │  │
│  │         Detects changes in real-time                 │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │ parses errors                      │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Error Detection Engine (Classifier)          │  │
│  │         Analyzes & classifies errors                 │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │ severity & type                    │
│  ┌────────────────────▼─────────────────────────────────┐  │
│  │         Error Automation (Decision Engine)           │  │
│  │         Decides if ticket should be created          │  │
│  └────┬───────────────────────┬──────────────────┬──────┘  │
│       │                       │                  │         │
│  ┌────▼──┐  ┌────────────────▼──────┐  ┌──────▼──────┐  │
│  │ Jira  │  │     Dashboard        │  │  Database   │  │
│  │Ticket │  │   Real-time Update   │  │  Storage    │  │
│  └───────┘  └─────────────────────┘  └─────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔹 Component 1: Demo POS Application

**Purpose:** Generate intentional errors for system demonstration and testing

### Location
```
demo-pos-app/
├── src/
│   ├── index.ts           # Express server
│   ├── pos-service.ts     # Main POS service
│   └── ...
└── package.json
```

### Key Features
- **Error Injection** - Generates controlled errors
- **Log Generation** - Writes to application log
- **HTTP Server** - REST API for testing
- **Error Variety** - Multiple error types

### Technologies
- Express.js (HTTP server)
- TypeScript (Type safety)
- Winston (Logging)

### Error Types Generated
```typescript
interface ErrorType {
  "USER_AUTH_FAILED"        // Authentication errors
  "INVALID_TRANSACTION"     // Transaction errors
  "DATABASE_ERROR"          // Database errors
  "NETWORK_ERROR"           // Network errors
  "SYSTEM_ERROR"            // System/critical errors
  "PERFORMANCE_WARNING"     // Performance issues
}
```

### Code Example
```typescript
// demo-pos-app/src/pos-service.ts
import * as path from "path";
import * as fs from "fs";

class POSService {
  private logPath: string;

  constructor() {
    // Absolute path ensures consistency
    this.logPath = path.resolve(
      process.cwd(), 
      "..", 
      "data", 
      "pos-application.log"
    );
  }

  generateError(type: string) {
    const error = new Error(`${type}: Generated test error`);
    logger.error(error);
    this.recordToLog(error);
  }
}
```

### Key Improvements Made
✅ **Fixed:** Changed from relative to absolute path  
✅ **Benefit:** Logs consistently to `/data/pos-application.log` regardless of working directory  
✅ **Impact:** LogWatcher can reliably find and monitor logs

### Testing
```bash
# Generate a test error
curl -X POST http://localhost:3000/api/generate-error \
  -H "Content-Type: application/json" \
  -d '{"type": "USER_AUTH_FAILED"}'

# Check log file
tail -f data/pos-application.log
```

---

## 🔹 Component 2: LogWatcher Service

**Purpose:** Monitor log files in real-time and detect changes

### Location
```
apps/api/src/services/
└── log-watcher.ts          # Main LogWatcher service
```

### Key Features
- **Real-time Monitoring** - Watches multiple log files
- **File Detection** - Automatically detects directory vs file
- **Glob Patterns** - Supports wildcard patterns
- **Change Detection** - Uses Chokidar for efficiency
- **Line Parsing** - Extracts new log entries
- **Memory Efficient** - Tracks file positions

### Technologies
- Chokidar (File watching)
- Node.js fs (File operations)
- TypeScript

### How It Works

```typescript
// Watches for changes
const watcher = chokidar.watch([
  "/data/*.log",           // All .log files in /data
  "/logs/*.log"            // All .log files in /logs
]);

// New content detected
watcher.on("change", (filePath) => {
  const newLines = readNewLines(filePath);
  emit("error:detected", { filePath, lines: newLines });
});
```

### Key Improvements Made
✅ **Fixed:** Directory detection logic  
✅ **Enhancement:** Converts directories to glob patterns (*.log)  
✅ **Benefit:** Eliminates EISDIR errors when reading directories  
✅ **Impact:** LogWatcher starts successfully

### Configuration
```typescript
interface LogWatcherConfig {
  filePaths: string[];      // Files to watch
  readInterval: number;      // Poll interval (ms)
  enableBuffer: boolean;     // Buffer mode
}

// Example setup
const config = {
  filePaths: [
    "/data/pos-application.log",
    "/data/*.log"
  ],
  readInterval: 1000,
  enableBuffer: true
};
```

### API Methods
```typescript
// Start watching files
start(): void

// Stop watching
stop(): void

// Add file to watch
addFile(filePath: string): void

// Remove file from watch
removeFile(filePath: string): void

// Get current status
getStatus(): LogWatcherStatus
```

### Error Handling
```typescript
// Handles various errors gracefully
- File not found → Auto-create or skip
- Permission denied → Log warning, continue
- EISDIR error → Skip (now fixed)
- Device busy → Retry with backoff
```

### Monitoring
```bash
# Check LogWatcher logs
tail -f logs/logwatcher.log

# Monitor watched files
npm run logs:watch
```

---

## 🔹 Component 3: Error Detection Engine

**Purpose:** Analyze and classify detected errors

### Location
```
apps/api/src/services/
└── error-detection-engine.ts
```

### Key Features
- **Pattern Matching** - Identifies error types
- **Severity Scoring** - Rates error importance
- **Context Extraction** - Pulls relevant data
- **ML Confidence** - Provides confidence scores
- **Rule-Based System** - Customizable patterns

### Technologies
- TypeScript
- Regular Expressions
- Machine Learning (TensorFlow.js optional)

### Error Classification

```typescript
interface ClassifiedError {
  id: string;                // Unique ID
  type: string;              // Error type
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;           // Error message
  timestamp: Date;           // When it occurred
  source: string;            // File/service
  stackTrace?: string;       // Stack trace
  confidence: number;        // 0-1 confidence score
  metadata: Record<string, any>;
}
```

### Severity Determination

| Severity | Criteria | Examples |
|----------|----------|----------|
| **CRITICAL** | System unavailable, data loss risk | Database crash, auth failure |
| **HIGH** | Major feature broken | Payment failure, user locked out |
| **MEDIUM** | Feature degraded | Slow performance, retry needed |
| **LOW** | Minor issue, workaround exists | Warning messages, deprecations |

### Pattern Examples

```typescript
// Authentication Error
{
  pattern: /auth|login|permission|unauthorized|403/i,
  type: "AUTH_ERROR",
  severity: "HIGH"
}

// Database Error
{
  pattern: /database|sql|connection|timeout|deadlock/i,
  type: "DATABASE_ERROR",
  severity: "CRITICAL"
}

// Network Error
{
  pattern: /network|connection_refused|econnrefused|timeout/i,
  type: "NETWORK_ERROR",
  severity: "HIGH"
}
```

### Confidence Scoring
```typescript
// ML model scores confidence (0-1)
const confidence = mlModel.predict({
  errorType: "DATABASE_ERROR",
  severity: "HIGH",
  frequency: 5,  // occurred 5 times recently
  context: "error message context"
});

// Results in: 0.87 (87% confident this is a real issue)
```

### Processing Flow
```
Raw Error Log Entry
        ↓
   Pattern Matching
        ↓
  Type Identified
        ↓
 Severity Calculated
        ↓
Context Extracted
        ↓
ML Confidence Scored
        ↓
Classification Complete
```

---

## 🔹 Component 4: Error Automation Service

**Purpose:** Make intelligent decisions about error handling

### Location
```
apps/api/src/services/
└── error-automation.ts
```

### Key Features
- **Rule Evaluation** - Applies automation rules
- **Decision Logic** - Decides on actions
- **Ticket Creation** - Creates Jira tickets
- **Dashboard Updates** - Sends real-time updates
- **Error Persistence** - Stores in database

### Technologies
- TypeScript
- Jira Cloud API
- Express.js

### Decision Logic

```typescript
interface AutomationRule {
  id: string;
  name: string;
  condition: {
    severity?: string[];      // Match these severities
    type?: string[];          // Match these types
    confidence?: number;      // Minimum confidence
  };
  action: {
    createJiraTicket?: boolean;
    sendNotification?: boolean;
    updateDashboard?: boolean;
    customHook?: string;      // Custom webhook
  };
}
```

### Example Rules

**Rule 1: Create Ticket for Critical Errors**
```typescript
{
  condition: {
    severity: ["CRITICAL"],
    confidence: 0.8
  },
  action: {
    createJiraTicket: true,
    sendNotification: true,
    updateDashboard: true
  }
}
```

**Rule 2: Silent Handling for Low-Severity**
```typescript
{
  condition: {
    severity: ["LOW"],
    confidence: 0.5
  },
  action: {
    updateDashboard: true
    // No ticket created
  }
}
```

### Processing Pipeline

```
Classification Result
        ↓
Rule Matching (evaluate all rules)
        ↓
Decision Making (which actions to take)
        ↓
├─ Create Jira Ticket
├─ Update Dashboard
├─ Send Notifications
└─ Store in Database
        ↓
Execution (perform actions)
        ↓
Logging & Monitoring
```

### Jira Ticket Creation

```typescript
// When creating a Jira ticket:
const ticket = {
  fields: {
    project: { key: "STACK" },
    summary: "Critical: Database connection failed",
    description: `
Error Type: DATABASE_ERROR
Severity: CRITICAL
Message: Connection to database refused
File: database.js:45
Time: 2025-11-16T10:30:45Z
Confidence: 87%
    `,
    issuetype: { name: "Bug" },
    priority: { name: "Highest" },
    labels: ["auto-generated", "critical"]
  }
};
```

### Error Deduplication

Prevents duplicate tickets:
```typescript
// Check if similar error exists
const existingError = findSimilarError({
  type: "DATABASE_ERROR",
  source: "database.js",
  timeWindow: 5 * 60 * 1000  // Last 5 minutes
});

if (existingError && existingError.ticketCreated) {
  return;  // Skip, already handled
}
```

---

## 🔹 Component 5: Jira Integration

**Purpose:** Create and manage Jira tickets automatically

### Location
```
apps/api/src/services/
└── jira-integration.ts
```

### Key Features
- **OAuth Authentication** - Secure Jira login
- **Ticket Creation** - Automatic issue creation
- **Custom Fields** - Map StackLens data to Jira
- **Status Sync** - Track ticket resolution
- **Comment Updates** - Add error details to tickets
- **Webhook Support** - Receive Jira events

### Technologies
- Jira Cloud API v3
- OAuth 2.0
- TypeScript

### Setup

1. **Create Jira API Token**
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Save securely

2. **Configure Environment**
   ```bash
   JIRA_API_URL=https://your-domain.atlassian.net
   JIRA_USERNAME=your-email@example.com
   JIRA_API_TOKEN=your-api-token
   JIRA_PROJECT_KEY=STACK
   ```

### Authentication

```typescript
// Basic Auth with API Token
const auth = Buffer.from(
  `${email}:${apiToken}`
).toString("base64");

const headers = {
  "Authorization": `Basic ${auth}`,
  "Content-Type": "application/json"
};
```

### Creating a Ticket

```typescript
async function createTicket(error: ClassifiedError) {
  const response = await axios.post(
    `${jiraUrl}/rest/api/3/issues`,
    {
      fields: {
        project: { key: projectKey },
        summary: `${error.severity}: ${error.message}`,
        description: formatDescription(error),
        issuetype: { name: "Bug" },
        priority: getPriority(error.severity),
        labels: generateLabels(error),
        customfield_10040: error.confidence  // Confidence score
      }
    },
    { headers }
  );

  return response.data.key;  // Return ticket ID (e.g., "STACK-1234")
}
```

### Field Mapping

```typescript
const fieldMapping = {
  errorType: "customfield_10041",
  source: "customfield_10042",
  timestamp: "customfield_10043",
  confidence: "customfield_10044"
};
```

### Ticket Lifecycle

```
Error Detected
        ↓
Rule Evaluation
        ↓
Decision: Create Ticket
        ↓
Format for Jira
        ↓
API Call to Jira
        ↓
Ticket Created (STACK-1234)
        ↓
Store Ticket ID
        ↓
Update Dashboard
        ↓
Jira Workflow begins
```

### Polling for Updates

```typescript
// Check ticket status periodically
async function updateTicketStatus() {
  const tickets = await getTrackedTickets();
  
  for (const ticket of tickets) {
    const status = await getJiraTicketStatus(ticket.key);
    
    if (status === "Done") {
      markErrorAsResolved(ticket.errorId);
    }
  }
}
```

---

## 🔄 Complete Data Flow

### Step-by-Step Example

**Scenario:** Database connection fails in production

1. **Error Occurs**
   ```
   [2025-11-16T10:30:45Z] ERROR: ECONNREFUSED - Database connection failed
   at Connection.connect (database.js:45)
   ```

2. **LogWatcher Detects**
   - Chokidar detects file change
   - Reads new lines
   - Extracts error content

3. **Detection Engine Analyzes**
   ```
   Type: DATABASE_ERROR
   Severity: CRITICAL
   Confidence: 0.95 (95%)
   Source: database.js:45
   ```

4. **Automation Evaluates**
   - Check rules: severity CRITICAL + confidence > 0.8
   - Decision: CREATE JIRA TICKET

5. **Jira Integration Creates Ticket**
   ```
   Ticket: STACK-1234
   Title: CRITICAL: ECONNREFUSED - Database connection failed
   ```

6. **Dashboard Updates**
   - Real-time update via SSE
   - Shows error and ticket ID
   - Users notified

7. **Database Stored**
   ```sql
   INSERT INTO errors (
     type, severity, message, 
     jira_ticket, created_at
   ) VALUES (
     'DATABASE_ERROR', 'CRITICAL', '...',
     'STACK-1234', NOW()
   );
   ```

---

## 🎯 Component Relationships

### Dependency Graph
```
Demo POS App (Error Source)
        ↓
    Log File
        ↓
  LogWatcher
        ↓
Error Detection
        ↓
  Automation
   /    |     \
  /     |      \
Jira  Database  Dashboard
```

### Communication Patterns
```
Component           Communication    Target
─────────────────────────────────────────
Demo POS App  →  File Write   →  Log File
LogWatcher    →  Event Emit   →  Detection
Detection     →  Event Emit   →  Automation
Automation    →  HTTP POST    →  Jira API
Automation    →  DB Insert    →  Database
Automation    →  SSE Send     →  Dashboard
```

---

## ✅ Testing Components

### Unit Tests
```bash
npm run test:components
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Test
```bash
# Generate error and verify full pipeline
npm run test:e2e
```

---

## 📊 Monitoring Components

```bash
# Check component status
curl http://localhost:4000/api/health/components

# Expected response:
{
  "logwatcher": "running",
  "detection": "running",
  "automation": "running",
  "jira": "connected"
}
```

---

## 🔗 Inter-Component Communication

### Event System
```typescript
// Components emit and listen to events
eventEmitter.on("error:detected", (error) => {
  automationService.handleError(error);
});

eventEmitter.on("ticket:created", (ticket) => {
  dashboard.updateUI(ticket);
});
```

### Error Propagation
```
Error → LogWatcher → Detection → Automation
                ↓           ↓         ↓
             Logs          DB      Jira/Dashboard
```

---

## 💡 Key Concepts

### Service Isolation
Each component is independent and can fail without crashing others.

### Asynchronous Processing
Heavy operations (Jira calls, database writes) don't block other components.

### Real-time Updates
Dashboard and users see errors within milliseconds via SSE.

### Scalability
Components can be replicated across servers for load distribution.

---

## 📚 Related Documentation

- [System Architecture](../01_OVERVIEW/04_System_Architecture.md)
- [API Reference](../04_API_REFERENCE/00_API_INDEX.md)
- [Deployment Guide](../07_DEPLOYMENT/02_Production_Deployment.md)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete  
**Next:** [API Reference](../04_API_REFERENCE/00_API_INDEX.md)
