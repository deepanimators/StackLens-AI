# POS Analytics Integration - QUICK START

## What Was Done

✅ **Implemented complete POS → Analytics → Dashboard data pipeline**

All POS events (checkout, error, info, custom) now flow to StackLens analytics engine in real-time, generating live metrics and alerts visible on the realtime dashboard.

---

## Key Changes Made

### 1. POS Backend (pos-demo/backend/src/controllers/index.ts)
- ✅ Added `sendToAnalytics()` helper function to send HTTP POST events to StackLens
- ✅ Updated `logInfo()`, `logError()`, `logCheckout()`, `logCustom()` to call `sendToAnalytics()`

### 2. Analytics Backend (apps/api/src/routes/analyticsRoutes.ts)
- ✅ Added `POST /api/analytics/events` endpoint to receive POS events
- ✅ Implemented `generateMetricsFromEvents()` to calculate real metrics from events
- ✅ Implemented `updateAlerts()` to generate alerts based on metric thresholds

### 3. Environment Configuration (start-stack.sh)
- ✅ Added `ANALYTICS_URL=http://localhost:4000/api/analytics/events`

### 4. Testing & Documentation
- ✅ Created `test-pos-analytics-flow.sh` script to verify data flow
- ✅ Created comprehensive integration guide in `docs/POS_ANALYTICS_INTEGRATION.md`

---

## How to Test

### Option 1: Run Automated Test Script
```bash
# From project root
chmod +x test-pos-analytics-flow.sh
./test-pos-analytics-flow.sh
```

### Option 2: Manual Test
```bash
# 1. Verify services running
curl http://localhost:3000/health   # POS Backend
curl http://localhost:4000/health   # StackLens API

# 2. Send checkout event
curl -X POST http://localhost:3000/logCheckout

# 3. Check metrics were generated
curl http://localhost:4000/api/analytics/metrics | jq .

# 4. Check alerts
curl http://localhost:4000/api/analytics/alerts | jq .
```

### Option 3: GUI Test
1. Open `http://localhost:5173` (Realtime Dashboard)
2. Open `http://localhost:5174` (POS Frontend)
3. Click buttons on POS Frontend (Checkout, Error, Scan)
4. Watch metrics update on Realtime Dashboard in real-time

---

## Data Flow Diagram

```
POS Frontend (5174)
    ↓ (User clicks button)
POS Backend (3000) - logCheckout()
    ↓ logger.info()
    ↓ sendToAnalytics() ← NEW!
    ↓ HTTP POST
StackLens Analytics (4000) - POST /api/analytics/events
    ↓ generateMetricsFromEvents()
    ↓ updateAlerts()
    ↓ metrics[] array updated
Realtime Dashboard (5173)
    ↓ GET /api/analytics/metrics (every 2 sec)
    ↓ GET /api/analytics/alerts (every 2 sec)
Display: Throughput, Error Rate, Latency, Alerts
```

---

## Expected Results

### Before Integration
```
Throughput: 0
Error Rate: 0%
Latency P99: 0ms
Total Requests: 0
Alerts: None
```

### After Clicking POS Buttons (After Integration)
```
Throughput: 0.08 transactions/sec
Error Rate: 14.3%
Latency P99: 125.45ms
Total Requests: 7
Alerts: ✓ High Error Rate (warning)
```

---

## Configuration

### Default (Localhost Development)
```bash
# Automatically configured in start-stack.sh
export ANALYTICS_URL=http://localhost:4000/api/analytics/events
```

### Custom Server
```bash
cd pos-demo/backend
export ANALYTICS_URL=http://your-server:4000/api/analytics/events
npm start
```

---

## Important Notes

✅ **Analytics failures are non-blocking**: If the analytics endpoint is down, POS operations continue normally. Only a warning is logged.

✅ **In-memory storage**: Events and metrics are stored in-memory (suitable for dev/demo). Production deployments should persist to database.

✅ **Sliding windows**: System keeps last 1000 events (~5 minutes) and 500 metrics, automatically cleaning up old data.

✅ **Real-time alerts**: Alerts generate instantly when thresholds are crossed:
- ⚠️ High Latency: p99 > 200ms
- ⚠️ High Error Rate: error_rate > 5%

---

## Files Modified

```
pos-demo/backend/src/controllers/index.ts          ← Added sendToAnalytics(), updated 4 handlers
apps/api/src/routes/analyticsRoutes.ts            ← Added events endpoint + functions
start-stack.sh                                     ← Added ANALYTICS_URL export
```

## Files Created

```
test-pos-analytics-flow.sh                         ← Test script
docs/POS_ANALYTICS_INTEGRATION.md                  ← Full documentation
docs/POS_ANALYTICS_QUICK_START.md                  ← This file
```

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Dashboard shows 0 metrics | Are both services running? (3000, 4000) |
| No events in analytics | Check POS backend logs for errors |
| Metrics not updating | Verify ANALYTICS_URL env var is set |
| No alerts appearing | Send error events to cross threshold |

---

## Next Steps

1. **✅ Start Services**: Run `start-stack.sh` or start services individually
2. **✅ Test Flow**: Run `./test-pos-analytics-flow.sh`
3. **✅ View Dashboard**: Open `http://localhost:5173`
4. **✅ Click POS Buttons**: See metrics update in real-time
5. **📋 Monitor**: Check logs: `tail -f pos_backend.log`, `tail -f server.log`

---

## Support

For detailed architecture and troubleshooting:
- See: `docs/POS_ANALYTICS_INTEGRATION.md`
- Test: `./test-pos-analytics-flow.sh`
- Logs: Check `pos_backend.log` and `server.log`

