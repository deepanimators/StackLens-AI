# TEST_FIREBASE_TOKEN Issue - Complete Analysis & Solutions

## 🎯 Executive Summary

**Primary Issue**: `TEST_FIREBASE_TOKEN not found` errors in Playwright tests  
**Root Cause 1** (FIXED ✅): Environment variables not loaded from `.env` file  
**Root Cause 2** (IDENTIFIED ⚠️): Firebase token in `.env` has expired  

**Status**: 
- ✅ Environment loading fixed
- ⚠️ Token needs renewal before tests can authenticate

---

## 📊 Part 1: Environment Variable Loading - FIXED ✅

### Problem
Playwright tests couldn't access `TEST_FIREBASE_TOKEN` because:
- `playwright.config.ts` didn't load `.env` file
- Only shell environment variables were available
- Result: `process.env.TEST_FIREBASE_TOKEN === undefined`

### Solution Applied
Modified `playwright.config.ts` to load `.env` automatically:

```typescript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env before any tests run
dotenv.config({ path: path.resolve(__dirname, '.env') });
```

### Verification
```bash
npm run test
# Should show: [dotenv@17.2.3] injecting env (14) from .env
```

**Status**: ✅ COMPLETE

---

## 📊 Part 2: Firebase Token Expiration - IDENTIFIED ⚠️

### Problem
After fixing environment loading, tests fail with:
```
Error: Firebase signin failed: 401 Unauthorized
```

Or:
```
{"message":"Invalid Firebase token"}
```

### Root Cause
The Firebase token in `.env` has **EXPIRED**:

```json
{
  "iat": 1760073039,      // Issued Nov 18, 2025 ~12:30 UTC
  "exp": 1760076639,      // Expired Nov 18, 2025 ~13:30 UTC
  "email": "test@stacklens.ai"
}
```

Firebase ID tokens are valid for **1 hour only**. The token in `.env` was issued on Nov 18 and has since expired.

### How to Verify Token Status
```bash
# Decode the token to see expiration
cat > decode-token.js << 'EOF'
const jwt = require('jsonwebtoken');
const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImU4MWYwNTJhZWYwNDBhOTdjMzlkMjY1MzgxZGU2Y2I0MzRiYzM1ZjMiLCJ0eXAiOiJKV1QifQ...'; // YOUR TOKEN
const decoded = jwt.decode(token);
console.log('Token expires at:', new Date(decoded.exp * 1000));
console.log('Is expired:', new Date() > new Date(decoded.exp * 1000));
EOF
node decode-token.js
```

---

## 🔧 Solution: Generate New Firebase Token

### Option 1: Using Firebase Console (Easiest) ✨

1. **Go to Firebase Console**
   - URL: https://console.firebase.google.com/
   - Project: `error-analysis-f46c6`

2. **Create Test User**
   - Click "Authentication" in left menu
   - Click "Users" tab
   - Click "Create user" button
   - Email: `test@stacklens.ai`
   - Password: Use a secure password (e.g., `Test@Secure123!`)

3. **Get ID Token**
   - After user is created, click on the user
   - In top-right, click "Show ID token"
   - Copy the token (it's valid for 1 hour)

4. **Update .env**
   ```bash
   # Copy the token and update .env
   sed -i '' 's/TEST_FIREBASE_TOKEN=.*/TEST_FIREBASE_TOKEN=<new_token>/' .env
   ```

### Option 2: Using Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Get ID token for test user
firebase auth:get-user test@stacklens.ai --project error-analysis-f46c6

# Create test user if doesn't exist
firebase auth:create test@stacklens.ai:TestPassword123 --project error-analysis-f46c6
```

### Option 3: Using REST API Script

```bash
# Download and run provided script
chmod +x generate-firebase-token.sh
./generate-firebase-token.sh

# Script will:
# 1. Try to sign in to Firebase
# 2. Get ID token
# 3. Automatically update .env
```

**Note**: The provided script may need credentials. If it fails, use Option 1 (Firebase Console).

### Option 4: Programmatic Generation (Node.js)

```bash
# Create token generation script
cat > get-firebase-token.mjs << 'EOF'
import axios from 'axios';

const API_KEY = 'AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU';
const EMAIL = 'test@stacklens.ai';
const PASSWORD = 'your-password-here'; // Use correct password

async function getToken() {
  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      {
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true
      }
    );
    
    console.log('✅ New ID Token:');
    console.log(response.data.idToken);
    
    return response.data.idToken;
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.error?.message);
  }
}

getToken();
EOF

