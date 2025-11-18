# Phase 4: Real-Time Error Monitoring & Jira Integration - Production Implementation Plan

**Status**: 🚀 Ready to Implement  
**Phase**: 4 (Final Phase for MVP Demo)  
**Timeline**: 2-3 weeks  
**Priority**: CRITICAL - Client Demonstration

---

## Executive Summary

You want to build a **production-ready end-to-end error detection and resolution workflow** that:

1. **Real-time log monitoring** from a demo POS application
2. **Error detection** when products have missing prices
3. **AI-powered analysis** to predict issues and suggest fixes
4. **Automated Jira ticketing** with detailed descriptions and fixes
5. **Admin backend UI** to configure Jira integration
6. **No mock data** - only real-time production flow

### Current Application Stack
- **Backend**: Node.js/Express (Port 4000)
- **Frontend**: React/Vite (Port 5173)
- **Demo App**: Demo POS (runs separately, logs to `/data/pos-application.log`)
- **Log Monitoring**: LogWatcher service (already exists)
- **Jira Integration**: Service exists but not fully integrated
- **Database**: SQLite with Drizzle ORM
- **AI/ML**: Python microservices + OpenAI integration

---

## Phase 4 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Demo POS App                                                   │
│  ├─ Receives Order with Product #999 (no price)               │
│  ├─ Attempts to calculate price → FAILS                        │
│  └─ Writes to /data/pos-application.log                        │
│         ↓                                                       │
│  [Real-Time Log Watcher]                                        │
│  ├─ Monitors log file changes                                  │
│  ├─ Detects "MISSING_PRICE" error                             │
│  ├─ Emits "error-detected" event                              │
│  └─ Stores in database (errorLogs table)                       │
│         ↓                                                       │
│  [AI Analysis Engine]                                           │
│  ├─ Analyzes real error data (NOT mock)                       │
│  ├─ Uses ML model to predict root cause                       │
│  ├─ Generates contextual fix suggestions                      │
│  └─ Updates errorLogs.aiSuggestion with fixes                 │
│         ↓                                                       │
│  [Jira Integration]                                             │
│  ├─ Checks if Jira is configured (Admin UI)                   │
│  ├─ Creates ticket with:                                       │
│  │  - Error type: MISSING_PRICE                               │
│  │  - Store/Kiosk info from logs                              │
│  │  - AI-generated fix suggestions                            │
│  │  - ML confidence score                                      │
│  └─ Links to jiraTickets table                                │
│         ↓                                                       │
│  [Admin Dashboard]                                              │
│  ├─ Monitors real-time errors                                 │
│  ├─ Views Jira ticket links                                   │
│  ├─ Verifies automation is working                            │
│  └─ Can manually trigger Jira creation                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. What's Already Implemented

### ✅ DONE
- **LogWatcher Service**: Monitors log files in real-time (File: `apps/api/src/services/log-watcher.ts`)
- **Log Parser**: Detects error patterns including "MISSING_PRICE"
- **Jira Integration Service**: Basic ticket creation (File: `apps/api/src/services/jira-integration.ts`)
- **Demo POS App**: Has Product #999 with no price (triggers error)
- **Error Detection**: Logs MISSING_PRICE error to file
- **Database Schema**: Has errorLogs, jiraTickets (if exists), integrations tables
- **AI Service**: Can analyze errors and generate suggestions

### ❌ MISSING (Must Implement)

1. **Real-time Webhook System** - Connect LogWatcher to error processing pipeline
2. **Admin Jira Configuration UI** - Backend UI to configure Jira credentials
3. **Integration Config Storage** - Database table to store Jira credentials
4. **Error-to-Jira Pipeline** - Automatic ticket creation when errors detected
5. **Real-time Dashboard** - Show detected errors and Jira tickets
6. **Admin API Endpoints** - Configure integrations, manually trigger Jira
7. **Database Migrations** - Add new tables for integration config & tracking
8. **Production-Ready Error Scenarios** - Enhanced demo POS with multiple error cases

---

## 2. Database Schema Changes Required

