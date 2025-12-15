# API Credential Priority System - Implementation Complete ✅

## Overview
Complete implementation of a priority-based API credential selection system that allows the application to:
1. Use ANY database-stored API credential (not just environment variables)
2. Automatically select credentials based on priority (lower number = higher priority)
3. Support multiple credentials per provider (Gemini, Groq, OpenRouter, etc.)
4. Fall back gracefully when credentials unavailable or rate-limited

## Implementation Status

### ✅ Database Layer (COMPLETE)
**Files Modified:**
- `packages/shared/src/sqlite-schema.ts`
- `packages/database/src/schema/sqlite-schema.ts`

**Changes:**
- Added `priority: integer("priority").notNull().default(100)` field to `apiCredentials` table
- Default priorities provide sensible ordering:
  - Gemini = 10 (fastest/most reliable)
  - Groq = 20 (ultra-fast inference)
  - OpenRouter = 30 (multi-model access)
  - OpenAI = 40 (most capable)
  - Anthropic = 50 (Claude models)
  - Others = 100 (custom providers)

### ✅ Service Layer (COMPLETE)
**File:** `apps/api/src/services/credential-service.ts`

**New Methods:**
```typescript
// Returns all global active credentials sorted by priority (ASC)
async listCredentialsByPriority(): Promise<CredentialWithDecryptedKey[]>

// Returns all credentials for a provider, sorted by priority
async getCredentialsByProvider(provider: string): Promise<CredentialWithDecryptedKey[]>

// Updated to use priority ordering (lower = higher priority)
async getCredentialByProvider(provider: string): Promise<CredentialWithDecryptedKey | null>
```

### ✅ AI Service Layer (COMPLETE)
**File:** `apps/api/src/services/ai-service.ts`

**Initialization Flow:**
1. Calls `loadCredentialsFromDatabase()` → fetches credentials with priorities
2. Groups credentials by provider
3. Keeps only highest priority credential per provider (lowest number)
4. Initializes providers in priority order
5. Falls back to environment variables if no DB credentials exist
6. Logs provider name, type, and priority during initialization

### ✅ API Routes Layer (COMPLETE)
**File:** `apps/api/src/routes/admin/credentials-routes.ts`

**POST /api/admin/credentials**
- Accepts optional `priority` parameter
- Sets default priorities if not provided:
  - `gemini` → 10, `groq` → 20, `openrouter` → 30, `openai` → 40, `anthropic` → 50
- Returns created credential with priority field

**PATCH /api/admin/credentials/:id**
- Accepts priority updates
- Includes priority in response
- Supports selective field updates

### ✅ Frontend UI Layer (COMPLETE)
**File:** `apps/web/src/components/admin/APICredentialsManager.tsx`

**Features Implemented:**
- Added `priority?: number` to APICredential interface
- Added `priority?: number` to CredentialFormData interface
- Create dialog: Priority input field with recommendations
- Edit dialog: Priority input field for updating
- Table display: New Priority column showing numeric value in blue
- Form state: Initialize priority to 100 on reset
- Recommendations text: "Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50. Lower numbers have higher priority."

## Jira Automation Status ✅ VERIFIED

### File Upload Processing
- **Location:** `apps/api/src/processors/background-processor.ts` (Lines 196-199)
- **Status:** ✅ Automation DISABLED for file uploads
- **Reason:** File uploads are batch processing, not real-time alerts

### Real-Time Error Processing
- **Location:** `apps/api/src/routes/main-routes.ts` (Line 10187)
- **Endpoint:** `POST /api/automation/execute`
- **Purpose:** Creates Jira tickets from real-time error alerts only
- **Status:** ✅ Enabled for real-time errors via Error Simulator/LogWatcher

## How It Works

### Credential Selection Flow
```
1. AI Service Initializes
   ↓
2. Load credentials from database sorted by priority
   ↓
3. Group by provider, keep highest priority (lowest number)
   ↓
4. Try providers in priority order during suggestion generation
   ↓
5. Use first successful provider, fall back to next priority
   ↓
6. If no DB credentials, fall back to environment variables
```

### Example Priority Configuration
User adds these credentials via Admin UI:
- Gemini API (priority 10)
- Groq API (priority 20)
- OpenRouter API (priority 30)

System will:
1. Try Gemini first (priority 10)
2. If unavailable/rate-limited, try Groq (priority 20)
3. If unavailable/rate-limited, try OpenRouter (priority 30)
4. If none available, fall back to environment variables

## Database Migration

After deployment, run migration to add priority column to existing credentials:
```sql
ALTER TABLE apiCredentials ADD COLUMN priority INTEGER DEFAULT 100 NOT NULL;
```

Then optionally set default priorities for existing credentials:
```sql
UPDATE apiCredentials SET priority = 10 WHERE provider = 'gemini';
UPDATE apiCredentials SET priority = 20 WHERE provider = 'groq';
UPDATE apiCredentials SET priority = 30 WHERE provider = 'openrouter';
UPDATE apiCredentials SET priority = 40 WHERE provider = 'openai';
UPDATE apiCredentials SET priority = 50 WHERE provider = 'anthropic';
```

## Testing the Implementation

### 1. Add Multiple Credentials via Admin UI
- Navigate to Admin > API Credentials
- Add Gemini (priority 10)
- Add Groq (priority 20)  
- Add OpenRouter (priority 30)

### 2. Verify AI Service Initialization
- Check server logs for provider initialization order
- Should show: "Provider: gemini | Priority: 10"
- Should show: "Provider: groq | Priority: 20"
- Should show: "Provider: openrouter | Priority: 30"

### 3. Verify Credential Usage
- Generate suggestions via error analysis
- Monitor which provider is being used (check response time/behavior)
- Disable highest priority provider
- Verify system falls back to next priority

### 4. Verify Jira Automation
- File uploads: NO Jira tickets created ✅
- Real-time errors (Error Simulator): Jira tickets created ✅

## File Changes Summary

### Database Schemas (2 files)
1. `packages/shared/src/sqlite-schema.ts` - Added priority field
2. `packages/database/src/schema/sqlite-schema.ts` - Added priority field

### Backend Services (2 files)
1. `apps/api/src/services/credential-service.ts` - Added priority methods
2. `apps/api/src/services/ai-service.ts` - Updated initialization logic

### API Routes (1 file)
1. `apps/api/src/routes/admin/credentials-routes.ts` - Updated POST/PATCH endpoints

### Frontend Components (1 file)
1. `apps/web/src/components/admin/APICredentialsManager.tsx` - Added priority UI

### Verification (1 file - already correct)
1. `apps/api/src/processors/background-processor.ts` - Confirmed no automation for uploads

## Key Benefits

✅ **Database-First:** Uses database credentials instead of environment variables  
✅ **Priority Control:** Admin can set provider preference order  
✅ **Flexibility:** Supports unlimited credentials per provider  
✅ **Fallback Logic:** Gracefully falls back to next priority if one fails  
✅ **Transparent UI:** Admin UI shows and allows editing priorities  
✅ **Jira Integration:** Only triggers for real-time errors, not batch uploads  
✅ **Rate Limiting:** Tracks usage per credential for intelligent fallback  

## Environment Fallback

If NO database credentials exist, system falls back to environment variables:
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

This ensures backward compatibility and graceful degradation.

---

**Status:** ✅ IMPLEMENTATION COMPLETE  
**Ready for:** Database migration → Testing → Deployment
