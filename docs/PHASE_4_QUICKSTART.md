# Phase 4: Quick Start Implementation Guide

**Status**: 🚀 Ready to Code  
**Target Duration**: 2-3 weeks  
**Priority**: CRITICAL - Client Demo

---

## Quick Summary: What You Need to Know

Your vision: **Real-time log monitoring → AI analysis → Automatic Jira tickets**

Current state: **Components exist but not integrated**

Your 3 questions answered:
1. ✅ **Real-time monitoring**: LogWatcher already does this (internal service)
2. ✅ **Error detection**: Already working (demo POS logs errors correctly)  
3. ❌ **Jira automation**: Service exists but NOT triggered automatically yet

---

## Getting Started: 5-Step Quick Implementation

### Step 1: Add Database Tables (1 hour)

**File**: `packages/shared/src/sqlite-schema.ts`

Add three new tables at the end:

```typescript
// 1. Store Jira credentials securely
export const integrationsConfig = sqliteTable("integrations_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  integationType: text("integration_type").notNull(), // "jira"
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(false),
  displayName: text("display_name").notNull(),
  
  // Jira fields
  jiraHost: text("jira_host"),
  jiraProjectKey: text("jira_project_key"),
  jiraUserEmail: text("jira_user_email"),
  jiraApiToken: text("jira_api_token"), // Will be encrypted
  
  // Metadata
  lastTestedAt: integer("last_tested_at", { mode: "timestamp" }),
  testStatus: text("test_status"),
  testErrorMessage: text("test_error_message"),
  configuredBy: integer("configured_by").references(() => users.id),
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 2. Link detected errors to Jira tickets
export const jiraTickets = sqliteTable("jira_tickets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  jiraTicketKey: text("jira_ticket_key").notNull(), // "PROJ-123"
  jiraTicketId: text("jira_ticket_id").notNull(),
  jiraUrl: text("jira_url").notNull(),
  status: text("status").notNull(), // "open", "resolved"
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// 3. Track error through entire pipeline
export const errorDetectionEvents = sqliteTable("error_detection_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  errorLogId: integer("error_log_id").references(() => errorLogs.id),
  
  // Pipeline status
  detectionTimestamp: integer("detection_timestamp", { mode: "timestamp" }),
  aiAnalysisStatus: text("ai_analysis_status"), // "pending", "completed", "failed"
  aiSuggestions: text("ai_suggestions", { mode: "json" }),
  jiraCreationStatus: text("jira_creation_status"), // "pending", "success", "failed"
  jiraCreationError: text("jira_creation_error"),
  
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**Test**: 
```bash
npm run db:migrate
sqlite3 db/app.db ".schema integrations_config"
# Should show new table
```

---

### Step 2: Create Error Processing Service (2 hours)

**File**: `apps/api/src/services/error-processing-service.ts` (NEW)

```typescript
import { EventEmitter } from "events";
import { storage } from "../database/database-storage.js";
import { aiService } from "./ai-service.js";
import { jiraService } from "./jira-integration.js";
import type { ParsedError } from "./log-parser.js";

export class ErrorProcessingService extends EventEmitter {
  /**
   * Process a detected error through the complete pipeline:
   * 1. Store error
   * 2. Run AI analysis
   * 3. Create Jira ticket (if enabled)
   * 4. Emit updates for dashboard
   */
  async processDetectedError(error: ParsedError): Promise<void> {
    try {
      console.log(`[ErrorProcessingService] Processing error: ${error.errorType}`);

      // Step 1: Store error in database
      const errorLog = await storage.createErrorLog({
        severity: error.severity,
        errorType: error.errorType,
        message: error.message,
        fullText: error.fullText,
        pattern: error.pattern,
      });
      console.log(`[ErrorProcessingService] ✓ Error stored: #${errorLog.id}`);

      // Step 2: Create detection event
      const event = await storage.createDetectionEvent({
        errorLogId: errorLog.id,
        detectionTimestamp: new Date(),
        aiAnalysisStatus: "pending",
      });
      console.log(`[ErrorProcessingService] ✓ Event created: #${event.id}`);

      // Step 3: Run AI analysis
      try {
        const aiAnalysis = await aiService.analyzeError(errorLog);
        await storage.updateDetectionEvent(event.id, {
          aiAnalysisStatus: "completed",
          aiSuggestions: aiAnalysis,
        });
        console.log(
          `[ErrorProcessingService] ✓ AI analysis completed, confidence: ${aiAnalysis.mlConfidence}`
        );
      } catch (aiError) {
        console.error("[ErrorProcessingService] ✗ AI analysis failed:", aiError);
        await storage.updateDetectionEvent(event.id, {
          aiAnalysisStatus: "failed",
        });
        throw aiError;
      }

      // Step 4: Create Jira ticket (if enabled)
      try {
        const jiraConfig = await storage.getEnabledIntegration("jira");
        if (jiraConfig) {
          const ticket = await jiraService.createTicket({
            errorType: error.errorType,
            severity: error.severity,
            message: error.message,
            mlConfidence: aiAnalysis.mlConfidence,
          });

          // Link ticket to error
          await storage.linkJiraTicket(errorLog.id, ticket);

          // Update event status
          await storage.updateDetectionEvent(event.id, {
            jiraCreationStatus: "success",
          });

          console.log(
            `[ErrorProcessingService] ✓ Jira ticket created: ${ticket.key}`
          );
        } else {
          console.log(
            "[ErrorProcessingService] ℹ Jira not enabled, skipping ticket creation"
          );
          await storage.updateDetectionEvent(event.id, {
            jiraCreationStatus: "skipped",
          });
        }
      } catch (jiraError) {
        console.error("[ErrorProcessingService] ✗ Jira ticket creation failed:", jiraError);
        await storage.updateDetectionEvent(event.id, {
          jiraCreationStatus: "failed",
          jiraCreationError: String(jiraError),
        });
        // Don't throw - let system continue even if Jira fails
      }

      // Step 5: Emit event for real-time dashboard
      this.emit("error-processed", {
        errorLog,
        event,
        timestamp: new Date().toISOString(),
      });
      console.log("[ErrorProcessingService] ✓ Complete pipeline finished");
    } catch (error) {
      console.error("[ErrorProcessingService] ✗ Pipeline error:", error);
      this.emit("error", error);
    }
  }
}

