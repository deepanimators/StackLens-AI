# Credential Priority System - Implementation Complete ✅

## Summary of Changes

This document summarizes all the changes made to fix the credential loading system and implement proper suggestion flow with priority-based API selection.

## Critical Issues Fixed

### ✅ Issue #1: System using env variables instead of database credentials

**Problem**: System was loading Gemini API key from environment variables even though credentials were stored in database.

**Root Cause**: `AIService` constructor was directly checking `process.env.GOOGLE_API_KEY` and `process.env.GEMINI_API_KEY`

**Solution Implemented**:
1. Updated `AIService.ts` to use `credentialService.getHighestPriorityCredential()` instead of environment variables
2. The service now reloads credentials for each request to ensure latest priority values
3. All existing calls to `getGeminiKey()` throughout the codebase now use the database-first approach (via `get-api-credential.ts`)

**Files Changed**:
- `apps/api/src/services/ai/ai-service.ts` - Updated constructor and initialization

### ✅ Issue #2: Suggestion system bypassing trained/ML model

**Problem**: System called AI APIs directly without checking trained model first, wasting API calls

**Root Cause**: Suggestion endpoint tried `aiService.generateSuggestion()` first, then fell back to `suggestor.getSuggestion()` if AI failed

**Solution Implemented**:
1. Reordered suggestion flow in main-routes.ts `/api/errors/:id/suggestion` endpoint
2. New order:
   - FIRST: Try trained/ML model via `suggestor.getSuggestion()`
   - SECOND: Only if trained model confidence < 0.6, try AI service
   - THIRD: Return fallback suggestion if both fail
3. Added confidence threshold check to prevent using low-confidence trained model results

**Files Changed**:
- `apps/api/src/routes/main-routes.ts` - Reordered suggestion generation flow (lines 1800-1900)

### ✅ Issue #3: Missing priority-based credential selection

**Problem**: No method to intelligently select between multiple credentials by priority

**Solution Implemented**:
1. Added new method `getHighestPriorityCredential()` to credential service
2. Method takes array of providers and tries each in order
3. Returns credential with lowest priority number (lower = higher priority)
4. Supports fallback: tries primary provider, falls back to secondary, etc.

**Priority System**:
- Lower numbers = higher priority (will be tried first)
- Recommended: Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50
- Default priority: 100

**Files Changed**:
- `apps/api/src/services/credential-service.ts` - Added `getHighestPriorityCredential()` method

## Architecture Changes

### Credential Loading Flow (NEW)

```
Request to AI service
    ↓
AIService.generateSuggestion()
    ↓
credentialService.getHighestPriorityCredential(['gemini', 'google'])
    ↓
Query database: SELECT * FROM api_credentials 
    WHERE provider IN ('gemini', 'google') 
    AND is_active = 1 
    ORDER BY priority ASC LIMIT 1
    ↓
Found? YES → Decrypt and use credential from database
    ↓
NOT found? → Fallback to environment variable
    ↓
Return API key
```

### Suggestion Generation Flow (NEW)

```
POST /api/errors/:id/suggestion
    ↓
1️⃣ Check Trained/ML Model (suggestor)
    ├─ Confidence >= 0.6? → Use trained model result ✅
    └─ Confidence < 0.6? → Continue to step 2
        ↓
2️⃣ Try AI Service with Priority-Based Credentials
    ├─ Has API key? → Make AI API request ✅
    └─ No API key? → Continue to step 3
        ↓
3️⃣ Return Fallback Suggestion ✅
```

## Code Examples

### Before (Broken):
```typescript
// AIService.ts - Using env variables directly
export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
  }
}

// main-routes.ts - AI service first, trained model as fallback
const aiSuggestion = await aiService.generateSuggestion(...); // API FIRST ❌
if (!aiSuggestion) {
  suggestion = await suggestor.getSuggestion(...); // FALLBACK ❌
}
```

### After (Fixed):
```typescript
// AIService.ts - Using credential service
export class AIService {
  private geminiKey: string | null = null;

  private async initializeKey(): Promise<void> {
    const credential = await credentialService.getHighestPriorityCredential(['gemini', 'google']);
    this.geminiKey = credential?.apiKey || null;
  }
}

// main-routes.ts - Trained model first, AI service as fallback
const suggestion = await suggestor.getSuggestion(...); // ML MODEL FIRST ✅
if (!suggestion || suggestion.confidence < 0.6) {
  const aiSuggestion = await aiService.generateSuggestion(...); // FALLBACK ✅
}
```