### New Table: `integrations_config`
```typescript
export const integrationsConfig = sqliteTable("integrations_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  integationType: text("integration_type").notNull(), // "jira", "slack", "email"
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(false),
  displayName: text("display_name").notNull(), // "Jira Cloud", "Slack Workspace"
  
  // Jira specific fields
  jiraHost: text("jira_host"),
  jiraProjectKey: text("jira_project_key"),
  jiraUserEmail: text("jira_user_email"),
  jiraApiToken: text("jira_api_token"), // Encrypted!
  
  // Slack specific fields (future)
  slackWebhookUrl: text("slack_webhook_url"),
  slackChannel: text("slack_channel"),
  
  // General fields
  lastTestedAt: integer("last_tested_at", { mode: "timestamp" }),
  testStatus: text("test_status"), // "success", "failed", "pending"
  testErrorMessage: text("test_error_message"),
  
  configuredBy: integer("configured_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const jiraTickets = sqliteTable("jira_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  jiraTicketKey: text("jira_ticket_key").notNull(), // "PROJ-123"
  jiraTicketId: text("jira_ticket_id").notNull(),
  jiraUrl: text("jira_url").notNull(),
  status: text("status").notNull(), // "open", "in_progress", "resolved", "closed"
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const errorDetectionEvents = sqliteTable("error_detection_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  detectionTimestamp: integer("detection_timestamp", { mode: "timestamp" }),
  aiAnalysisStatus: text("ai_analysis_status"), // "pending", "completed", "failed"
  aiSuggestions: text("ai_suggestions", { mode: "json" }),
  jiraCreationStatus: text("jira_creation_status"), // "pending", "success", "failed"
  jiraCreationError: text("jira_creation_error"),
  
  // Real-time monitoring
  autoResolved: integer("auto_resolved", { mode: "boolean" }).default(false),
  manuallyResolved: integer("manually_resolved", { mode: "boolean" }).default(false),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### Database Migration SQL
```sql
-- Add new tables to schema
CREATE TABLE integrations_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  integration_type TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 0,
  display_name TEXT NOT NULL,
  jira_host TEXT,
  jira_project_key TEXT,
  jira_user_email TEXT,
  jira_api_token TEXT,
  slack_webhook_url TEXT,
  slack_channel TEXT,
  last_tested_at INTEGER,
  test_status TEXT,
  test_error_message TEXT,
  configured_by INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (configured_by) REFERENCES users(id)
);

CREATE TABLE jira_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_log_id INTEGER,
  jira_ticket_key TEXT NOT NULL,
  jira_ticket_id TEXT NOT NULL,
  jira_url TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (error_log_id) REFERENCES error_logs(id)
);

CREATE TABLE error_detection_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  error_log_id INTEGER,
  detection_timestamp INTEGER,
  ai_analysis_status TEXT,
  ai_suggestions TEXT,
  jira_creation_status TEXT,
  jira_creation_error TEXT,
  auto_resolved INTEGER DEFAULT 0,
  manually_resolved INTEGER DEFAULT 0,
  resolved_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (error_log_id) REFERENCES error_logs(id)
);
```

---

## 3. Implementation Roadmap

### Phase 4.1: Foundation (Week 1)

#### 4.1.1 Database Schema Extension
**Time**: 2 hours
**Files to Modify**:
- `packages/shared/src/sqlite-schema.ts` - Add new tables
- `apps/api/src/database/db.ts` - Ensure new schema is loaded

**Tasks**:
1. Add `integrationsConfig` table
2. Add `jiraTickets` table
3. Add `errorDetectionEvents` table
4. Create migration script
5. Test schema generation

#### 4.1.2 Encryption Service for Credentials
**Time**: 1.5 hours
**Files to Create**:
- `apps/api/src/services/encryption-service.ts`

**Tasks**:
```typescript
export class EncryptionService {
  // Encrypt sensitive credentials before storing
  encrypt(data: string): string
  
  // Decrypt credentials when needed
  decrypt(encryptedData: string): string
  
