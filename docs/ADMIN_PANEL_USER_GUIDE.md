# Using the New Jira Integration Admin Panel

## Access the Admin Panel

### Step 1: Navigate to Admin Dashboard
1. Open StackLens in browser: `http://localhost:3000`
2. Login with admin credentials
3. Go to Admin page (from navigation menu)

### Step 2: Click on "Jira Integration" Tab
Located in the tab bar alongside:
- Overview
- Users
- Roles
- Training
- AI Models
- UI Settings
- API & Integration
- **Jira Integration** ← NEW TAB

---

## Panel Overview

```
┌─────────────────────────────────────────────────────────┐
│ Jira Integration          [Refresh]                     │
│ Manage Jira configuration, error automation, and        │
│ real-time monitoring                                    │
├─────────────────────────────────────────────────────────┤
│ [Status] [Configuration] [Automation] [Monitoring]      │
│ [History]                                               │
└─────────────────────────────────────────────────────────┘
```

---

## Tab 1: Status (Default View)

Shows real-time status of all components.

### Jira Configuration Card
```
┌─ Jira Configuration ────────────────────┐
│                                         │
│ ✓ Connected                             │
│ Project: STACK                          │
│                                         │
└─────────────────────────────────────────┘
```

**Indicators**:
- ✓ Green checkmark = Connected and configured
- ✗ Red X = Not configured or connection failed

**What to do if not connected**:
1. Go to Configuration tab
2. Check environment variables
3. Make sure Jira API token is set

### Log Watcher Card
```
┌─ Log Watcher ──────────────────────────┐
│                                         │
│ ● Active                                │
│ Monitoring: 1 file                      │
│ Total errors: 47                        │
│                                         │
│ [Start] [Stop]                          │
│                                         │
└─────────────────────────────────────────┘
```

**Controls**:
- **[Start]**: Begin monitoring log files
- **[Stop]**: Stop monitoring (stops detection)

**Status Indicators**:
- ● Active (Green badge) = Monitoring is running
- ○ Inactive (Gray badge) = Monitoring stopped

### Error Automation Card
```
┌─ Error Automation ─────────────────────┐
│                                         │
│ ● Enabled               [Toggle]       │
│ Processed: 47                           │
│ Created: 23                             │
│ Updated: 12                             │
│ Skipped: 12                             │
│ Failed: 0                               │
│                                         │
└─────────────────────────────────────────┘
```

**Statistics**:
- **Processed**: Total errors analyzed
- **Created**: New Jira tickets created
- **Updated**: Existing tickets updated (duplicates)
- **Skipped**: Errors below confidence threshold
- **Failed**: Automation failures

**Control**:
- **[Toggle]**: Enable/disable automation
- Works independently from log watcher
- When disabled: Errors still detected but no tickets created

---

## Tab 2: Configuration

Shows what configuration is needed.

### Required Environment Variables
```
┌─ Environment Configuration ────────────┐
│                                         │
│ The following must be set on server:   │
│                                         │
│ JIRA_HOST                              │
│ JIRA_PROJECT_KEY                        │
│ JIRA_USER_EMAIL                         │
│ JIRA_API_TOKEN                          │
│                                         │
└─────────────────────────────────────────┘
```

### Current Configuration Values
```
┌─ Configuration Values ─────────────────┐
│                                         │
│ Jira Host: https://your-domain...     │
│ Project Key: STACK                     │
│                                         │
└─────────────────────────────────────────┘
```

**How to Set Up**:
1. Get Jira API token from: https://id.atlassian.com/manage-profile/security/api-tokens
2. Set environment variables in your `.env` file:
   ```
   JIRA_HOST=https://your-domain.atlassian.net
   JIRA_PROJECT_KEY=STACK
   JIRA_USER_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-api-token
   ```
3. Restart StackLens backend
4. Go back to Status tab to verify connection

---

## Tab 3: Automation

Shows ML confidence thresholds for each severity level.

### Threshold Visualization
```
┌─ CRITICAL ──────────────────────────────┐
│ Always creates a ticket, regardless of  │
│ ML confidence                           │
│ [████████████████████████████] 0%       │
└─────────────────────────────────────────┘

┌─ HIGH ──────────────────────────────────┐
│ Creates a ticket if ML confidence is    │
│ 75% or higher                           │
│ [████████████░░░░░░░░░░░░░░░] 75%       │
└─────────────────────────────────────────┘

┌─ MEDIUM ────────────────────────────────┐
│ Creates a ticket if ML confidence is    │
│ 90% or higher                           │
│ [██████████████░░░░░░░░░░░░░░] 90%       │
└─────────────────────────────────────────┘

┌─ LOW ───────────────────────────────────┐
│ Skipped - no automatic tickets created  │
│ [░░░░░░░░░░░░░░░░░░░░░░░░░░░░] DISABLED │
└─────────────────────────────────────────┘
```

