# ⚡ Quick Reference: POS + StackLens + Jira Integration

## 30-Second Overview

This integration creates an **automated error handling system**:

```
POS Application (logs errors)
         ↓
Watcher detects new logs
         ↓
StackLens AI analyzes instantly
         ↓
Decision: Create Jira ticket?
         ↓
If YES → Jira ticket created automatically
         ↓
Dashboard shows everything in real-time
```

---

## What's Already Working in Your Code

| Feature | Location | Status |
|---------|----------|--------|
| Error detection | `log-parser.ts` | ✅ 100% ready |
| Feature engineering | `feature-engineer.ts` | ✅ 100% ready |
| ML predictions | `predictor.ts` | ✅ 100% ready |
| AI suggestions | `suggestor.ts` | ✅ 100% ready |
| File uploads | `main-routes.ts` | ✅ 100% ready |
| Dashboard | `dashboard.tsx` | ⚠️ 60% ready |
| API framework | Express + SQLite | ✅ 100% ready |

**Status**: 90% of infrastructure exists, just need to add:
- Demo POS app
- Log watcher
- Jira integration
- Real-time UI updates

---

## Code You Need to Write

### Must-Have (Critical Path)

```typescript
// 1. Demo POS (3 hours)
// File: demo-services/pos-application.ts
- Simple Express server
- Product catalog with pricing
- Order endpoint that triggers error on product #999
- Real-time logging

// 2. Log Watcher (2 hours)
// File: apps/api/src/services/log-watcher.ts
- Watch log file for changes
- Parse new lines
- Emit 'error-detected' events
- Use chokidar module

// 3. Jira Integration (3 hours)
// File: apps/api/src/services/jira-integration.ts
- Create tickets
- Update tickets
- Search existing tickets
- Severity → Priority mapping

// 4. Automation Orchestrator (2 hours)
// File: apps/api/src/services/error-automation.ts
- Decide whether to create ticket
- Route to Jira
- Log automation decisions
- Handle errors gracefully
```

### Nice-to-Have (Enhancement)

```typescript
// 5. Real-time UI (3 hours)
// File: apps/web/src/pages/real-time-monitoring.tsx
- Display error stream
- Show statistics
- Link to Jira tickets
- Control monitoring on/off

// 6. API Endpoints (2 hours)
// Modifications to: apps/api/src/routes/main-routes.ts
- POST /api/stream/analyze
- GET /api/monitoring/live
- POST /api/automation/create-jira
- PUT /api/automation/update-jira
```

---

## Installation Steps

### 1. Install Dependencies

```bash
npm install chokidar axios
```

### 2. Get Jira Setup

```
1. Go to https://your-company.atlassian.net
2. Settings → Apps & integrations → API tokens
3. Create new token
4. Copy token
5. Add to .env:
   JIRA_BASE_URL=https://your-company.atlassian.net
   JIRA_USERNAME=your-email@company.com
   JIRA_API_TOKEN=paste-token-here
   JIRA_PROJECT_KEY=YOUR_PROJECT
```

### 3. Create Demo POS Service

```bash
mkdir -p demo-services
# Create pos-application.ts (copy code from DEMO_SHOWCASE_ARCHITECTURE.md)
npm run demo:pos
```

### 4. Verify Setup

```bash
# Terminal 1: Start POS
npm run demo:pos

# Terminal 2: Start StackLens
npm run dev

# Terminal 3: Test error
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Check: data/pos-application.log should have ERROR
cat data/pos-application.log
```

---

## How It Works (Step-by-Step)

### The Demo Error Scenario

