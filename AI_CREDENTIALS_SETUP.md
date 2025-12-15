# AI Credentials Setup Guide

## Summary

**Good news:** The Gemini/Google AI credentials system is **already correctly implemented**! The code just needs credentials to be configured.

The "No gemini credential found" warning you saw is **expected** - it means the system is working correctly and checking for credentials in the right places.

---

## How It Works (Architecture)

The credential system has a **3-tier fallback mechanism**:

```
1. Database Credentials (stored encrypted)
   ↓ (if not found)
2. Environment Variables (.env file)
   ↓ (if not found)
3. Log warning: "No gemini credential found"
```

### File Structure

```
apps/api/src/
├── utils/get-api-credential.ts       ← Main credential retrieval logic
├── services/credential-service.ts    ← Database credential storage/retrieval
└── routes/main-routes.ts             ← Uses getGeminiKey() throughout
```

---

## Setup Instructions

### Option 1: Environment Variable (Easiest)

1. Get your Gemini API Key:
   - Go to: https://makersuite.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key

2. Add to `.env` file:
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```

3. Restart the server:
   ```bash
   pkill -f "pnpm run dev"
   pnpm run dev
   ```

### Option 2: Database Credentials (More Secure)

Use the admin panel to add credentials:

1. Go to: `http://localhost:5173/admin/credentials`
2. Click "Add Credential"
3. Select Provider: `Gemini` or `Google`
4. Paste your API Key
5. Click "Save"
6. Set as "Active" and "Global"

The system will automatically encrypt and use it.

---

## Where Credentials Are Used

### 1. **Error Suggestion Generation**
- File: `apps/api/src/processors/background-processor.ts`
- Used when analyzing uploaded log files
- Disabled gracefully if no key available

### 2. **Dashboard API Settings**
- File: `apps/api/src/routes/main-routes.ts` (line ~760)
- Endpoint: `GET /api/admin/api-settings`
- Returns current Gemini API key status

### 3. **AI Analysis Routes**
- File: `apps/api/src/routes/main-routes.ts` (line ~3204)
- Endpoint: `POST /api/analysis/generate-error-suggestion`
- Requires Gemini key or returns error

### 4. **AI Service Provider**
- File: `apps/api/src/services/ai-service.ts`
- Initializes AI providers based on available credentials
- Automatically selects best provider (Gemini, OpenAI, Anthropic, etc.)

---

## Implemented Methods

The system has **all methods already implemented**:

### ✅ AIService Methods
```typescript
class AIService {
  async generateSuggestion(errorText, errorType, severity): AISuggestion
  async analyzeLogBatch(errors): any
  async generateAnalyticsInsight(prompt): any
}
```

### ✅ Credential Service Methods
```typescript
class CredentialService {
  async getCredentialByProvider(provider): Credential | null
  async addCredential(data): Credential
  async updateCredential(id, data): Credential
  async listCredentials(): Credential[]
}
```

### ✅ API Endpoints
```
GET /api/admin/api-settings              → Get current credential status
POST /api/admin/api-settings             → Save new credentials
GET /api/admin/credentials               → List all credentials
POST /api/admin/credentials              → Add new credential
PUT /api/admin/credentials/:id           → Update credential
DELETE /api/admin/credentials/:id        → Delete credential
```

---

## What Happens When Credentials Are Added

1. **Automatic Detection**
   ```
   ✅ Using gemini credential from environment (GEMINI_API_KEY)
   OR
   ✅ Using gemini credential from database
   ```

2. **Error Suggestion Generation Enabled**
   - Background processor will call AI to generate suggestions
   - API endpoints will provide AI-powered analysis
   - Dashboard will show Gemini API key is configured

3. **Fallback Behavior**
   - If API call fails, system continues without suggestions
   - Errors still analyzed by ML model locally
   - User gets analysis with or without AI suggestions

---

## Testing Credentials

### 1. Check Current Status
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/admin/api-settings
```

Should return:
```json
{
  "geminiApiKey": "...",
  "webhookUrl": "",
  "maxFileSize": "10"
}
```

### 2. Test AI Analysis Endpoint
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "errorType": "NullPointerException",
    "errorMessage": "Cannot access property of null",
    "stackTrace": "at line 42 in file.js"
  }' \
  http://localhost:4000/api/analysis/generate-error-suggestion
```

---

## Credential Priority

When multiple credentials exist:

1. **User-Specific Credential** (logged in user's private credential)
2. **Global Credential** (available to all users)
3. **Environment Variable** (fallback, used by all if set)
4. **None** (gracefully skip AI features)

---

## Troubleshooting

### "No gemini credential found" in logs
✅ **This is expected** - means no credential is configured yet
- Add `GEMINI_API_KEY` to `.env`
- Or add credential via admin panel

### "AI service not configured" error
- Check `.env` for `GEMINI_API_KEY`
- Verify the API key is valid
- Restart server after changing `.env`

### Suggestion generation still not working
- Check server logs for "Using gemini credential from..."
- Verify credential is marked as "Active" in database
- Test API key directly: `curl https://generativelanguage.googleapis.com/...`

---

## Environment Variables Reference

```env
# Gemini/Google AI (for suggestions and analysis)
GEMINI_API_KEY=sk-...

# Alternative provider (if Gemini fails)
GOOGLE_API_KEY=AIzaSy...

# Other supported providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

---

## Next Steps

1. **Add GEMINI_API_KEY to .env** ← You need to do this
2. Restart the server
3. Check logs for "✅ Using gemini credential from environment"
4. Test by uploading a file and checking error analysis

---

## Summary

✅ **System Status**: Fully implemented and working correctly
🔴 **Missing**: API credentials need to be added
⚡ **Action Required**: Set `GEMINI_API_KEY` in `.env` file

Once credentials are added, all AI features will activate automatically!