node get-firebase-token.mjs
```

---

## 🔄 Workflow After Token Renewal

### Step 1: Generate New Token
- Use one of the options above
- Token will be valid for 1 hour

### Step 2: Update .env File
```bash
# Replace old token with new one
TEST_FIREBASE_TOKEN=<new_token_here>
```

### Step 3: Run Tests
```bash
npm run test
```

### Expected Output
```
✓ Authentication successful with token
✓ Auth state file verified
✓ Using TEST_FIREBASE_TOKEN for authentication...
```

### Step 4: Monitor Token Expiration
- Token expires after 1 hour
- If tests fail with 401, generate new token
- For CI/CD, need to automate token generation

---

## 💡 Best Practices Going Forward

### 1. Automated Token Refresh
Create a test helper to refresh token before each session:

```typescript
// tests/auth-helpers.ts
export async function ensureFreshToken(): Promise<string> {
  const currentToken = process.env.TEST_FIREBASE_TOKEN;
  const decoded = jwt.decode(currentToken);
  
  // If expires within 5 minutes, refresh
  if (decoded.exp * 1000 - Date.now() < 5 * 60 * 1000) {
    const newToken = await generateNewToken();
    process.env.TEST_FIREBASE_TOKEN = newToken;
    return newToken;
  }
  
  return currentToken;
}
```

### 2. Use Firebase Custom Tokens
Instead of ID tokens (1 hour expiration), use custom tokens:

```typescript
import admin from 'firebase-admin';

const customToken = await admin.auth().createCustomToken(uid);
// Custom tokens valid for unlimited time
```

### 3. Environment-Specific Approach
```bash
# .env.test (for local testing)
TEST_FIREBASE_TOKEN=<fresh_token>

# .env.ci (for CI/CD - auto-generated)
# Token auto-generated on each CI run
```

### 4. GitHub Secrets for CI/CD
```yaml
# .github/workflows/test.yml
- name: Generate Firebase Token
  run: |
    TOKEN=$(node scripts/generate-token.js)
    echo "TEST_FIREBASE_TOKEN=$TOKEN" >> $GITHUB_ENV
  env:
    FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
```

---

## 🧪 Verification Checklist

After getting new token:

- [ ] Copy new token from Firebase Console
- [ ] Update TEST_FIREBASE_TOKEN in .env
- [ ] Run `npm run test`
- [ ] See "Using TEST_FIREBASE_TOKEN for authentication..."
- [ ] See "Authentication successful with token"
- [ ] API tests start running (not skipped)
- [ ] No 401 errors
- [ ] At least 1 test passes

```bash
# Quick verification
npm run test 2>&1 | grep -E "Using TEST_FIREBASE_TOKEN|Authentication successful|✓.*test"
```

---

## 🔍 Troubleshooting

### "TEST_FIREBASE_TOKEN not set"
**Fix**: 
```bash
# Verify .env exists
ls -la .env

# Verify variable is there
grep TEST_FIREBASE_TOKEN .env

# Verify playwright.config.ts loads it
head -10 playwright.config.ts | grep dotenv
```

### "Invalid Firebase token"
**Fix**: Token has expired
```bash
# Generate new token (see Section above)
# Update .env with new token
# Run tests immediately (within 1 hour)
```

### "401 Unauthorized"
**Fix**: Same as above - token expired or invalid
```bash
# Check token expiration
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.decode('TOKEN_HERE'))"
```

### Tests skip with "TEST_FIREBASE_TOKEN not set"
**Fix**: dotenv not loading before tests
```bash
# Verify fix in playwright.config.ts
grep -A2 "dotenv.config" playwright.config.ts

# Should show:
# dotenv.config({ path: path.resolve(__dirname, '.env') })
```

---

## 📁 Files Involved

| File | Status | Notes |
|------|--------|-------|
| `playwright.config.ts` | ✅ FIXED | Now loads .env automatically |
| `.env` | ⚠️ NEEDS UPDATE | Token expired, needs renewal |
| `tests/auth.setup.ts` | ✅ OK | Uses token from process.env |
| `tests/fixtures.ts` | ✅ OK | Uses token from process.env |
| `generate-firebase-token.sh` | ℹ️ HELPER | Script to auto-generate token |

---

## 🚀 Next Actions

### Immediate (Required)
1. [ ] Generate new Firebase token using Firebase Console
2. [ ] Update TEST_FIREBASE_TOKEN in .env
3. [ ] Run `npm run test` to verify

### Short Term (Recommended)
1. [ ] Add token validation to auth helpers
2. [ ] Create automated token refresh mechanism
3. [ ] Document in README.md

### Long Term (Optional)
1. [ ] Use Firebase Custom Tokens instead of ID tokens
2. [ ] Set up CI/CD automated token generation
3. [ ] Add token rotation scripts

---

## 📚 Reference URLs

- **Firebase Console**: https://console.firebase.google.com/project/error-analysis-f46c6
- **Firebase ID Tokens**: https://firebase.google.com/docs/auth/admin/verify-id-tokens
- **Firebase Custom Tokens**: https://firebase.google.com/docs/auth/admin/create-custom-tokens
- **Playwright Config**: https://playwright.dev/docs/test-configuration

---

## Summary

| Issue | Status | Solution |
|-------|--------|----------|
| Environment vars not loaded | ✅ FIXED | Added dotenv to playwright.config.ts |
| Token not found | ✅ FIXED | .env loads automatically now |
| 401 Unauthorized errors | ⚠️ ACTION NEEDED | Generate new token via Firebase Console |

**Next Step**: Generate new Firebase token and update .env, then run tests.