  // One-way hash for comparison
  hash(data: string): string
}
```

#### 4.1.3 Admin Integration Configuration API
**Time**: 3 hours
**Files to Modify**:
- `apps/api/src/routes/main-routes.ts`

**New Endpoints**:
```
GET  /api/admin/integrations              - List all integration configs
GET  /api/admin/integrations/:id          - Get specific integration
POST /api/admin/integrations              - Create new integration config
PUT  /api/admin/integrations/:id          - Update integration config
DELETE /api/admin/integrations/:id        - Remove integration
POST /api/admin/integrations/:id/test     - Test connection
POST /api/admin/integrations/:id/enable   - Enable integration
POST /api/admin/integrations/:id/disable  - Disable integration
```

---

### Phase 4.2: Real-Time Monitoring & Processing (Week 1-2)

#### 4.2.1 Error Processing Pipeline
**Time**: 4 hours
**Files to Create**:
- `apps/api/src/services/error-processing-service.ts`

**Architecture**:
```typescript
export class ErrorProcessingService {
  // When LogWatcher detects error
  async processDetectedError(error: ParsedError) {
    // 1. Store in errorLogs table
    const errorLog = await this.storage.createErrorLog(error);
    
    // 2. Create detection event entry
    const event = await this.storage.createDetectionEvent(errorLog.id);
    
    // 3. Run AI analysis
    const aiSuggestions = await this.aiService.analyzeError(errorLog);
    await this.storage.updateDetectionEvent(event.id, {
      aiAnalysisStatus: 'completed',
      aiSuggestions: aiSuggestions
    });
    
    // 4. Check if Jira is enabled
    const jiraConfig = await this.storage.getEnabledIntegration('jira');
    if (jiraConfig) {
      // 5. Create Jira ticket
      const ticket = await this.createJiraTicket(errorLog, aiSuggestions, jiraConfig);
      await this.storage.linkJiraTicket(errorLog.id, ticket);
    }
    
    // 6. Emit event for real-time dashboard
    this.emit('error-processed', { errorLog, aiSuggestions, ticket });
  }
}
```

#### 4.2.2 LogWatcher Integration Enhancement
**Time**: 2 hours
**Files to Modify**:
- `apps/api/src/services/log-watcher.ts`

**Changes**:
```typescript
// Connect LogWatcher to ErrorProcessingService
logWatcher.on('error-detected', async (event) => {
  await errorProcessingService.processDetectedError(event.error);
});

// Initialize on app startup
app.on('ready', async () => {
  await logWatcher.start(['/data/pos-application.log']);
});
```

#### 4.2.3 Real-Time WebSocket Updates
**Time**: 3 hours
**Files to Create/Modify**:
- `apps/api/src/services/websocket-service.ts`
- `apps/api/src/index.ts` - Add WebSocket server

**Functionality**:
```typescript
// Admin can subscribe to real-time error updates
socket.on('subscribe:errors', () => {
  // Send updates as errors are detected
  errorProcessingService.on('error-processed', (data) => {
    socket.emit('error:detected', data);
  });
});
```

---

### Phase 4.3: Admin Backend UI (Week 2)

#### 4.3.1 Admin Integration Settings Page
**Time**: 5 hours
**Files to Create**:
- `apps/web/src/pages/admin/integrations.tsx`

**Features**:
1. **Jira Configuration**
   - Input fields for: Host, Project Key, Email, API Token
   - Test connection button
   - Save/Update credentials (encrypted)
   - Enable/Disable toggle
   - Last tested timestamp
   - Test status indicator

2. **Integration Status**
   - List all configured integrations
   - Show enable/disable status
   - Show last test result
   - Show when configured
   - Edit/Delete options

3. **Real-Time Monitoring Dashboard**
   - Display detected errors in real-time
   - Show AI analysis status
   - Show Jira ticket links
   - Auto-refresh every 5 seconds

#### 4.3.2 Error Monitoring Dashboard
**Time**: 4 hours
**Files to Create**:
- `apps/web/src/pages/admin/error-monitoring.tsx`

**Display**:
- Real-time error feed
- Error severity badges (CRITICAL, ERROR, WARNING)
- Store/Kiosk information
- Error timestamps
- AI suggestions preview
- Jira ticket links (if created)
- Manual Jira ticket creation button

---

### Phase 4.4: Enhanced Demo POS (Week 2)

#### 4.4.1 Add Error Scenarios
**Time**: 2 hours
**Files to Modify**:
- `demo-pos-app/src/pos-service.ts`

**New Error Scenarios**:
```typescript
// 1. Missing Price Error (already exists)
// Product #999 has no price

// 2. Product Not Found Error
// Order item references non-existent product

// 3. Inventory Shortage Error
// Requested quantity exceeds available stock

// 4. Payment Processing Error
// Simulated payment gateway failure

