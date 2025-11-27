# 🚀 AI Error Analysis - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Start Services
```bash
# Terminal 1: Start StackLens API (runs on port 4000)
cd /Users/deepak/Downloads/Projects/StackLens-AI-Deploy
npm run dev:server

# Terminal 2: Start Frontend (runs on port 5173)
npm run dev:client
```

### 2. Verify API is Running
```bash
curl -s http://localhost:4000/api/analytics/health-status | jq '.data'
# Expected: { "status": "healthy", "uptime": ..., "lastUpdate": "..." }
```

### 3. Generate Test Data
```bash
bash /Users/deepak/Downloads/Projects/StackLens-AI-Deploy/verify-ai-analysis.sh
```

### 4. View Dashboard
Open browser to: `http://localhost:5173/realtime`

---

## 📱 What You'll See

When the test runs, you'll see:

### Dashboard Flow:
1. **System Status Card** - Shows "Healthy" or "Degraded"
2. **Metrics Cards** - Error Rate, Throughput, Latency, Total Errors
3. **Charts** - Real-time visualization
4. **AI Error Analysis Card** ← **NEW!** Shows:
   - 🔴 **CRITICAL** severity badge
   - Blue error category badges
   - Purple error type badges
   - Natural language error pattern
   - Root cause analysis
   - 💡 AI suggestions (3 items)
   - 🚨 Immediate actions (3 items)
   - ⚙️ Long-term fixes (3 items)

---

## 🎯 Key Features

### Automatic Triggers
- ✅ Detects errors in real-time
- ✅ Analyzes when error_rate > 5%
- ✅ Updates every 15 seconds automatically
- ✅ Shows suggestions instantly

### Smart Insights
- ✅ Severity classification (Critical/High/Medium/Low)
- ✅ Error pattern detection
- ✅ Root cause analysis
- ✅ Actionable suggestions
- ✅ Emergency action items
- ✅ Long-term improvement plans

### Robust Design
- ✅ Works without Internet (fallback mode)
- ✅ No UI blocking if AI fails
- ✅ Graceful error handling
- ✅ Responsive on mobile/tablet

---

## 🧪 Testing Commands

### Generate Errors (5 events)
```bash
for i in {1..5}; do
  curl -s -X POST http://localhost:4000/api/analytics/events \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"error\",
      \"message\": \"Test error $i\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",
      \"source\": \"test\",
      \"severity\": \"error\"
    }"
done
```

### Check Alerts
```bash
curl -s 'http://localhost:4000/api/analytics/alerts?status=active' | jq '.'
```

### Get AI Analysis
```bash
curl -s http://localhost:4000/api/analytics/ai-analysis \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": [{"rule_name":"High Error Rate","severity":"critical","metric":"error_rate","value":100,"threshold":5}],
    "metrics": {"error_rate":100,"total_requests":5,"error_count":5}
  }' | jq '.'
```

---

## 📊 Understanding the Analysis

### Severity Levels
```
🔴 CRITICAL - Immediate action required
🟠 HIGH     - Urgent attention needed
🟡 MEDIUM   - Monitor and address soon
🔵 LOW      - Monitor, non-urgent
```

### Error Categories
What type of problems: Database, Network, Timeout, Permission, etc.

### Error Types (Technical)
What metrics triggered it: error_rate, latency, throughput, etc.

### Error Pattern
How it's occurring: Recurring, Spiking, Steady, etc.

### Root Cause
Why it's happening: Database pool exhausted, Service down, etc.

### System Impact
How it affects business: Transaction failure, Data loss, etc.

### AI Suggestions
What to do: Monitor, Check status, Review logs, etc.

### Immediate Actions
What to do RIGHT NOW: Notify team, Increase monitoring, etc.

### Long-term Fixes
How to prevent: Add redundancy, Optimize, Rate limit, etc.

---

## 🔧 Configuration

### Change Refresh Interval
In `apps/web/src/pages/realtime.tsx` line 137:
```typescript
refetchInterval: isAutoRefresh ? 15000 : false  // 15000ms = 15 seconds
// Change to: 30000 for 30 seconds, 10000 for 10 seconds, etc.
```

### Change Alert Threshold
In `apps/api/src/routes/analyticsRoutes.ts` line 125:
```typescript
if (latestMetric.error_rate > 5) {  // Triggers alert when > 5%
// Change to: > 10 for 10%, > 1 for 1%, etc.
```

---

## ✅ Verification Checklist

- [ ] API running on port 4000
- [ ] Frontend running on port 5173
- [ ] GEMINI_API_KEY set in .env
- [ ] Can view realtime dashboard
- [ ] Can generate test errors
- [ ] Alerts appear after errors
- [ ] AI analysis card shows up
- [ ] Severity badge displays
- [ ] Suggestions list shows
- [ ] Immediate actions display
- [ ] Auto-refresh working (15s intervals)

---

## 🚨 Troubleshooting

### AI Analysis Card Not Showing
**Reason**: No active alerts yet
**Solution**: Generate more errors with test commands above

### Card Shows But No Suggestions
**Reason**: Gemini API key missing or invalid
**Solution**: Check `.env` file has valid `GEMINI_API_KEY`

### Card Shows Slowly
**Reason**: Gemini API call taking time
**Solution**: Normal - API calls can take 1-2 seconds. Check browser console for errors.

### Error Rate Not Increasing
**Reason**: Error threshold might be met but not displayed
**Solution**: Check `/api/analytics/metrics` endpoint directly

### Dashboard Not Updating
**Reason**: Auto-refresh paused
**Solution**: Click "Resume" button or refresh page

---

## 📚 Full Documentation

- **Technical Details**: `docs/AI_ERROR_ANALYSIS_FEATURE.md`
- **User Guide**: `docs/REALTIME_AI_ANALYSIS_GUIDE.md`
- **Implementation**: `docs/IMPLEMENTATION_SUMMARY.md`
- **Complete Status**: `AI_ANALYSIS_COMPLETE.md`

---

## 💡 Pro Tips

1. **Monitor Pattern**: Watch for recurring errors - these need structural fixes
2. **Act on Severity**: Critical = handle now, High = handle today
3. **Implement Suggestions**: AI suggestions are learned patterns
4. **Track Impact**: Note system impact before and after fixes
5. **Long-term Focus**: Use long-term fixes to prevent recurrence

---

## 🎉 You're All Set!

Your StackLens dashboard now has **AI-powered error analysis**! 

The system will:
- 🤖 Automatically detect errors
- 🧠 Analyze with AI (Gemini)
- 💡 Suggest solutions
- ⚡ Provide immediate actions
- 📈 Show patterns over time

**Start using it now**: `http://localhost:5173/realtime`

---

**Need help?** Check the troubleshooting section or review full documentation.