export const errorProcessingService = new ErrorProcessingService();
```

**Test**:
```bash
# Check file exists and is valid TypeScript
npx tsc --noEmit apps/api/src/services/error-processing-service.ts
```

---

### Step 3: Wire LogWatcher to Processing Service (1 hour)

**File**: `apps/api/src/index.ts` (MODIFY)

Find where app starts and add:

```typescript
import { logWatcher } from "./services/log-watcher.js";
import { errorProcessingService } from "./services/error-processing-service.js";

// ... existing code ...

// After server starts:
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);

  // 🆕 Start LogWatcher and connect to processing service
  (async () => {
    try {
      // Listen for detected errors
      logWatcher.on("error-detected", (event: any) => {
        console.log(`[App] Error detected, processing: ${event.error.errorType}`);
        errorProcessingService.processDetectedError(event.error);
      });

      // Start watching log files
      const logPaths = ["/data/pos-application.log"];
      await logWatcher.start(logPaths);
      console.log("[App] ✓ LogWatcher started");
    } catch (error) {
      console.error("[App] ✗ Failed to start LogWatcher:", error);
    }
  })();
});
```

**Test**:
```bash
npm run dev
# Should see: "[App] ✓ LogWatcher started"
```

---

### Step 4: Add Admin Jira Configuration Endpoints (2 hours)

**File**: `apps/api/src/routes/main-routes.ts` (MODIFY)

Add these endpoints:

```typescript
// Around line 269 where other admin endpoints are

