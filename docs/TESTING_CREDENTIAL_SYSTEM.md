# Testing the Credential Management System

## ✅ Implementation Summary

The database credential management system has been fully implemented with the following components:

### Backend Components ✅
1. **Database Schema** - `packages/shared/src/sqlite-schema.ts`
   - ✅ Added `apiCredentials` table with encrypted storage
   - ✅ Usage tracking (total usage, monthly usage)
   - ✅ Rate limiting support
   - ✅ Provider-based organization
   - ✅ Global and user-specific credentials

2. **Credential Service** - `apps/api/src/services/credential-service.ts`
   - ✅ CRUD operations (create, read, update, delete)
   - ✅ Automatic encryption/decryption
   - ✅ Usage tracking with SQL increments
   - ✅ Rate limit checking
   - ✅ Provider-based lookups

3. **Encryption Utilities** - `apps/api/src/utils/encryption.ts`
   - ✅ AES-256-GCM encryption
   - ✅ Secure key generation
   - ✅ Authentication tag support

4. **Helper Functions** - `apps/api/src/utils/get-api-credential.ts`
   - ✅ `getGeminiKey()` - Database-first, env fallback
   - ✅ `getOpenAIKey()` - Database-first, env fallback
   - ✅ `getAnthropicKey()` - Database-first, env fallback
   - ✅ Generic `getAPICredential()` function

5. **Admin API Routes** - `apps/api/src/routes/admin/credentials-routes.ts`
   - ✅ GET `/api/admin/credentials` - List all
   - ✅ POST `/api/admin/credentials` - Create new
   - ✅ PATCH `/api/admin/credentials/:id` - Update
   - ✅ DELETE `/api/admin/credentials/:id` - Delete
   - ✅ POST `/api/admin/credentials/:id/test` - Test credential
   - ✅ Admin authentication required

6. **Updated Services to Use DB Credentials**
   - ✅ `apps/api/src/services/ai-service.ts` - Async initialization from DB
   - ✅ `apps/api/src/routes/main-routes.ts` - API settings, error suggestions
   - ✅ `apps/api/src/routes/analyticsRoutes.ts` - AI analysis

### Frontend Components ✅
1. **Credential Manager UI** - `apps/web/src/components/admin/APICredentialsManager.tsx`
   - ✅ Full CRUD interface
   - ✅ Provider selection dropdown
   - ✅ Encrypted API key input with show/hide
   - ✅ Rate limit configuration
   - ✅ Usage statistics display
   - ✅ Active/inactive toggle
   - ✅ Global/user-specific support

2. **Admin Panel Integration** - `apps/web/src/pages/admin.tsx`
   - ✅ Imported and integrated in "API & Integration Settings" tab
   - ✅ Positioned above existing API configuration

### Migration Tools ✅
1. **Migration Script** - `apps/api/scripts/migrate-credentials.ts`
   - ✅ Interactive migration from .env to database
   - ✅ Encryption key generation
   - ✅ Idempotent (safe to run multiple times)

2. **npm Script** - `package.json`
   - ✅ Added `migrate:credentials` command

## 🧪 Testing Guide

### 1. Prerequisites

```bash
# Ensure you have the latest code
git pull

# Install dependencies
pnpm install

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...

# Add to .env file
echo "ENCRYPTION_KEY=<your_generated_key>" >> .env
```

### 2. Start the Application

```bash
# Terminal 1: Start the server
pnpm run dev

# The server should start on http://localhost:4000
# The frontend should start on http://localhost:5173
```

### 3. Test Admin Panel UI

#### Access the Credential Manager

1. **Navigate to Admin Panel**
   ```
   http://localhost:5173/admin
   ```

2. **Login** (if not already logged in)
   - Use your admin credentials

3. **Go to API & Integration Settings Tab**
   - Click on the "API & Integration Settings" tab
   - You should see "API Credentials Management" card at the top