**Understanding the Thresholds**:

- **CRITICAL**: If severity is CRITICAL → Always create ticket (0% threshold = no confidence required)
- **HIGH**: If severity is HIGH and ML confidence ≥ 75% → Create ticket
- **MEDIUM**: If severity is MEDIUM and ML confidence ≥ 90% → Create ticket
- **LOW**: Severity LOW → Always skip (100% unattainable threshold)

**Example Scenarios**:

| Severity | ML Confidence | Decision | Reason |
|----------|---------------|----------|--------|
| CRITICAL | 30% | ✓ CREATE | CRITICAL always creates |
| HIGH | 80% | ✓ CREATE | 80% ≥ 75% threshold |
| HIGH | 70% | ✗ SKIP | 70% < 75% threshold |
| MEDIUM | 95% | ✓ CREATE | 95% ≥ 90% threshold |
| MEDIUM | 85% | ✗ SKIP | 85% < 90% threshold |
| LOW | 99% | ✗ SKIP | LOW always skips |

---

## Tab 4: Monitoring (Real-Time)

Watch errors and automation events in real-time.

### Real-Time Event Stream
```
┌─ Real-Time Monitoring ──────────────────┐
│ ● Connected          [Stop Monitoring]  │
│                                         │
│ [ERROR] CRITICAL: Pricing error        │
│ [TICKET] Created: STACK-123 for CRITICAL│
│ [UPDATE] STACK-123: Updated with details│
│ [ERROR] HIGH: Product not found        │
│ [TICKET] Created: STACK-124 for HIGH    │
│ [ERROR] MEDIUM: Inventory low          │
│ [ERROR] CRITICAL: Payment failed       │
│ [TICKET] Created: STACK-125 for CRITICAL│
│                                         │
│ (showing last 50 events, scrollable)   │
│                                         │
└─────────────────────────────────────────┘
```

**How to Use**:
1. Click "[Start Monitoring]" to begin real-time stream
2. Watch events appear as they happen
3. Connection status shown at top (● Connected / ○ Disconnected)
4. Scroll through event history
5. Click "[Stop Monitoring]" to close stream

**Event Types**:
- `[ERROR]` - New error detected
- `[TICKET]` - New Jira ticket created
- `[UPDATE]` - Existing ticket updated

**Auto-Refresh**: 
- New events appear in real-time (via SSE)
- No need to manually refresh
- Connection auto-closes if disconnected

---

## Tab 5: History & Audit

Placeholder for detailed automation history (enhanced in Phase 2).

### Quick Statistics
```
┌─ Quick Stats ───────────────────────────┐
│                                         │
│ Total Processed: 47                     │
│ Success Rate: 75%                       │
│                                         │
│ (Detailed history coming in Phase 2)   │
│                                         │
└─────────────────────────────────────────┘
```

**What's Coming in Phase 2**:
- Paginated history of all errors
- Filter by severity, date range, store, etc.
- View each error's details
- See automation decision for each error
- Export history to CSV
- Charts and analytics

---

## Common Tasks

### Task 1: Start Monitoring Errors

1. Click "Jira Integration" tab
2. Make sure you're on "Status" tab
3. Look at "Log Watcher" card
4. If status is ○ Inactive, click "[Start]"
5. Status should change to ● Active

**Expected Result**: Watcher begins monitoring log files in real-time.

---

### Task 2: Verify Jira Configuration

1. Go to "Configuration" tab
2. Look at "Configuration Values" section
3. Verify both fields are populated:
   - Jira Host: Should show your domain
   - Project Key: Should show your project key
4. If empty, check environment variables on server

**Expected Result**: Both configuration values displayed.

---

### Task 3: Check Automation Statistics

1. Go to "Status" tab (default)
2. Look at "Error Automation" card
3. Check if ● Enabled (blue badge)
4. Look at statistics:
   - How many processed?
   - How many created tickets?
   - How many updated?
   - How many skipped?

**Expected Result**: Statistics show activity since last restart.

---

### Task 4: Watch Real-Time Events