```
1. User orders "Premium Item" (product ID 999)
2. POS app tries to calculate price
3. Price is NULL in database
4. Error logged: "Product has no price"
5. Log file updated in real-time
6. Watcher detects new error line
7. API analyzes the line
8. StackLens predicts: HIGH severity, PRICING_ERROR
9. Confidence: 0.92 (high confidence)
10. AI suggests: "Add price validation"
11. Automation decides: CREATE JIRA TICKET
12. Jira ticket created with all details
13. Dashboard updates with new ticket link
14. Done - took <2 seconds total
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ pos-application.ts                                      │
│ Logs: "2025-11-13 ERROR Product 999 has no price"      │
└──────────────────┬──────────────────────────────────────┘
                   │ file write
                   ▼
┌─────────────────────────────────────────────────────────┐
│ data/pos-application.log                                │
│ ...existing logs...                                     │
│ 2025-11-13... ERROR Product 999 has no price (NEW)     │
└──────────────────┬──────────────────────────────────────┘
                   │ file change event
                   ▼
┌─────────────────────────────────────────────────────────┐
│ log-watcher.ts                                          │
│ emit('error-detected', { line, timestamp })            │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP request
                   ▼
┌──────────────────────────────────────────────────────────┐
│ POST /api/stream/analyze                                │
│ Body: { logLine: "...", source: "stream" }              │
└──────────────────┬───────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
   ┌────────┐ ┌──────┐ ┌──────────┐
   │ Parser │ │ML    │ │AI        │
   │        │ │Model │ │Service   │
   └────────┘ └──────┘ └──────────┘
        │          │          │
        └──────────┼──────────┘
                   │ Returns: severity, confidence, suggestion
                   ▼
┌──────────────────────────────────────────────────────────┐
│ error-automation.ts                                      │
│ Decision: Is confidence > threshold? Should automate?    │
│ YES → Create Jira ticket                                 │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│ jira-integration.ts                                      │
│ Jira API Call: Create Issue                              │
│ Summary: [HIGH] PRICING_ERROR: Product 999...            │
│ Description: Root cause, steps, code examples            │
│ Status: OPEN                                             │
└──────────────────┬───────────────────────────────────────┘
                   │ API response
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Database                                                 │
│ jiraTickets table: Store ticket key, URL, mapping        │
│ automationLogs table: Log that automation ran            │
└──────────────────┬───────────────────────────────────────┘
                   │ WebSocket/SSE
                   ▼
┌──────────────────────────────────────────────────────────┐
│ Browser Dashboard                                        │
│ [Alert] 🔴 PRICING_ERROR                                │
│ Root Cause: Missing product price                       │
│ Jira Ticket: STACK-1234 [Open]                          │
│ Suggestion: Add price validation                        │
└──────────────────────────────────────────────────────────┘
```

---

## Key Decision Points

### 1. When to Create Jira Ticket?

```typescript
// Rule-based decision
if (severity === 'critical') 
  → CREATE TICKET (always)

else if (severity === 'high' && confidence > 0.75)
  → CREATE TICKET (high confidence)

else if (severity === 'medium' && confidence > 0.9)
  → CREATE TICKET (very high confidence)

else
  → SKIP (log only, no ticket)
```

### 2. New Ticket or Update Existing?

```typescript
// Check if similar error already has ticket
existingTicket = searchJira('PRICING_ERROR')

if (existingTicket)
  → UPDATE existing ticket (increment count)
else
  → CREATE new ticket
```

### 3. What Automation Information to Store?

```typescript
// Every automation action logged:
{
  errorLogId: 12345,
  action: 'ticket_created' | 'ticket_updated' | 'skipped',
  reason: 'HIGH_SEVERITY' | 'HIGH_CONFIDENCE' | 'LOW_PRIORITY',
  resultTicketKey: 'STACK-1234',
  success: true,
  timestamp: '2025-11-13T...',
}
```

---

## Testing Checklist

### Quick Validation (5 minutes)

```bash
# 1. Check POS app works
curl http://localhost:3001/api/products
# Should return: [{"id": 1, "name": "Coffee", ...}]

# 2. Create valid order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 1, "quantity": 1}]}'
# Should return: {"status": "completed", "total": 2.50}

# 3. Create error-triggering order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'
# Should return: {"code": "MISSING_PRICE", "message": "..."}

# 4. Check log file
tail -5 data/pos-application.log
# Should show ERROR lines

# 5. Test API stream analysis
curl -X POST http://localhost:4000/api/stream/analyze \
  -H "Content-Type: application/json" \
  -d '{"logLine": "ERROR Product 999 has no price", "source": "test"}'
# Should return: analysis result with severity, confidence
```

### Full Demo (15 minutes)

```bash
# 1. Terminal 1: Start POS
npm run demo:pos

# 2. Terminal 2: Start StackLens API
npm run dev:server

# 3. Terminal 3: Start Web UI
npm run dev:client

# 4. Terminal 4: Watch logs
tail -f data/pos-application.log

# 5. Open browser: http://localhost:5173/real-time-monitoring

# 6. Create error order
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# 7. Observe:
#    ✓ Error in Terminal 4
#    ✓ Alert in browser dashboard
#    ✓ Analysis result visible
#    ✓ Jira ticket link appears
```

---

## Troubleshooting

### Issue: Log file not being watched

```bash
# Check if file exists
ls -la data/pos-application.log

# If missing, create it
touch data/pos-application.log

# Restart watcher
npm run dev
```

### Issue: Jira ticket not creating

```bash
# Check Jira credentials in .env
echo $JIRA_API_TOKEN

# Test Jira API directly
curl -X GET https://your-jira.atlassian.net/rest/api/3/projects \
  -H "Authorization: Basic $(echo -n 'email:token' | base64)"

# Check API logs for error
npm run dev 2>&1 | grep -i jira
```