#### Add a New Credential

1. **Click "Add Credential"** button
2. **Fill in the form:**
   - Name: `gemini-primary`
   - Provider: Select "Google Gemini"
   - API Key: `<your_actual_gemini_api_key>` (or test key)
   - Endpoint: (leave blank for default)
   - Monthly Rate Limit: `10000`
   - Global: Toggle ON (enabled)

3. **Click "Create Credential"**
4. **Verify:**
   - ✅ Success toast appears
   - ✅ New row appears in the credentials table
   - ✅ Status shows "Active"
   - ✅ Monthly Usage shows "0 / 10000 (0.0%)"

#### Edit a Credential

1. **Click the Edit icon** (pencil) on any credential row
2. **Modify settings:**
   - Change Rate Limit to `15000`
   - Leave API Key blank (keeps existing)
3. **Click "Update Credential"**
4. **Verify:**
   - ✅ Success toast appears
   - ✅ Rate limit updates in the table

#### Toggle Active/Inactive

1. **Click the Activity icon** on any credential
2. **Verify:**
   - ✅ Status badge changes to "Inactive"
   - ✅ Click again to reactivate

#### Delete a Credential

1. **Click the Trash icon** on any credential
2. **Confirm deletion** in the dialog
3. **Verify:**
   - ✅ Success toast appears
   - ✅ Row disappears from table

### 4. Test API Endpoints

#### List Credentials

```bash
# Get auth token first (replace with your credentials)
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.token')

# List all credentials
curl http://localhost:4000/api/admin/credentials \
  -H "Authorization: Bearer $TOKEN" \
  | jq
```

**Expected Response:**
```json
[
  {
    "id": 1,
    "name": "gemini-primary",
    "provider": "gemini",
    "endpoint": null,
    "isActive": true,
    "isGlobal": true,
    "userId": null,
    "rateLimit": 10000,
    "usageCount": 0,
    "currentMonthUsage": 0,
    "lastUsed": null,
    "createdAt": "2025-12-01T10:00:00.000Z",
    "updatedAt": "2025-12-01T10:00:00.000Z"
  }
]
```

#### Create Credential

```bash
curl -X POST http://localhost:4000/api/admin/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai-test",
    "provider": "openai",
    "apiKey": "sk-test-123456",
    "isGlobal": true,
    "rateLimit": 5000
  }' | jq
```

#### Update Credential

```bash
curl -X PATCH http://localhost:4000/api/admin/credentials/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rateLimit": 15000
  }' | jq
```

#### Delete Credential

```bash
curl -X DELETE http://localhost:4000/api/admin/credentials/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 5. Test AI Service Integration

#### Verify Database Credential Loading

1. **Add a Gemini credential via UI** (as shown above)

2. **Check server console logs** when the application starts:
   ```
   🔐 Loading AI credentials from database...
   ✅ Using gemini credential from database
   🤖 AI Service initialized with 1 providers: Gemini
   ```

3. **Upload a log file** and request error analysis

4. **Check console logs** for credential usage:
   ```
   ✅ Using gemini credential from database
   🤖 Attempting generation with Gemini...
   ✅ Gemini generated suggestion successfully
   ```

#### Test Fallback to Environment Variables

1. **Delete all credentials from UI**

2. **Ensure .env has GEMINI_API_KEY**

3. **Restart the application**

4. **Check console logs:**
   ```
   ⚠️  No database credentials found, falling back to environment variables...
   ⚠️  Using gemini credential from environment (GEMINI_API_KEY)
   🤖 AI Service initialized with 1 providers: Gemini
   ```

### 6. Test Usage Tracking

1. **Add a credential with rate limit:**
   - Name: `test-tracking`
   - Provider: `gemini`
   - API Key: `<valid_key>`
   - Rate Limit: `100`

2. **Upload and analyze multiple log files** (5-10 times)

3. **Check the credentials table:**
   - ✅ Usage Count increases
   - ✅ Current Month Usage increases
   - ✅ Last Used timestamp updates

4. **Verify in database:**
   ```bash
   sqlite3 ./db/stacklens.db "SELECT name, usage_count, current_month_usage, last_used FROM api_credentials;"
   ```

### 7. Test Rate Limiting

1. **Set a low rate limit:**
   - Edit credential
   - Set Monthly Rate Limit: `2`

2. **Make 3 API calls** (upload/analyze 3 log files)

3. **On the 3rd call, should see rate limit warning:**
   ```
   ⚠️  Rate limit approaching/exceeded for credential
   ```

### 8. Test Migration Script

```bash
# Add test API keys to .env
echo "GEMINI_API_KEY=test_gemini_key_123" >> .env
echo "OPENAI_API_KEY=test_openai_key_456" >> .env

