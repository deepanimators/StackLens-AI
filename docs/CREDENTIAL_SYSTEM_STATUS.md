# Credential Management System - Current Status

## ✅ Implementation Complete

All components for the database-backed credential management system have been successfully implemented:

### Backend Components

1. **Auth Middleware** - `apps/api/src/middleware/auth.ts` ✅
   - `verifyToken()` - JWT validation and user lookup
   - `requireAdmin()` - Admin role enforcement
   - Fetches user from database after token validation
   - Proper TypeScript types with Express augmentation

2. **Database Schema** - `packages/shared/src/sqlite-schema.ts` ✅
   - `apiCredentials` table with all required fields
   - Type exports (`ApiCredential`, `InsertApiCredential`)
   - Zod validation schema

3. **Credential Service** - `apps/api/src/services/credential-service.ts` ✅
   - Full CRUD operations
   - Automatic encryption/decryption
   - Usage tracking
   - Rate limit checking

4. **Helper Functions** - `apps/api/src/utils/get-api-credential.ts` ✅
   - Provider-specific credential fetching
   - Database-first with environment fallback
   - `getGeminiKey()`, `getOpenAIKey()`, etc.

5. **Admin API Routes** - `apps/api/src/routes/admin/credentials-routes.ts` ✅
   - Registered at `/api/admin/credentials`
   - All endpoints protected with `verifyToken` + `requireAdmin`

### Frontend Components

1. **Credential Manager UI** - `apps/web/src/components/admin/APICredentialsManager.tsx` ✅
   - Full CRUD interface
   - Integrated into Admin Panel

## ⚠️ Current Issue: 401 Unauthorized

### Problem
When accessing `/api/admin/credentials`, the API returns 401 Unauthorized even though:
- Frontend logs show: "🔐 User is authenticated, proceeding with request"
- Token is being sent in Authorization header
- Request reaches the backend

### Possible Causes

1. **Token Format Mismatch**
   - Frontend may be sending a Firebase token
   - Backend expects a JWT token with `userId` field
   - The `verifyToken` middleware expects: `{ userId: number }`

2. **User Not in Database**
   - Token validates but user lookup fails
   - The user ID in the token doesn't exist in the `users` table

3. **Token Secret Mismatch**
   - JWT_SECRET environment variable mismatch
   - Token signed with different secret than validation secret

### Debugging Steps

#### Step 1: Check Current User in Browser Console

Open browser console (F12) and run:

```javascript
// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Current user:', user);

// Check token
const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
console.log('Token:', token ? token.substring(0, 50) + '...' : 'No token found');

// Decode token (without verification)
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('Token payload:', payload);
  } catch (e) {
    console.error('Failed to decode token:', e);
  }
}
```

#### Step 2: Check Backend Logs

When you click "Add Credential" or try to load credentials, check the server logs for:

```bash
tail -f /Users/deepak/Downloads/Projects/StackLens-AI-Deploy/server.log | grep -E "Token|auth|401|credentials"
```

Look for:
- "Token verification error"
- "User not found"
- "Invalid or expired token"

#### Step 3: Test Auth Flow

Test authentication manually:

```bash
# Login to get a token
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}' \
  | jq '.'

# Use the token to test credentials endpoint
TOKEN="<token-from-login>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/admin/credentials \
  | jq '.'
```

#### Step 4: Check User Database

Verify the logged-in user exists:

```bash
sqlite3 ./db/stacklens.db "SELECT id, username, email, role FROM users WHERE role='admin';"
```

### Potential Fixes

#### Fix 1: If Using Firebase Authentication

The frontend might be sending Firebase ID tokens instead of custom JWT tokens. Update the auth middleware to handle Firebase tokens:

```typescript
// In verifyToken middleware
import { getAuth } from 'firebase-admin/auth';

// Check if it's a Firebase token
try {
  const decodedToken = await getAuth().verifyIdToken(token);
  // Use decodedToken.uid to find user
} catch (firebaseError) {
  // Fall back to JWT verification
}
```

#### Fix 2: Token Format Issue

Ensure the login endpoint generates tokens with correct structure:

```typescript
// Token should contain userId
const token = jwt.sign(
  { userId: user.id },  // ← Must be 'userId' not 'id'
  JWT_SECRET,
  { expiresIn: '24h' }
);
```

#### Fix 3: Use Existing Auth Pattern

Copy the auth pattern from `main-routes.ts` which works:

```typescript
// This pattern works in main-routes.ts
const authService = new AuthService();
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await authService.getUserById(decoded.userId);
  req.user = user;
  next();
};
```

## 🧪 Testing Guide

Once authentication is fixed:

### 1. Access Admin Panel
```
http://localhost:5173/admin
```

### 2. Navigate to API & Integration Settings Tab

### 3. Test CRUD Operations

#### Add Credential
1. Click "Add Credential"
2. Fill in:
   - Name: `gemini-primary`
   - Provider: `gemini`
   - API Key: `<your-key>`
   - Rate Limit: `10000`
3. Click "Create Credential"
4. Should see success toast

#### List Credentials
- Table should populate with credentials
- Shows provider, status, usage

#### Edit Credential
1. Click edit icon
2. Modify rate limit
3. Click "Update Credential"

#### Delete Credential
1. Click trash icon
2. Confirm deletion

### 4. Test AI Service Integration

1. Upload a log file
2. Request error analysis
3. Check server logs for:
   ```
   ✅ Using gemini credential from database
   ```

### 5. Test Fallback to Environment

1. Delete all credentials
2. Ensure `GEMINI_API_KEY` in `.env`
3. Upload and analyze
4. Should see:
   ```
   ⚠️ Using gemini credential from environment (GEMINI_API_KEY)
   ```

## 📁 File Locations

```
apps/
  api/
    src/
      middleware/
        auth.ts                      ← Auth middleware
      routes/
        admin/
          credentials-routes.ts      ← API endpoints
      services/
        credential-service.ts        ← Business logic
      utils/
        encryption.ts                ← Encryption helpers
        get-api-credential.ts        ← Credential fetching
  web/
    src/
      components/
        admin/
          APICredentialsManager.tsx  ← UI component
      pages/
        admin.tsx                    ← Admin panel

packages/
  shared/
    src/
      sqlite-schema.ts               ← Database schema

docs/
  TESTING_CREDENTIAL_SYSTEM.md       ← Full testing guide
  CREDENTIAL_MANAGEMENT.md           ← Implementation details
```

## 🔧 Environment Variables

Required in `.env`:

```bash
# Encryption key for credentials (32 bytes hex)
ENCRYPTION_KEY=your_32_byte_hex_encryption_key_here

# JWT secret for authentication
JWT_SECRET=your-secret-key-change-in-production

# Optional: Fallback API keys
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
```

Generate encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 Next Steps

1. **Debug Authentication Issue**
   - Run debugging steps above
   - Check token format
   - Verify user exists in database

2. **Test Complete Flow**
   - Add credentials via UI
   - Verify encryption in database
   - Test AI service integration

3. **Run Migration (Optional)**
   ```bash
   pnpm run migrate:credentials
   ```
   Migrates existing environment variables to database

## ✅ Success Criteria

- [ ] Can access `/api/admin/credentials` without 401 error
- [ ] Can create new credentials via UI
- [ ] Can edit existing credentials
- [ ] Can delete credentials
- [ ] Can view usage statistics
- [ ] AI service uses database credentials
- [ ] Fallback to environment variables works
- [ ] Credentials are encrypted in database

## 📞 Support

If issues persist:
1. Check `server.log` for detailed errors
2. Verify all environment variables are set
3. Ensure database tables exist
4. Check user has admin role in database