// 5. Store/Kiosk Configuration Error
// Invalid store or kiosk number
```

#### 4.4.2 CLI for Testing
**Time**: 1.5 hours
**Files to Create**:
- `demo-pos-app/scripts/test-errors.ts`

**Commands**:
```bash
# Trigger specific error scenarios
npm run test-errors -- --scenario missing-price --store STORE_001
npm run test-errors -- --scenario not-found --store STORE_002
npm run test-errors -- --scenario inventory --count 100
npm run test-errors -- --scenario payment-fail
```

---

## 4. Implementation Details

### 4.1 API Endpoint Specifications

#### Admin Integration Configuration Endpoints

**1. Get All Integrations**
```
GET /api/admin/integrations
Permission: admin
Response:
{
  integrations: [
    {
      id: 1,
      integationType: "jira",
      isEnabled: true,
      displayName: "Jira Cloud",
      lastTestedAt: "2024-11-16T10:30:00Z",
      testStatus: "success",
      configuredBy: 1,
      createdAt: "2024-11-01T00:00:00Z"
    }
  ]
}
```

**2. Create/Update Integration**
```
POST /api/admin/integrations
PUT /api/admin/integrations/:id
Permission: super_admin
Body:
{
  integationType: "jira",
  displayName: "Jira Cloud",
  jiraHost: "https://your-company.atlassian.net",
  jiraProjectKey: "PROJ",
  jiraUserEmail: "user@example.com",
  jiraApiToken: "your-api-token"  // Will be encrypted
}

Response:
{
  success: true,
  integration: { ...config }
}
```

**3. Test Integration**
```
POST /api/admin/integrations/:id/test
Permission: admin
Response:
{
  success: true,
  message: "Connection successful",
  jiraVersion: "10.0.0"
}
```

#### Error Monitoring Endpoints

**1. Get Real-Time Errors**
```
GET /api/admin/errors/realtime
Permission: admin
Query: ?limit=50&offset=0&severity=CRITICAL
Response:
{
  errors: [
    {
      id: 1,
      errorType: "MISSING_PRICE",
      severity: "CRITICAL",
      message: "Product #999 has no pricing information",
      storeNumber: "STORE_001",
      kioskNumber: "KIOSK_001",
      timestamp: "2024-11-16T10:30:00Z",
      aiStatus: "completed",
      aiSuggestions: { ... },
      jiraTicket: {
        key: "PROJ-123",
        url: "https://...",
        status: "open"
      }
    }
  ],
  total: 150
}
```

**2. Manual Jira Ticket Creation**
```
POST /api/admin/errors/:errorId/create-jira-ticket
Permission: admin
Body: {
  notes: "Additional notes from admin"
}
Response:
{
  success: true,
  jiraTicket: {
    key: "PROJ-124",
    url: "https://...",
    id: "12345"
  }
}
```

---

### 4.2 Admin Backend UI Components

#### Jira Configuration Panel
```tsx
<AdminJiraConfig>
  <input label="Jira Host" value={jiraHost} />
  <input label="Project Key" value={projectKey} />
  <input label="User Email" value={userEmail} />
  <input label="API Token" type="password" value={apiToken} />
  <button onClick={testConnection}>Test Connection</button>
  <button onClick={saveConfig}>Save Configuration</button>
  <div>Status: {testStatus}</div>
</AdminJiraConfig>
```

#### Real-Time Error Dashboard
```tsx
<ErrorMonitoringDashboard>
  <ErrorStats
    totalErrors={stats.total}
    criticalCount={stats.critical}
    openJiraTickets={stats.jiraOpen}
  />
  
  <ErrorFeed>
    {errors.map(error => (
      <ErrorCard
        error={error}
        aiSuggestions={error.aiSuggestions}
        jiraTicket={error.jiraTicket}
        onCreateJira={() => createJiraTicket(error.id)}
      />
    ))}
  </ErrorFeed>