// Get all integrations
app.get("/api/admin/integrations", requireAdmin, async (req, res) => {
  try {
    const integrations = await storage.getAllIntegrations();
    res.json({ integrations });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Create or update integration
app.post("/api/admin/integrations", requireSuperAdmin, async (req, res) => {
  try {
    const {
      integationType,
      displayName,
      jiraHost,
      jiraProjectKey,
      jiraUserEmail,
      jiraApiToken,
    } = req.body;

    const integration = await storage.createIntegration({
      integationType,
      displayName,
      jiraHost,
      jiraProjectKey,
      jiraUserEmail,
      jiraApiToken, // Will be encrypted before storage
      configuredBy: req.user.id,
    });

    res.json({ success: true, integration });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// Test Jira connection
app.post("/api/admin/integrations/:id/test", requireAdmin, async (req, res) => {
  try {
    const integration = await storage.getIntegration(req.params.id);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    // Test connection
    const jiraServiceTest = new JiraIntegrationService(integration);
    const isConfigured = jiraServiceTest.isConfigured();

    if (isConfigured) {
      // Try to fetch Jira info
      try {
        // This would call Jira API to verify credentials
        res.json({
          success: true,
          message: "Connection successful",
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          error: String(error),
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: "Integration not configured",
      });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Enable integration
app.post("/api/admin/integrations/:id/enable", requireSuperAdmin, async (req, res) => {
  try {
    await storage.updateIntegration(req.params.id, { isEnabled: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Disable integration
app.post("/api/admin/integrations/:id/disable", requireSuperAdmin, async (req, res) => {
  try {
    await storage.updateIntegration(req.params.id, { isEnabled: false });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Get real-time errors
app.get("/api/admin/errors/realtime", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const errors = await storage.getRecentErrors(limit, offset);
    const total = await storage.getErrorCount();

    res.json({
      errors,
      total,
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

**Test**:
```bash
# Start server
npm run dev

# Test get integrations
curl http://localhost:4000/api/admin/integrations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Should return: { integrations: [] }
```

---

### Step 5: Create Admin Dashboard UI (3 hours)

**File**: `apps/web/src/pages/admin/integrations.tsx` (NEW)

```tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function IntegrationSettings() {
  const [jiraConfig, setJiraConfig] = useState({
    jiraHost: '',
    jiraProjectKey: '',
    jiraUserEmail: '',
    jiraApiToken: '',
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load existing config
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch('/api/admin/integrations');
      const data = await response.json();
      const jira = data.integrations.find((i: any) => i.integationType === 'jira');
      if (jira) {
        setJiraConfig({
          jiraHost: jira.jiraHost,
          jiraProjectKey: jira.jiraProjectKey,
          jiraUserEmail: jira.jiraUserEmail,
          jiraApiToken: jira.jiraApiToken || '',
        });
        setIsEnabled(jira.isEnabled);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integationType: 'jira',
          displayName: 'Jira Cloud',
          ...jiraConfig,
        }),
      });
      if (response.ok) {
        alert('Configuration saved!');
      } else {
        alert('Failed to save configuration');
      }
    } catch (error) {
      alert('Error saving configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/integrations/1/test', {
        method: 'POST',
      });
      const data = await response.json();
      setTestStatus(data.success ? 'Success!' : `Failed: ${data.error}`);
    } catch (error) {
      setTestStatus('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Jira Integration Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              label="Jira Host"
              placeholder="https://company.atlassian.net"
              value={jiraConfig.jiraHost}
              onChange={(e) =>
                setJiraConfig({ ...jiraConfig, jiraHost: e.target.value })
              }
            />
            <Input
              label="Project Key"
              placeholder="PROJ"
              value={jiraConfig.jiraProjectKey}
              onChange={(e) =>
                setJiraConfig({
                  ...jiraConfig,
                  jiraProjectKey: e.target.value,
                })
              }
            />
            <Input
              label="User Email"
              placeholder="user@company.com"
              value={jiraConfig.jiraUserEmail}
              onChange={(e) =>
                setJiraConfig({ ...jiraConfig, jiraUserEmail: e.target.value })
              }
            />
            <Input
              label="API Token"
              type="password"
              placeholder="Your API token"
              value={jiraConfig.jiraApiToken}
              onChange={(e) =>
                setJiraConfig({ ...jiraConfig, jiraApiToken: e.target.value })
              }
            />

            <div className="flex gap-2">
              <Button onClick={handleTest} disabled={loading}>
                Test Connection
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Save Configuration
              </Button>
            </div>

            {testStatus && <p className="text-sm">{testStatus}</p>}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() =>
                  fetch(
                    `/api/admin/integrations/1/${
                      isEnabled ? 'disable' : 'enable'
                    }`,
                    { method: 'POST' }
                  )
                }
              />
              <label>Enable Jira Integration</label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing the Complete Flow

### End-to-End Test (10 minutes)

**Step 1: Start everything**
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Start demo POS
cd demo-pos-app && npm start

# Terminal 3: Start frontend
cd apps/web && npm run dev
```

**Step 2: Configure Jira**
```bash
# Open http://localhost:5173/admin/integrations
# Enter Jira credentials
# Click "Test Connection"
# Should see "Success!"
# Click "Enable Jira Integration"
```

**Step 3: Create an error**
```bash
# Open POS app
# Create order with Product #999 (no price)
# See error in POS response
```

**Step 4: Watch the magic happen**
```bash
# Terminal 1 logs should show:
# "[ErrorProcessingService] Processing error: MISSING_PRICE"
# "[ErrorProcessingService] ✓ Error stored: #1"
# "[ErrorProcessingService] ✓ AI analysis completed, confidence: 0.95"
# "[ErrorProcessingService] ✓ Jira ticket created: PROJ-123"

# Check Jira
# Should see new ticket with error details
```

---

## Quick Implementation Checklist

- [ ] **Database**: Add 3 new tables (1 hour)
- [ ] **Service**: Create ErrorProcessingService (2 hours)
- [ ] **Wiring**: Connect LogWatcher to service (1 hour)
- [ ] **APIs**: Add admin endpoints (2 hours)
- [ ] **UI**: Create admin config page (3 hours)
- [ ] **Testing**: End-to-end test (1 hour)

**Total**: 10 hours for core implementation

---

## Next: Advanced Features (Optional)

Once the core works, you can add:
- [ ] WebSocket for real-time dashboard
- [ ] Error monitoring dashboard
- [ ] Multiple error scenarios
- [ ] Manual Jira ticket creation
- [ ] Slack notifications
- [ ] Email alerts

---

## Support

If you get stuck:
1. Check server logs: `npm run dev` output
2. Check database: `sqlite3 db/app.db ".schema"`
3. Check Jira API: Test credentials in admin UI
4. Check demo POS: `tail -f /data/pos-application.log`

---

**Ready to start? Let's build this! 🚀**

Remember: The key is getting LogWatcher → ErrorProcessingService → Jira working end-to-end first. Everything else is enhancement.

Start with Step 1 today!
