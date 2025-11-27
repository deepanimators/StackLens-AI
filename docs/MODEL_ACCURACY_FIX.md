# Model Accuracy Fix - Dashboard Statistics

## Issue
Dashboard showed **Model Accuracy: 52%** which seemed incorrect.

## Root Cause Analysis

### Problem 1: Wrong Data Source
The dashboard was calculating ML accuracy from `error_logs.ml_confidence` instead of `analysis_history.model_accuracy`.

```typescript
// OLD (INCORRECT) - Line 3782
const errorsWithConfidence = allErrors.filter(
  (error) => (error as any).mlConfidence && (error as any).mlConfidence > 0
);
const avgConfidence = errorsWithConfidence.reduce(...) / errorsWithConfidence.length;
const mlAccuracy = Math.round(avgConfidence * 100); // = 52%
```

**Issues:**
- Only 1,402 out of 152,719 errors had ML confidence values
- Average confidence was 0.516 (51.6%) → rounded to 52%
- This represents **prediction confidence**, not **model accuracy**

### Problem 2: Mixed Data Formats
The `analysis_history.model_accuracy` field had mixed formats:
- Some values as decimals: `0.921` (92.1%)
- Some values as percentages: `92.3`

This caused incorrect averaging:
```sql
-- Before normalization
AVG(model_accuracy) = 2.86  (WRONG!)

-- After normalization
AVG(model_accuracy) = 93.25 (CORRECT!)
```

## Solution Implemented

### 1. Fixed Data Source (apps/api/src/routes/main-routes.ts)
Changed to use `analysis_history.model_accuracy`:

```typescript
// NEW (CORRECT) - Line 3782
const allAnalysisHistory = await storage.getAllAnalysisHistory();
const completedAnalyses = allAnalysisHistory.filter(
  (analysis: any) => analysis.status === "completed" && analysis.modelAccuracy
);

let mlAccuracy = 0;
if (completedAnalyses.length > 0) {
  // Normalize model accuracy values
  const normalizedAccuracies = completedAnalyses.map((analysis: any) => {
    const accuracy = analysis.modelAccuracy;
    // If < 1, it's decimal (multiply by 100)
    // If > 1, it's already percentage
    return accuracy < 1 ? accuracy * 100 : accuracy;
  });
  
  const avgAccuracy = normalizedAccuracies.reduce(...) / normalizedAccuracies.length;
  mlAccuracy = Math.round(avgAccuracy * 10) / 10; // = 93.3%
}
```

### 2. Added Missing Method (apps/api/src/database/database-storage.ts)
Added `getAllAnalysisHistory()` method to retrieve all analysis records:

```typescript
async getAllAnalysisHistory(): Promise<AnalysisHistory[]> {
  const result = await db
    .select()
    .from(analysisHistory)
    .orderBy(desc(analysisHistory.analysisTimestamp));
  return result;
}
```

### 3. Normalized Database Values
Created and ran normalization script:
```bash
./scripts/normalize-model-accuracy.sh
```

**Results:**
- Updated all decimal values (< 1) to percentages (* 100)
- Before: AVG = 2.86, MIN = 0.0, MAX = 92.3
- After: AVG = 93.25, MIN = 0.0, MAX = 96.94

## Verification

### Database Statistics
```sql
SELECT 
  COUNT(*) as total_analyses,
  COUNT(CASE WHEN model_accuracy > 0 THEN 1 END) as with_accuracy,
  ROUND(AVG(CASE WHEN model_accuracy > 0 THEN model_accuracy END), 1) as avg_accuracy
FROM analysis_history 
WHERE status = 'completed';
```

**Results:**
- Total Analyses: 94
- With Accuracy: 93
- Average Accuracy: **93.3%** ✅

### Dashboard Display
After server restart, dashboard should show:
```
Model Accuracy: 93.3%  (was: 52%)
```

## Files Modified

| File | Changes |
|------|---------|
| `apps/api/src/routes/main-routes.ts` | Fixed ML accuracy calculation source |
| `apps/api/src/database/database-storage.ts` | Added `getAllAnalysisHistory()` method |
| `scripts/normalize-model-accuracy.sh` | Created normalization script |

## What Each Metric Means

### Model Accuracy (Dashboard)
- **Source**: `analysis_history.model_accuracy`
- **Represents**: Average accuracy of ML model across all completed analyses
- **Current Value**: **93.3%** ✅
- **Calculation**: Average of normalized model accuracy from all completed analyses

### ML Confidence (Error Logs)
- **Source**: `error_logs.ml_confidence`
- **Represents**: Prediction confidence for individual error classifications
- **Current Value**: 51.6% (1,402 errors with confidence)
- **Note**: This is different from model accuracy!

## Key Differences

| Metric | Model Accuracy | ML Confidence |
|--------|---------------|---------------|
| **Source Table** | `analysis_history` | `error_logs` |
| **Represents** | Overall model performance | Individual prediction confidence |
| **Records** | 93 analyses | 1,402 errors |
| **Value** | 93.3% | 51.6% |
| **Shown In** | Dashboard | Error details |

## Testing

### Before Restart
```bash
# Check current server logs
tail -f apps/api/logs/server.log | grep "Model Accuracy"
```

### After Restart
1. **Restart Backend Server**
   ```bash
   pkill -f "apps/api/src/index.ts"
   pnpm run dev:server
   ```

2. **Test Dashboard API**
   ```bash
   curl http://localhost:4000/api/dashboard/stats \
     -H "Authorization: Bearer <token>" | jq '.mlAccuracy'
   # Should return: 93.3
   ```

3. **Verify in UI**
   - Open Dashboard
   - Check "Model Accuracy" in AI status bar
   - Should show: **93.3%** (not 52%)

## Summary

| Item | Before | After |
|------|--------|-------|
| **Dashboard ML Accuracy** | 52% ❌ | 93.3% ✅ |
| **Data Source** | error_logs.ml_confidence | analysis_history.model_accuracy |
| **Data Format** | Mixed (decimal/percentage) | Normalized (percentage) |
| **Calculation** | Incorrect source | Correct source + normalization |

## Action Required

**Restart the backend server** to apply the code changes:

```bash
# Stop server
pkill -f "apps/api/src/index.ts"

# Start server
pnpm run dev:server
```

After restart, dashboard will show **Model Accuracy: 93.3%**