# Run migration
pnpm run migrate:credentials

# Follow the prompts:
# - Confirm encryption key is set
# - Review detected credentials
# - Confirm migration

# Verify in database
sqlite3 ./db/stacklens.db "SELECT id, name, provider, is_active FROM api_credentials;"
```

## 🔍 Troubleshooting

### Issue: TypeScript Errors

**Symptom:** Import errors for `apiCredentials`, `ApiCredential`, etc.

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
pnpm run check
```

### Issue: "Module not found" Errors

**Symptom:** Cannot find `@shared/sqlite-schema`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Issue: Credentials Not Loading from Database

**Symptom:** AI service uses environment variables even with DB credentials

**Solution:**
1. Check database has credentials:
   ```bash
   sqlite3 ./db/stacklens.db "SELECT * FROM api_credentials;"
   ```

2. Check encryption key is set:
   ```bash
   echo $ENCRYPTION_KEY
   ```

3. Check server logs for errors

### Issue: "Cannot decrypt" Errors

**Symptom:** Decryption fails when fetching credentials

**Solution:**
1. Verify `ENCRYPTION_KEY` in .env matches the key used to encrypt
2. Regenerate encryption key and re-migrate credentials
3. Check database data integrity

## ✨ Expected Behavior

### ✅ When Everything Works Correctly

1. **Admin UI:**
   - Can add/edit/delete credentials smoothly
   - Table updates instantly
   - Toast notifications show success/error states
   - Usage statistics display accurately

2. **API Service:**
   - Loads credentials from database on startup
   - Falls back to environment if no DB credentials
   - Logs clear messages about credential source
   - AI analysis works with DB credentials

3. **Security:**
   - API keys are never displayed in full (show/hide toggle)
   - Keys are encrypted in database
   - Admin authentication required for all operations

4. **Performance:**
   - Credential fetching is fast (<100ms)
   - Usage tracking updates without lag
   - Rate limiting enforced correctly

## 📊 Success Metrics

- ✅ Can create 5+ different provider credentials
- ✅ Can edit credentials without errors
- ✅ Can toggle active/inactive status
- ✅ Usage tracking increments correctly
- ✅ AI service uses DB credentials
- ✅ Fallback to environment works
- ✅ Migration script runs successfully
- ✅ No TypeScript compilation errors
- ✅ No runtime errors in console

## 🎯 Next Steps After Testing

1. **Production Deployment:**
   - Generate secure encryption key
   - Add to environment variables
   - Run migration in production
   - Verify all services use DB credentials

2. **Monitoring:**
   - Set up alerts for rate limit thresholds
   - Monitor credential usage patterns
   - Track credential access audit logs

3. **Documentation:**
   - Update user documentation
   - Create video tutorial for admin users
   - Document credential rotation process

4. **Security Hardening:**
   - Implement credential rotation schedule
   - Add audit logging for all operations
   - Set up backup/restore procedures for encryption keys

---

**Status:** ✅ **READY FOR TESTING**

All components have been implemented and are ready for comprehensive testing.
