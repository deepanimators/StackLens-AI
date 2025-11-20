# 🚀 START HERE - POS Analytics Integration

## What's New?

Your POS system now sends real data to the StackLens analytics dashboard. No more zeros!

```
POS Button Click → Analytics Engine → Live Dashboard Metrics
```

---

## 3 Steps to Test

### Step 1: Start Services (if not already running)
```bash
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy
bash start-stack.sh
```

Wait for:
- ✅ "API running on port 4000"
- ✅ "Frontend running on port 5173"
- ✅ "POS Demo Backend running on port 3000"
- ✅ "POS Demo Frontend running on port 5174"

### Step 2: Run Integration Test
```bash
# In a new terminal
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy
chmod +x test-pos-analytics-flow.sh
./test-pos-analytics-flow.sh
```

Expected output:
```
✓ POS Backend running
✓ StackLens API running
✓ Events sent successfully
✓ Metrics found
✓ Analytics Flow Test Complete
```

### Step 3: View Dashboard
Open in browser:
- **Realtime Dashboard**: http://localhost:5173
- **POS Frontend**: http://localhost:5174

You should see:
- Realtime dashboard with live metrics (not zeros!)
- Metrics updating every 2 seconds
- Alerts when thresholds crossed

---

## How It Works

```
1. You click "Simulate Checkout" on POS Frontend
                    ↓
2. POS Backend logs the event AND sends to analytics
                    ↓
3. Analytics engine receives event, generates metrics
                    ↓
4. Realtime dashboard polls metrics every 2 seconds
                    ↓
5. Dashboard displays: Throughput, Error Rate, Latency, Alerts
```

---

## What Changed

### ✅ POS Backend (pos-demo/backend)
- Now sends events to analytics when buttons clicked
- All 4 handlers updated (Checkout, Error, Scan, Custom)

### ✅ Analytics Engine (apps/api)
- New endpoint to receive POS events
- Calculates real metrics from events
- Generates alerts automatically

### ✅ Config (start-stack.sh)
- Set ANALYTICS_URL so POS knows where to send events

---

## Manual Testing (if test script fails)

```bash
# Send a test event
curl -X POST http://localhost:3000/api/checkout

# Check if metrics were generated
curl http://localhost:4000/api/analytics/metrics | jq .

# Check alerts
curl http://localhost:4000/api/analytics/alerts | jq .
```

---

## Files You Should Know About

| File | Purpose |
|------|---------|
| `test-pos-analytics-flow.sh` | ← **Run this to test** |
| `IMPLEMENTATION_SUMMARY.md` | ← Complete overview |
| `docs/POS_ANALYTICS_QUICK_START.md` | Quick reference |
| `docs/POS_ANALYTICS_INTEGRATION.md` | Full technical guide |

---

## Troubleshooting

### Metrics still showing 0?
```bash
# Check 1: Is POS backend running?
curl http://localhost:3000/health

# Check 2: Is StackLens API running?
curl http://localhost:4000/health

# Check 3: Send event and check
curl -X POST http://localhost:3000/logCheckout
sleep 1
curl http://localhost:4000/api/analytics/metrics
```

### No metrics in response?
- Check POS backend logs: `tail -f pos_backend.log`
- Look for: `Failed to send analytics event` warnings
- Verify ANALYTICS_URL: `echo $ANALYTICS_URL`

### Still stuck?
- See: `docs/POS_ANALYTICS_INTEGRATION.md` → Troubleshooting section
- Run test script with verbose output: `bash -x test-pos-analytics-flow.sh`

---

## What to Expect

### Before
```
Throughput: 0.00
Error Rate: 0%
Latency P99: 0.00ms
Total Requests: 0
Alerts: None
```

### After Clicking POS Buttons
```
Throughput: 0.12 transactions/sec ✨ (LIVE!)
Error Rate: 14.3% ✨ (LIVE!)
Latency P99: 143.25ms ✨ (LIVE!)
Total Requests: 7 ✨ (LIVE!)
Alerts: High Error Rate (warning) ✨ (LIVE!)
```

---

## Quick Commands

```bash
# Start everything
bash start-stack.sh

# Run test
./test-pos-analytics-flow.sh

# Send a test event
curl -X POST http://localhost:3000/logCheckout

# Check metrics
curl http://localhost:4000/api/analytics/metrics | jq .

# Monitor logs
tail -f pos_backend.log

# View dashboard
# Open: http://localhost:5173
```

---

## Success Criteria

- [x] POS events being sent to analytics endpoint
- [x] Analytics metrics being generated
- [x] Dashboard metrics not showing 0
- [x] Alerts appearing when thresholds crossed
- [x] Test script completing successfully

---

## That's It! 🎉

Your POS system is now connected to the analytics dashboard!

**Next Step**: Run the test script and check the dashboard.

```bash
./test-pos-analytics-flow.sh
```

Questions? See the troubleshooting section above or check the full docs.