1. Go to "Monitoring" tab
2. Click "[Start Monitoring]"
3. Wait for events to appear
4. Go to Demo POS and create an error (order with product #999)
5. Watch for events in real-time
6. You should see:
   - [ERROR] CRITICAL: Pricing error
   - [TICKET] Created: STACK-XXX

**Expected Result**: Events appear in terminal-style display in <1 second.

---

### Task 5: Understand Automation Thresholds

1. Go to "Automation" tab
2. Look at the 4 threshold cards
3. Read the descriptions for each severity level
4. Note the % thresholds
5. Understand that CRITICAL always creates, HIGH/MEDIUM require confidence, LOW always skips

**Use Case**: When you see an error:
- If CRITICAL → ticket always created
- If HIGH with 80% ML confidence → ticket created (80% ≥ 75%)
- If MEDIUM with 85% ML confidence → ticket skipped (85% < 90%)

---

### Task 6: Enable/Disable Automation

1. Go to "Status" tab
2. Find "Error Automation" card
3. Click the toggle switch
4. Status should change (Enabled ↔ Disabled)
5. Statistics remain (not cleared)

**What Happens**:
- **Enabled**: Errors are analyzed and tickets created based on thresholds
- **Disabled**: Errors still detected and logged but NO tickets created

**Use Case**: Disable during maintenance, testing, or when Jira is temporarily unavailable.

---

## Troubleshooting

### Problem: "Jira Configuration: Not Configured"

**Solution**:
1. Check that environment variables are set on backend server
2. Make sure `JIRA_API_TOKEN` is correct (not expired)
3. Verify `JIRA_HOST` is correct URL (include https://)
4. Restart backend service
5. Refresh admin page
6. Check Configuration tab for current values

---

### Problem: Log Watcher Shows "Inactive" After Start

**Solution**:
1. Check that log file path is correct
2. Make sure file exists: `data/pos-application.log`
3. Verify file has read permissions
4. Check backend logs for errors
5. Try clicking Start again

---

### Problem: No Events in Monitoring Stream

**Solution**:
1. Make sure Log Watcher is Active
2. Make sure you clicked "Start Monitoring" (blue text connects to SSE)
3. Create an error by running Demo POS app
4. Wait a moment (events update in real-time)
5. If still no events, check backend logs

---

### Problem: Tickets Not Being Created

**Checklist**:
- [ ] Jira is configured (check Status tab)
- [ ] Automation is enabled (check Status tab)
- [ ] Log Watcher is active (check Status tab)
- [ ] Error has high enough ML confidence (check Automation tab for thresholds)
- [ ] No rate limiting from Jira (check for failures in Status tab)

---

## Tips & Tricks

### Tip 1: Use Refresh Button
Click the [Refresh] button in top-right to immediately update all status displays without waiting for auto-refresh.

### Tip 2: Monitor in Multiple Tabs
- Open Status tab in one tab
- Open Monitoring tab in another
- Watch real-time updates and stats simultaneously

### Tip 3: Keep Monitoring Tab Open
Leave Monitoring tab running in background to catch real-time events. Great for monitoring during testing.

### Tip 4: Check Configuration First
Always go to Configuration tab first if having issues. It shows exactly what needs to be set up.

### Tip 5: Use Demo POS for Testing
```bash
# In Terminal 1:
cd demo-pos-app && npm run dev

# In Terminal 2:
# Create order that triggers error
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'

# Watch admin panel for real-time updates!
```

---

## Feature Summary

| Feature | Tab | Function |
|---------|-----|----------|
| Configuration Status | Status | Shows if Jira is connected |
| Watcher Control | Status | Start/Stop log monitoring |
| Automation Toggle | Status | Enable/Disable ticket creation |
| Quick Stats | Status | Processed, Created, Updated counts |
| Setup Info | Configuration | Shows required environment variables |
| Config Values | Configuration | Displays current configuration |
| Threshold Viz | Automation | Shows ML confidence thresholds |
| Threshold Docs | Automation | Explains each threshold level |
| Live Events | Monitoring | Real-time error and ticket events |
| Event Stream | Monitoring | Terminal-style event display |
| Quick Stats | History | Summary statistics |
| Future Features | History | Placeholder for Phase 2 features |

---

## API Calls Made

The admin panel calls these APIs automatically:

```
Every 30 seconds:
GET /api/jira/status
GET /api/automation/status
GET /api/watcher/status

When buttons clicked:
POST /api/watcher/start
POST /api/watcher/stop
POST /api/automation/toggle

When Monitoring tab opened:
GET /api/monitoring/live (SSE stream)
```

All calls are authenticated and include proper error handling.

---

## What's Next?

Phase 2 will enhance this admin panel with:
- Detailed error history viewer (paginated)
- Charts and analytics
- Error filtering and search
- Ticket details modal
- Export to CSV
- Bulk operations
- Custom automation rules

---

**Now you're ready to use the Jira Integration Admin Panel!**

Start by clicking the "Jira Integration" tab in your StackLens admin page.