</ErrorMonitoringDashboard>
```

---

### 4.3 Real-Time Data Flow

#### Step-by-Step Execution

**1. Demo POS Creates Order with Missing Price Product**
```
Time: T+0
Action: User places order with Product #999 (no price)
Output: App attempts price calculation → Error
```

**2. Error Written to Log File**
```
Time: T+1
File: /data/pos-application.log
Entry: [2024-11-16T10:30:00Z] [CRITICAL] Pricing error in order | {
  orderId: "uuid-123",
  storeNumber: "STORE_001",
  kioskNumber: "KIOSK_001",
  productId: 999,
  productName: "Mystery Product",
  errorType: "MISSING_PRICE",
  confidence: 0.99
}
```

**3. LogWatcher Detects Change**
```
Time: T+2
Service: LogWatcherService
Event: 'change' (file modification detected)
Action: Read new lines, parse for errors
```

**4. Error Pattern Matched**
```
Time: T+3
Pattern: regex: "Pricing error|MISSING_PRICE"
Match: YES (confidence: 0.99)
Error Object:
{
  severity: "CRITICAL",
  errorType: "MISSING_PRICE",
  message: "Product #999 has no pricing information",
  storeNumber: "STORE_001",
  kioskNumber: "KIOSK_001"
}
```

**5. Error Stored in Database**
```
Time: T+4
Table: error_logs
New Row: {
  id: 1,
  fileId: null (real-time, not from upload),
  lineNumber: 42,
  timestamp: "2024-11-16T10:30:00Z",
  severity: "CRITICAL",
  errorType: "MISSING_PRICE",
  message: "Product #999 has no pricing information",
  fullText: "[CRITICAL] Pricing error in order | {...}",
  resolved: false
}

Table: error_detection_events
New Row: {
  id: 1,
  errorLogId: 1,
  detectionTimestamp: "2024-11-16T10:30:02Z",
  aiAnalysisStatus: "pending"
}
```

**6. AI Analysis Triggered**
```
Time: T+5 to T+8
Service: AIService
Process:
1. Fetch real error from errorLogs table
2. Analyze: "Missing price for product #999 in STORE_001"
3. Context: Product ID exists but price field is null
4. Root Cause: Product master data incomplete
5. Generate Suggestions:
   - "Update product master data with correct pricing"
   - "Set a minimum price or mark as out of stock"
   - "Run inventory reconciliation"
6. Calculate confidence: 0.95
```

**7. AI Suggestions Stored**
```
Time: T+9
Table: error_logs
Update Row 1:
  aiSuggestion: {
    description: "Product pricing information is missing",
    solutions: [
      {
        priority: 1,
        suggestion: "Update product pricing in master data",
        estimatedTime: "5 minutes",
        automationPossible: true
      },
      {
        priority: 2,
        suggestion: "Verify product exists in inventory system",
        estimatedTime: "2 minutes"
      }
    ],
    mlConfidence: 0.95
  }

Table: error_detection_events
Update Row 1:
  aiAnalysisStatus: "completed"
  aiSuggestions: {...}
```

**8. Jira Ticket Creation (if Jira enabled)**
```
Time: T+10
Check: Is Jira integration enabled?
Answer: YES

Jira API Call:
POST https://company.atlassian.net/rest/api/3/issues
{
  fields: {
    project: { key: "PROJ" },
    summary: "[CRITICAL] MISSING_PRICE_ERROR: Product #999...",
    description: "❌ ERROR DETECTED\n\nStore: STORE_001\nKiosk: KIOSK_001\nError Type: MISSING_PRICE_ERROR\n\n📊 AI Analysis:\n- Root Cause: Product #999 has no pricing information\n- Confidence: 95%\n\n✅ Suggested Fixes:\n1. Update product pricing in master data (5 min)\n2. Verify product exists in inventory (2 min)\n\n🤖 Automated by: StackLens AI",
    issuetype: { name: "Bug" },
    priority: { name: "Highest" },
    labels: ["stacklens-ai", "critical", "auto-created"]
  }
}

Response:
{
  id: "10000",
  key: "PROJ-123",
  self: "https://company.atlassian.net/rest/api/3/issues/10000"
}
```

**9. Ticket Linked in Database**
```
Time: T+11
Table: jira_tickets
New Row: {
  id: 1,
  errorLogId: 1,
  jiraTicketKey: "PROJ-123",
  jiraTicketId: "10000",
  jiraUrl: "https://company.atlassian.net/browse/PROJ-123",
  status: "open"
}
```

**10. Admin Dashboard Updated (WebSocket)**
```
Time: T+12
Event: 'error:detected' sent via WebSocket
Admin Browser Updates:
- Error appears in real-time feed
- Shows AI suggestions
- Shows Jira link
- Can manually create ticket or resolve error
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

