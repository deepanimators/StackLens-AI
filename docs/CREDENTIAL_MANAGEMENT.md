# Credential Management System

## Overview

This system provides secure, database-backed storage for API credentials (Gemini, OpenAI, Anthropic, etc.) with encryption, usage tracking, and rate limiting.

## Features

- ✅ **Encrypted Storage**: AES-256-GCM encryption for API keys
- ✅ **Usage Tracking**: Monitor credential usage and API calls
- ✅ **Rate Limiting**: Set monthly usage limits per credential
- ✅ **Multi-Provider Support**: Gemini, OpenAI, Anthropic, OpenRouter, Groq
- ✅ **Admin API**: Full CRUD operations for credentials
- ✅ **Fallback Support**: Falls back to environment variables if no database credentials

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Service                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  1. Check database for credentials                   │   │
│  │  2. Fall back to environment variables if not found  │   │
│  │  3. Initialize AI providers (Gemini, OpenAI, etc.)   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Credential Service                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Fetch credentials (with decryption)               │   │
│  │  - Record usage statistics                           │   │
│  │  - Check rate limits                                 │   │
│  │  - CRUD operations                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Encryption Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  encrypt(plaintext) → iv:authTag:ciphertext          │   │
│  │  decrypt(ciphertext) → plaintext                     │   │
│  │  Uses AES-256-GCM with random IV                     │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (SQLite/PostgreSQL)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  api_credentials table                               │   │
│  │  - Encrypted API keys                                │   │
│  │  - Usage tracking (count, monthly)                   │   │
│  │  - Rate limits                                       │   │
│  │  - Provider metadata                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Generate Encryption Key

```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to Environment

Add to your `.env` file:

```env
ENCRYPTION_KEY=your_generated_key_here
```

**⚠️ IMPORTANT**: 
- Store this key securely (password manager, secrets vault)
- Never commit it to version control
- If lost, encrypted credentials cannot be recovered

### 3. Run Database Migration

```bash
# From apps/api directory
cd apps/api

# Run migration script
npm run migrate:credentials
# or
tsx scripts/migrate-credentials.ts
```

This will:
1. Check for existing credentials in environment variables
2. Encrypt and store them in the database
3. Provide instructions for cleanup

### 4. Update package.json

Add migration script to `apps/api/package.json`:

```json
{
  "scripts": {
    "migrate:credentials": "tsx scripts/migrate-credentials.ts"
  }
}
```

## API Routes

All routes require admin authentication (`verifyToken` + admin role).

### List Credentials

```http
GET /api/admin/credentials
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "gemini-primary",
    "provider": "gemini",
    "endpoint": null,
    "isActive": true,
    "isGlobal": true,
    "usageCount": 1250,
    "currentMonthUsage": 45,
    "rateLimit": 10000,
    "lastUsed": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

### Create Credential

```http
POST /api/admin/credentials
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "openai-secondary",
  "provider": "openai",
  "apiKey": "sk-...",
  "isGlobal": true,
  "rateLimit": 5000
}
```

### Update Credential

```http
PATCH /api/admin/credentials/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false,
  "rateLimit": 15000
}
```

### Delete Credential

```http
DELETE /api/admin/credentials/:id
Authorization: Bearer <token>
```

### Test Credential

```http
POST /api/admin/credentials/:id/test
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Credential is valid and within rate limits",
  "provider": "gemini",
  "usageCount": 1250,
  "currentMonthUsage": 45,
  "rateLimit": 10000
}
```

### Reset Monthly Usage

```http
POST /api/admin/credentials/reset-monthly-usage
Authorization: Bearer <token>
```

Should be automated via cron job (run on 1st of each month).

### Generate Encryption Key

```http
POST /api/admin/credentials/generate-key
Authorization: Bearer <token>
```

**Response:**
```json
{
  "key": "a1b2c3d4...",
  "message": "Add this key to your .env file as ENCRYPTION_KEY=<key>",
  "warning": "Store this key securely. If lost, encrypted credentials cannot be recovered."
}
```

## Usage in Code

### AI Service (Automatic)

The AI service automatically loads credentials from the database on first use:

```typescript
import { aiService } from "./services/ai-service";

// Credentials are loaded automatically from database
const suggestion = await aiService.generateSuggestion(
  errorText,
  errorType,
  severity
);
```

### Manual Credential Access

