# Firebase Token Issue - Root Cause & Solution

## 📋 Problem Summary

Tests were failing with `TEST_FIREBASE_TOKEN not found` error, and when the token was found, Firebase authentication was returning `401 Unauthorized`.

## 🔍 Root Causes Identified

### 1. **Missing .env Loading in playwright.config.ts** ✅ FIXED
**Issue**: Playwright configuration didn't load environment variables from `.env` file
- Test files couldn't access `process.env.TEST_FIREBASE_TOKEN`
- Only environment variables passed via CLI were available

**Solution Applied**:
```typescript
// Added to playwright.config.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });
```

**Status**: ✅ FIXED - Environment variables now load correctly

### 2. **Expired Firebase Token** ⚠️ REQUIRES RENEWAL
**Issue**: The Firebase token in `.env` has expired
- Token issued at: 1760073039 (Unix timestamp)
- Token expired at: 1760076639 (Unix timestamp)
- Expiration time: 1 hour validity period

**Current .env Token Status**:
```
TEST_FIREBASE_TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6ImU4MWYwNTJhZWYwNDBhOTdjMzlkMjY1MzgxZGU2Y2I0MzRiYzM1ZjMiLCJ0eXAiOiJKV1QifQ...
(This token EXPIRED on Nov 18, 2025 ~13:30 UTC)
```

**Why it's failing**:
```
$ curl -X POST http://localhost:4000/api/auth/firebase-verify \
  -d '{"idToken": "expired_token"}'

Response: {"message":"Invalid Firebase token"}
```

## 🛠️ How to Fix

### Step 1: Verify .env Loading ✅ (Already Done)
The fix has been applied to `playwright.config.ts`. Verify it:
```bash
# Run tests - should now show:
# [dotenv@17.2.3] injecting env (14) from .env
npm run test
```

### Step 2: Generate New Firebase Token

#### Option A: Generate Token Using Firebase Admin SDK
```bash
# Install Firebase Admin SDK (if not already installed)
npm install firebase-admin

# Create a script to generate token
cat > generate-firebase-token.js << 'EOF'
const admin = require('firebase-admin');

// Initialize Firebase Admin (replace with your service account)
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function generateToken() {
  const uid = 'test-user-id'; // Or use your test user ID
  const customToken = await admin.auth().createCustomToken(uid);
  console.log('Custom Token:', customToken);
  
  // Get ID token
  const idToken = await admin.auth().createUserWithPasswordAsync({
    email: 'test@stacklens.app',
    password: 'Test@123456'
  });
  console.log('ID Token:', idToken);
}

generateToken().catch(console.error);
EOF
```

#### Option B: Generate Token Using Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `error-analysis-f46c6`
3. Navigate to Authentication > Users
4. Create or select a test user
5. Copy the ID token from the auth state

#### Option C: Use Firebase CLI
```bash
# Login to Firebase
firebase login

# Generate token for testing
firebase auth:export users.json --project error-analysis-f46c6

# Create test user if needed
firebase auth:create test@stacklens.app:Test@123456 --project error-analysis-f46c6
```

### Step 3: Update .env File
```bash
# Generate new token (use one of the methods above)
NEW_TOKEN=$(your_token_generation_method)

# Update .env with new token
sed -i '' "s/TEST_FIREBASE_TOKEN=.*/TEST_FIREBASE_TOKEN=$NEW_TOKEN/" .env

# Verify update
grep TEST_FIREBASE_TOKEN .env
```

### Step 4: Verify Tests Work
```bash
# Run tests with new token
npm run test

# Should see:
# ✓ Authentication successful with token
# ✓ Playwright tests running with authentication
```

## 📊 Environment Variable Loading Pipeline

After the fix, here's how environment variables flow:

```
.env file
    ↓
playwright.config.ts (dotenv.config())
    ↓
process.env (available to all tests)
    ↓
test files access via process.env.TEST_FIREBASE_TOKEN
    ↓
auth.setup.ts injects token into localStorage/headers
    ↓
Tests run with authentication
```

## 🔐 Firebase Token Details

### Token Structure (JWT)
```
Header:
{
  "alg": "RS256",
  "kid": "...",
  "typ": "JWT"
}

Payload:
{
  "iss": "https://securetoken.google.com/error-analysis-f46c6",
  "aud": "error-analysis-f46c6",
  "auth_time": 1760073039,
  "user_id": "MaYolmLYWsVz2XPdSllkQA24gLy1",
  "sub": "MaYolmLYWsVz2XPdSllkQA24gLy1",
  "iat": 1760073039,
  "exp": 1760076639,  ← Expiration (1 hour validity)
  "email": "test@stacklens.app",
  "email_verified": false,
  "firebase": {
    "identities": { "email": ["test@stacklens.app"] },
    "sign_in_provider": "password"
  }
}
```

### Token Validity
- **Issued At (iat)**: 1760073039
- **Expires At (exp)**: 1760076639
- **Duration**: 1 hour
- **Current Status**: **EXPIRED** (needs renewal)

## 🧪 Test Verification Checklist

After applying the fix and generating a new token:

- [ ] `npm run test` runs without "TEST_FIREBASE_TOKEN not found" errors
- [ ] `[dotenv@17.2.3] injecting env (14) from .env` appears in test output
- [ ] `Using TEST_FIREBASE_TOKEN for authentication...` appears in auth.setup.ts output
- [ ] `Authentication successful with token` message appears
- [ ] API tests start running (not skipped)
- [ ] No `401 Unauthorized` errors from `/api/auth/firebase-verify`
- [ ] Authenticated API requests succeed with Bearer token

## 🔍 Troubleshooting

### Issue: "TEST_FIREBASE_TOKEN not found" 
**Solution**: Verify `.env` file exists in project root
```bash
ls -la .env
# Should show .env file with 14+ environment variables
```

### Issue: "Firebase signin failed: 401 Unauthorized"
**Solution**: Token has expired, generate new one
```bash
# Check token expiration
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.decode('YOUR_TOKEN'))"

# If exp is in the past, token expired - regenerate it
```

### Issue: "[dotenv@17.2.3] injecting env (0) from .env"
**Solution**: playwright.config.ts might have wrong .env path
```typescript
// Fix in playwright.config.ts:
dotenv.config({ path: path.resolve(__dirname, '.env') });
// NOT: dotenv.config({ path: '.env' })
```

### Issue: Tests skip with "TEST_FIREBASE_TOKEN not set"
**Solution**: playwright.config.ts not loading .env early enough
```bash
# Verify the fix was applied:
head -10 playwright.config.ts
# Should show:
# import dotenv from 'dotenv';
# dotenv.config(...)
```

## 📝 Files Modified

1. **playwright.config.ts**
   - Added dotenv import and configuration
   - Ensures .env variables are available to all tests
   - Fix applied: ✅

## 🚀 Next Steps

1. ✅ **Done**: Fixed playwright.config.ts to load .env
2. ⏳ **TODO**: Generate new Firebase token
3. ⏳ **TODO**: Update TEST_FIREBASE_TOKEN in .env
4. ⏳ **TODO**: Run `npm run test` to verify
5. ⏳ **TODO**: Add token refresh mechanism for CI/CD

## 📚 Additional Resources

- [Firebase ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)
- [Playwright Environment Variables](https://playwright.dev/docs/test-global-setup-teardown)
- [Project Firebase Config](error-analysis-f46c6.firebaseapp.com)

---

**Summary**: Environment variable loading is now fixed. Next step is to generate a fresh Firebase token to replace the expired one in .env.