```typescript
// Test ErrorProcessingService
describe('ErrorProcessingService', () => {
  it('should process detected error and create Jira ticket', async () => {
    const error = {
      severity: 'CRITICAL',
      errorType: 'MISSING_PRICE',
      message: 'Product #999 has no price'
    };
    
    const result = await errorProcessingService.processDetectedError(error);
    
    expect(result.errorLog).toBeDefined();
    expect(result.aiSuggestions).toBeDefined();
    expect(result.jiraTicket).toBeDefined();
  });
});

// Test EncryptionService
describe('EncryptionService', () => {
  it('should encrypt and decrypt credentials', () => {
    const token = 'secret-api-token';
    const encrypted = encryptionService.encrypt(token);
    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(token);
  });
});
```

### 5.2 Integration Tests

```bash
# Test 1: End-to-End Real-Time Flow
1. Start demo POS app
2. Start StackLens server with LogWatcher
3. Create order with Product #999
4. Verify error written to log
5. Verify LogWatcher detects error
6. Verify AI analysis completes
7. Verify Jira ticket created
8. Verify admin dashboard updated

# Test 2: Jira Configuration
1. Access admin integration settings
2. Enter valid Jira credentials
3. Click "Test Connection"
4. Verify connection successful
5. Enable integration
6. Create error and verify ticket creation

# Test 3: Error Scenarios
1. Test missing price error
2. Test product not found
3. Test inventory shortage
4. Test payment failure
5. Verify all create Jira tickets correctly
```

### 5.3 Performance Tests

```typescript
// Real-time latency measurement
measure: (
  LogWatcher detects error → 
  AI analysis completes → 
  Jira ticket created
)
Target: < 10 seconds end-to-end
```

---

## 6. Deployment Checklist

### Pre-Deployment
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Jira API credentials secured (encrypted)
- [ ] LogWatcher paths verified
- [ ] Demo POS error scenarios tested
- [ ] All endpoints tested with real data
- [ ] WebSocket connections verified
- [ ] Admin UI tested in production environment

### Production Configuration
```bash
# Environment Variables
JIRA_HOST=https://company.atlassian.net
JIRA_PROJECT_KEY=PROJ
JIRA_USER_EMAIL=stacklens@company.com
JIRA_API_TOKEN=*** (encrypted in database)

LOG_WATCHER_PATHS=/data/pos-application.log

ENCRYPTION_SECRET=*** (for credential encryption)

WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=4001
```

### Post-Deployment
- [ ] Monitor real-time error detection
- [ ] Verify Jira tickets creating correctly
- [ ] Check admin dashboard responsiveness
- [ ] Monitor WebSocket connections
- [ ] Verify error logs in database
- [ ] Check CPU/Memory usage
- [ ] Monitor Jira API rate limits

---

## 7. Known Constraints & Solutions

### Constraint 1: Mock vs Real Data
**Problem**: Application currently uses mock data in some places
**Solution**: 
- Remove all mock error logs (✅ done in Phase 1)
- Use ONLY database errors detected in real-time
- Test with actual error scenarios from demo POS

### Constraint 2: Real-Time Performance
**Problem**: AI analysis might take time (2-5 seconds)
**Solution**:
- Run AI analysis asynchronously
- Show "pending" status in dashboard
- Update dashboard when analysis complete
- User can check back in 30 seconds

### Constraint 3: Jira API Rate Limiting
**Problem**: Free Jira Cloud tier has rate limits
**Solution**:
- Batch error processing if needed
- Cache Jira responses
- Implement backoff strategy
- Monitor API usage

### Constraint 4: Log File Monitoring
**Problem**: Different environments have different log paths
**Solution**:
- Use environment variable: `LOG_WATCHER_PATHS`
- Support multiple log files
- Admin can configure monitored paths
- Verify paths before starting watcher

---

## 8. Success Criteria for MVP Demo

### Demo Flow (Client Presentation)

**Step 1: Setup (2 minutes)**
```
1. Show Jira integration settings (Admin UI)
2. Demonstrate connection test
3. Show that Jira is enabled and ready
```

**Step 2: Create Error (1 minute)**
```
1. Open POS app in browser
2. Show product list (including Product #999 with no price)
3. Attempt to create order with Product #999
4. Show error in order response
```

**Step 3: Real-Time Detection (5 seconds)**
```
1. Switch to admin dashboard
2. Show error appearing in real-time feed
3. No refresh needed - WebSocket update
```

**Step 4: AI Analysis (10 seconds)**
```
1. Show error with AI analysis in progress
2. AI completes analysis
3. Show suggested fixes:
   - "Update product pricing"
   - "Mark as out of stock"
```

