# Quick Start: Credential Migration

This guide will help you migrate your API keys from `.env` files to secure database storage.

## Prerequisites

✅ Node.js 18+ installed  
✅ Database set up (SQLite/PostgreSQL)  
✅ Existing `.env` file with API keys

## Step-by-Step Migration

### 1. Generate Encryption Key

```bash
# Generate a secure 256-bit encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. Update .env File

Add the encryption key to your `.env` file:

```env
# Add this line (replace with your generated key)
ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Keep your existing API keys for now
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run Migration

```bash
# From project root
pnpm run migrate:credentials
```

**What you'll see:**

```
🔐 Credential Migration Script
================================

📋 Detected credentials in environment:

  1. GEMINI: AIzaSy...8XYZ
  2. OPENAI: sk-proj-...abcd
  3. ANTHROPIC: sk-ant-...1234

Migrate these credentials to database? (yes/no): yes

🚀 Starting migration...

✅ GEMINI: Migrated successfully
✅ OPENAI: Migrated successfully
✅ ANTHROPIC: Migrated successfully

📊 Migration Summary:
  ✅ Migrated: 3
  ⏭️  Skipped: 0
  ❌ Failed: 0

🎉 Migration completed successfully!

📝 Next steps:
  1. The credentials are now stored encrypted in the database
  2. You can optionally remove the API keys from .env file
  3. Keep ENCRYPTION_KEY in .env (required to decrypt credentials)
  4. Restart your application to use database credentials

⚠️  IMPORTANT: Backup your ENCRYPTION_KEY securely!
   If lost, you won't be able to decrypt stored credentials.
```

### 4. Clean Up (Optional)

After successful migration, you can remove API keys from `.env`:

**Before:**
```env
ENCRYPTION_KEY=a1b2c3d4...
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

**After:**
```env
ENCRYPTION_KEY=a1b2c3d4...
# API keys removed - now in database
```

### 5. Restart Application

```bash
pnpm run dev
```

**Check logs for:**
```
🔐 Loading AI credentials from database...
🤖 AI Service initialized with 3 providers: Gemini, OpenAI, Anthropic
```

## Verify Migration

### Using Admin API

```bash
# Login to get auth token (replace with your credentials)
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  | jq -r '.token')

# List credentials
curl http://localhost:4000/api/admin/credentials \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected response:**
```json
[
  {
    "id": 1,
    "name": "gemini-primary",
    "provider": "gemini",
    "isActive": true,
    "isGlobal": true,
    "usageCount": 0,
    "currentMonthUsage": 0,
    "rateLimit": null,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

## Troubleshooting

### "No credentials found in environment variables"

**Cause:** `.env` file doesn't have API keys  
**Fix:** Add at least one API key:
```env
GEMINI_API_KEY=your_api_key_here
```

### "ENCRYPTION_KEY not found in environment"

**Cause:** Missing encryption key in `.env`  
**Fix:** Run step 1 to generate key and add to `.env`

### "Credential already exists, skipping"

**Cause:** Credential already migrated  
**Fix:** This is normal - migration is idempotent

### Migration runs but app still uses .env

**Cause:** Application not restarted  
**Fix:** 
```bash
# Stop the app (Ctrl+C)
# Start again
pnpm run dev
```

## Backup Encryption Key

⚠️ **CRITICAL**: Store your `ENCRYPTION_KEY` in multiple secure locations:

1. **Password Manager** (1Password, LastPass, Bitwarden)
   ```
   Entry: StackLens Encryption Key
   Value: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
   ```

2. **Encrypted Backup File**
   ```bash
   # Create encrypted backup
   echo "ENCRYPTION_KEY=a1b2c3d4..." | gpg -c > encryption-key.gpg
   
   # Store in secure location (not in git!)
   ```

3. **Cloud Secret Manager** (Production)
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager

## Managing Credentials via API

### Add New Credential

```bash
curl -X POST http://localhost:4000/api/admin/credentials \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "openai-secondary",
    "provider": "openai",
    "apiKey": "sk-proj-...",
    "isGlobal": true,
    "rateLimit": 10000
  }'
```

### Update Credential

```bash
curl -X PATCH http://localhost:4000/api/admin/credentials/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rateLimit": 15000
  }'
```

### Disable Credential

```bash
curl -X PATCH http://localhost:4000/api/admin/credentials/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### Delete Credential

```bash
curl -X DELETE http://localhost:4000/api/admin/credentials/1 \
  -H "Authorization: Bearer $TOKEN"
```

## What's Next?

- ✅ Credentials securely stored in database
- ✅ API keys encrypted with AES-256-GCM
- ✅ Usage tracking enabled
- 🔄 Set up rate limits for credentials
- 🔄 Configure monthly usage alerts
- 🔄 Create backup encryption key rotation schedule

---

**Need help?** See [CREDENTIAL_MANAGEMENT.md](./CREDENTIAL_MANAGEMENT.md) for full documentation.