### Issue: Dashboard not updating

```bash
# Check browser console for errors
# Open DevTools (F12) → Console tab

# Check API is sending SSE
curl -N http://localhost:4000/api/monitoring/live

# Verify EventSource connection
# (Should show: data: {"type":"connected"})
```

---

## Performance Tips

### Optimization Points

1. **Log Watcher**: Use polling interval of 100-200ms
2. **API Response**: Cache feature extraction results
3. **Jira API**: Implement batch operations for multiple errors
4. **Database**: Add indexes on (errorType, severity)
5. **UI**: Virtualize error list for 100+ items

### Expected Performance

| Operation | Target | Acceptable |
|-----------|--------|-----------|
| Error detection | <500ms | <1s |
| API analysis | <1s | <2s |
| Jira creation | <2s | <5s |
| UI update | <500ms | <2s |
| Total E2E | <4s | <10s |

---

## Next Actions

### Immediate (Today)

1. ✅ Read this entire document
2. ✅ Review `DEMO_SHOWCASE_ARCHITECTURE.md`
3. ⭐ Review `MVP_IMPLEMENTATION_CHECKLIST.md`
4. 🔨 Start with **Demo POS Application** (Phase 1.1)

### This Week

1. Build Demo POS (Phase 1)
2. Build Log Watcher (Phase 1)
3. Build Jira Integration (Phase 1)
4. Test end-to-end flow

### Next Week

1. Build API endpoints (Phase 2)
2. Build automation service (Phase 2)
3. Build real-time UI (Phase 4)
4. Final testing and demo

### Success Criteria

- [ ] Error created in POS
- [ ] Detected by watcher in <500ms
- [ ] Analyzed by StackLens in <1s
- [ ] Jira ticket created in <2s
- [ ] Dashboard updated in real-time
- [ ] Full demo runs without manual intervention

---

## Code Snippets Reference

### Starting POS Service

```typescript
import express from 'express';
const app = express();
app.listen(3001, () => console.log('POS running on 3001'));
```

### Creating Jira Ticket

```typescript
const jira = new JiraIntegration(config);
const ticket = await jira.createTicket({
  errorType: 'PRICING_ERROR',
  severity: 'high',
  message: 'Product 999 has no price',
  rootCause: 'Missing price configuration',
  resolutionSteps: ['Add price validation', 'Update product master'],
});
```

### Analyzing Stream

```typescript
const parser = new LogParser([]);
const parsed = parser.parseLogFile(logLine, 'stream');
const features = engineer.extractFeatures(parsed[0]);
const prediction = predictor.predictSingle(features);
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `DEMO_SHOWCASE_ARCHITECTURE.md` | Complete architecture & code |
| `MVP_IMPLEMENTATION_CHECKLIST.md` | Task tracking |
| `QUICK_REFERENCE.md` | This file |
| `demo-services/pos-application.ts` | Demo POS app (TO CREATE) |
| `apps/api/src/services/log-watcher.ts` | File watcher (TO CREATE) |
| `apps/api/src/services/jira-integration.ts` | Jira API wrapper (TO CREATE) |
| `apps/api/src/services/error-automation.ts` | Automation logic (TO CREATE) |
| `apps/web/src/pages/real-time-monitoring.tsx` | Live dashboard (TO CREATE) |

---

## Questions to Ask

When you get stuck, ask:

1. **Is the error being logged?**
   - Check: `tail data/pos-application.log`

2. **Is the watcher detecting it?**
   - Check: Console logs for "error-detected" event

3. **Is the API analyzing it?**
   - Check: Call `/api/stream/analyze` endpoint directly

4. **Is automation deciding correctly?**
   - Check: Error severity and confidence scores

5. **Is Jira ticket being created?**
   - Check: Jira project directly or API logs

6. **Is UI updating?**
   - Check: Browser DevTools Network tab for SSE events

---

## Resources

- **Jira API Docs**: https://developer.atlassian.com/cloud/jira/rest/v3
- **Chokidar Docs**: https://github.com/paulmillr/chokidar
- **Server-Sent Events**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **Your Codebase**: 
  - Error analysis: `apps/api/src/services/`
  - Routes: `apps/api/src/routes/main-routes.ts`
  - UI: `apps/web/src/pages/`

---

## Good Luck! 🚀

You have:
- ✅ A solid codebase foundation
- ✅ Clear architecture
- ✅ Detailed implementation guides
- ✅ Working examples
- ✅ A path to production

Start with Phase 1, test after each component, and you'll have a working demo in 3 days.

Questions? Check the detailed architecture document or reach out!