```typescript
import { credentialService } from "./services/credential-service";

// Get credential by provider
const geminiCred = await credentialService.getCredentialByProvider("gemini");

if (geminiCred) {
  console.log(geminiCred.apiKey); // Decrypted API key
  console.log(geminiCred.usageCount); // Usage statistics
}

// Get credential by name
const cred = await credentialService.getCredential("gemini-primary");

// Check rate limit before use
const canUse = await credentialService.checkRateLimit(cred.id);
if (!canUse) {
  throw new Error("Rate limit exceeded");
}
```

## Security Best Practices

### 1. Encryption Key Management

- **Store in**: Environment variables, AWS Secrets Manager, Azure Key Vault, HashiCorp Vault
- **Never**: Commit to git, share in plain text, store in database
- **Backup**: Multiple secure locations (encrypted backup, password manager)

### 2. Database Permissions

```sql
-- PostgreSQL: Restrict access to api_credentials table
GRANT SELECT, INSERT, UPDATE, DELETE ON api_credentials TO app_user;
REVOKE ALL ON api_credentials FROM public;
```

### 3. Audit Logging

All credential operations are logged in `audit_logs` table (TODO: implement).

### 4. Key Rotation

To rotate encryption key:

```bash
# 1. Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Re-encrypt all credentials (manual script needed)
# 3. Update ENCRYPTION_KEY in environment
# 4. Restart application
```

## Monitoring

### Usage Tracking

```typescript
// Get usage statistics
const credentials = await credentialService.listCredentials();

credentials.forEach(cred => {
  console.log(`${cred.name}:`);
  console.log(`  Total usage: ${cred.usageCount}`);
  console.log(`  This month: ${cred.currentMonthUsage}/${cred.rateLimit}`);
  console.log(`  Last used: ${cred.lastUsed}`);
});
```

### Rate Limit Alerts

Set up monitoring to alert when credentials approach rate limits:

```typescript
const threshold = 0.8; // 80% of limit

credentials.forEach(cred => {
  if (cred.rateLimit && cred.currentMonthUsage) {
    const usage = cred.currentMonthUsage / cred.rateLimit;
    if (usage > threshold) {
      console.warn(`⚠️ ${cred.name} at ${Math.round(usage * 100)}% of rate limit`);
      // Send alert email/notification
    }
  }
});
```

## Migration from Environment Variables

### Before (Environment-based)

```env
# .env
GEMINI_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
// ai-service.ts
if (process.env.GEMINI_API_KEY) {
  this.providers.push(new GeminiProvider(process.env.GEMINI_API_KEY));
}
```

### After (Database-backed)

```env
# .env
ENCRYPTION_KEY=a1b2c3d4... # Only this is needed
```

```typescript
// ai-service.ts
const cred = await credentialService.getCredentialByProvider("gemini");
if (cred?.apiKey) {
  this.providers.push(new GeminiProvider(cred.apiKey));
}
```

**Benefits:**
- ✅ Centralized credential management
- ✅ No credentials in environment files
- ✅ Usage tracking and analytics
- ✅ Rate limiting per credential
- ✅ Easy rotation and updates
- ✅ Audit trail (with audit log implementation)

## Troubleshooting

### "Cannot decrypt empty text"

**Cause**: Credential has no API key stored  
**Fix**: Update credential with valid API key via admin API

### "Invalid encrypted text format"

**Cause**: Wrong encryption key or corrupted data  
**Fix**: Ensure ENCRYPTION_KEY matches the one used to encrypt data

### "Rate limit exceeded"

**Cause**: Monthly usage exceeded configured limit  
**Fix**: 
1. Increase rate limit via admin API
2. Wait for monthly reset
3. Use alternative credential

### "No AI providers configured"

**Cause**: No credentials in database or environment  
**Fix**: Run migration script or add credentials via admin API

## Future Enhancements

- [ ] Audit logging for all credential operations
- [ ] Automatic key rotation support
- [ ] Multi-region credential sync
- [ ] Credential usage analytics dashboard
- [ ] Alert system for rate limit thresholds
- [ ] Support for OAuth2 credentials
- [ ] Credential sharing between users
- [ ] Credential versioning and rollback
- [ ] Integration with external secret managers (AWS, Azure, GCP)

## Related Files

- **Schema**: `packages/database/src/schema/schema.ts`
- **Service**: `apps/api/src/services/credential-service.ts`
- **Encryption**: `apps/api/src/utils/encryption.ts`
- **AI Service**: `apps/api/src/services/ai-service.ts`
- **Admin Routes**: `apps/api/src/routes/admin/credentials-routes.ts`
- **Migration**: `apps/api/scripts/migrate-credentials.ts`