## Testing the Changes

### Manual Test Steps:

1. **Verify Database Credentials Exist**:
   ```bash
   sqlite3 db/stacklens.db "SELECT name, provider, priority FROM api_credentials WHERE is_active = 1 ORDER BY priority ASC;"
   ```

2. **Start the API Server**:
   ```bash
   pnpm run dev:server-only
   ```

3. **Check Logs for Credential Loading**:
   - Look for: `✅ Using gemini credential from database`
   - NOT: `⚠️ Using gemini credential from environment`

4. **Test Suggestion Generation**:
   ```bash
   # Create an error
   curl -X POST http://localhost:3001/api/errors \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer test-token" \
     -d '{"message":"Test error","errorType":"TypeError","severity":"high"}'
   
   # Get suggestion for that error
   curl -X POST http://localhost:3001/api/errors/1/suggestion \
     -H "Authorization: Bearer test-token"
   ```

5. **Check Suggestion Source**:
   - Look for `source: "trained_model"` if ML model has high confidence
   - Or `source: "api_service"` if using API with priority credentials
   - Or `source: "fallback"` if both unavailable

### Automated Test Script:
```bash
./test-credential-loading.sh
```

## Database Schema Updates

The following migration adds the `priority` field to the `api_credentials` table:

**File**: `drizzle/0000_fluffy_aqueduct.sql`

This migration has been generated but not yet applied. To apply:
```bash
pnpm db:push
```

Note: User confirmation may be required during migration.

## Files Modified Summary

| File | Changes | Impact |
|------|---------|--------|
| `apps/api/src/services/ai/ai-service.ts` | Import credentialService; Update constructor to load from database | Fixes env variable issue |
| `apps/api/src/routes/main-routes.ts` | Reorder suggestion flow; Trained model first, AI fallback | Fixes API bypass issue |
| `apps/api/src/services/credential-service.ts` | Add `getHighestPriorityCredential()` method | Enables priority selection |
| `apps/api/src/utils/get-api-credential.ts` | Already correctly implemented database-first | No changes needed |

## Remaining Tasks

### ⏳ Not Yet Completed:

1. **Progress Bar Separation** (Frontend):
   - Identify error analysis component
   - Create separate progress states for analysis vs suggestions
   - Show distinct UI for each stage

2. **Jira Automation Verification**:
   - Confirm only real-time errors trigger Jira tickets
   - Verify file uploads never create automation
   - Audit all automation triggers

3. **Database Migration**:
   - Run `pnpm db:push` to apply priority field
   - Verify schema updated

4. **End-to-End Testing**:
   - Set priorities: Gemini(10), Groq(20), OpenRouter(30)
   - Test with actual credentials
   - Verify priority selection working

## How It Works Now

### Credential Selection Flow:
1. User adds 3 credentials via admin UI: Gemini(priority 10), Groq(priority 20), OpenRouter(priority 30)
2. When AI service needs a credential, it calls `getHighestPriorityCredential(['gemini', 'groq', 'openrouter'])`
3. System queries database and finds Gemini (priority 10) - lowest number wins
4. Uses Gemini API key from database
5. If Gemini fails or rate-limited, system can be enhanced to try next in priority

### Suggestion Generation Flow:
1. User requests suggestion for an error
2. System checks trained/ML model first via `suggestor.getSuggestion()`
3. If model returns high-confidence result (>= 0.6), use it immediately ✅
4. If model returns low-confidence or no result, try AI API with priority credentials
5. If API also fails, return generic fallback suggestion

## Configuration

### Priority Recommendation:
```json
{
  "credentials": [
    {"provider": "gemini", "priority": 10},
    {"provider": "groq", "priority": 20},
    {"provider": "openrouter", "priority": 30},
    {"provider": "openai", "priority": 40},
    {"provider": "anthropic", "priority": 50}
  ]
}
```

Lower number = higher priority (tried first)

## Verification Checklist

- [x] AIService uses database credentials
- [x] Suggestion flow checks trained model FIRST
- [x] Priority method added to credential service
- [x] getGeminiKey() uses database-first approach
- [ ] Frontend progress bars separated
- [ ] Jira automation scope verified
- [ ] Database migration applied
- [ ] End-to-end testing completed

## Next Steps

1. Run automated test: `./test-credential-loading.sh`
2. Verify logs show database credentials being used
3. Check suggestion responses show correct source
4. Apply database migration when ready
5. Update frontend progress bars (separate component)
6. Run full end-to-end tests with all 3 credentials