**Step 5: Jira Automation (5 seconds)**
```
1. Show Jira ticket created automatically
2. Click link to open in Jira
3. Show ticket contains:
   - Error details
   - Store/Kiosk info
   - AI-suggested fixes
   - Priority set to "Highest"
```

**Step 6: Automation Proof (2 minutes)**
```
1. Show logs proving no manual intervention
2. Query error_detection_events table
3. Show progression: pending → ai_completed → jira_created
4. Timestamp shows < 10 seconds total
```

### Success Metrics
- ✅ Error detected within 2 seconds of log write
- ✅ AI analysis completes within 5 seconds
- ✅ Jira ticket created within 2 seconds of AI analysis
- ✅ Admin dashboard updates in real-time
- ✅ No mock data used - all real
- ✅ Jira ticket contains all necessary info
- ✅ All completely automated

---

## 9. Phase 4 Files Summary

### New Files to Create
```
apps/api/src/services/
  ├── error-processing-service.ts (NEW)
  ├── encryption-service.ts (NEW)
  ├── websocket-service.ts (NEW)
  └── real-time-monitor-service.ts (NEW)

apps/api/src/routes/
  └── integration-routes.ts (NEW) - Admin integration APIs

apps/web/src/pages/admin/
  ├── integrations.tsx (NEW) - Jira config page
  ├── error-monitoring.tsx (NEW) - Real-time error dashboard
  └── components/
      ├── JiraConfigPanel.tsx (NEW)
      ├── ErrorCard.tsx (NEW)
      └── ErrorStats.tsx (NEW)

demo-pos-app/scripts/
  └── test-errors.ts (NEW) - Error scenario testing
```

### Files to Modify
```
packages/shared/src/
  └── sqlite-schema.ts - Add new tables

apps/api/src/
  ├── routes/main-routes.ts - Add integration endpoints
  ├── index.ts - Add WebSocket server
  └── services/
      ├── log-watcher.ts - Add event integration
      └── jira-integration.ts - Enhance with auto-creation

demo-pos-app/src/
  └── pos-service.ts - Add error scenarios

apps/web/src/
  ├── App.tsx - Add admin routes
  └── pages/admin/index.tsx - Admin panel entry
```

---

## 10. Next Steps

1. **Immediate (Today)**
   - [ ] Review and approve this plan
   - [ ] Set up feature branch: `feature/phase-4-real-time-monitoring`
   - [ ] Create subtask issues for each component

2. **Week 1**
   - [ ] Implement database schema changes
   - [ ] Create encryption service
   - [ ] Build admin API endpoints
   - [ ] Set up real-time processing pipeline

3. **Week 2**
   - [ ] Implement admin UI
   - [ ] Add WebSocket integration
   - [ ] Create error scenarios in demo POS
   - [ ] End-to-end testing

4. **Week 3**
   - [ ] Performance optimization
   - [ ] Security audit
   - [ ] Documentation
   - [ ] Demo preparation

---

## 11. Questions & Decisions

**Q: Should we use external log aggregation service like Datadog/CloudWatch?**
A: Not for MVP. Internal LogWatcher is sufficient. Can scale to external later.

**Q: How long to keep historical errors in database?**
A: Keep 30 days by default, archive older to storage.

**Q: Should Jira ticket creation be immediate or batch?**
A: Immediate per error to show real-time automation to client.

**Q: Can we support other ticketing systems (Azure DevOps, GitHub Issues)?**
A: Yes, but not for MVP. Jira only for now.

**Q: What if Jira is offline?**
A: Queue errors in database, retry every 5 minutes, show warning in admin UI.

---

## 12. Documentation Reference

Once Phase 4 is complete, documentation will be in:
- `docs/06_WORKFLOWS/03_Real_Time_Monitoring.md` - Complete workflow
- `docs/04_API_REFERENCE/integrations/JIRA_REAL_TIME.md` - Real-time Jira integration
- `docs/07_DEPLOYMENT/05_Admin_Backend_Configuration.md` - Admin UI guide

---

**Ready to Start Implementation?**  
Approve this plan and let's build the production-ready real-time error monitoring system! 🚀

---

*Document Created: November 16, 2024*  
*Status: Ready for Implementation*  
*Phase: 4 (Final MVP)*
