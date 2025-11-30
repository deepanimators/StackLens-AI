# Firebase Token Generation Guide

This guide shows you **3 different methods** to generate a Firebase ID token for testing.

## Quick Start (Recommended)

### Method 1: Using Python Script (Easiest)

1. **Install requests library** (if not installed):
   ```bash
   pip install requests
   ```

2. **Run the script**:
   ```bash
   python scripts/generate_firebase_token.py
   ```

3. **Choose option**:
   - **Option 1**: Sign in with existing email/password
   - **Option 2**: Create a new test user
   - **Option 3**: Get manual instructions

4. **Copy the token** to your `.env` file:
   ```properties
   TEST_FIREBASE_TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
   ```

---

### Method 2: Using curl (No Dependencies)

#### Option A: Sign in with existing user

```bash
curl -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "YOUR_EMAIL@example.com",
    "password": "YOUR_PASSWORD",
    "returnSecureToken": true
  }'
```

**Response**: Look for `"idToken"` in the JSON response and copy it.

#### Option B: Create a new test user

```bash
curl -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@stacklens.app",
    "password": "Test@12345",
    "returnSecureToken": true
  }'
```

**Extract token using jq**:
```bash
curl -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stacklens.app","password":"Test@12345","returnSecureToken":true}' \
  | jq -r '.idToken'
```

---

### Method 3: Using Browser Console

1. **Start your application**:
   ```bash
   npm run dev
   ```

2. **Open in browser**: http://localhost:4000

3. **Sign in** with Google or Email

4. **Open DevTools** (F12 or Cmd+Option+I on Mac)

5. **Go to Console tab**

6. **Run this command**:
   ```javascript
   firebase.auth().currentUser.getIdToken().then(token => {
     console.log('Token:', token);
     console.log('\nCopy this to .env as TEST_FIREBASE_TOKEN');
   });
   ```

7. **Copy the token** from the console

---

## Step-by-Step: Create Test User and Get Token

### Using the Python Script:

```bash
# 1. Install dependencies
pip install requests

# 2. Run the script
python scripts/generate_firebase_token.py

# 3. Choose option 2 (Create new test user)
# Enter: test@stacklens.app
# Password: Test@12345

# 4. Script will show the token and offer to update .env automatically
# Choose 'y' to update .env automatically
```

### Using curl (one-liner):

```bash
# Create user and extract token
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stacklens.app","password":"Test@12345","returnSecureToken":true}' \
  | jq -r '.idToken')

echo "TEST_FIREBASE_TOKEN=$TOKEN"

# Copy the output and add to .env file
```

---

## Updating .env File

Once you have the token, update your `.env` file:

```bash
# Open .env file
nano .env

# Or use sed to update automatically
sed -i '' 's/TEST_FIREBASE_TOKEN=.*/TEST_FIREBASE_TOKEN=YOUR_TOKEN_HERE/' .env
```

**Example .env entry**:
```properties
TEST_FIREBASE_TOKEN=eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4ODJhMTgxZmVkMzlkODZkOGMxOTczOWY0ZDQxZmFkZDljMGU3NjUiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZXJyb3ItYW5hbHlzaXMtZjQ2YzYiLCJhdWQiOiJlcnJvci1hbmFseXNpcy1mNDZjNiIsImF1dGhfdGltZSI6MTcyODU0MzYwMCwidXNlcl9pZCI6IlRFU1RfVVNFUl9JRCIsInN1YiI6IlRFU1RfVVNFUl9JRCIsImlhdCI6MTcyODU0MzYwMCwiZXhwIjoxNzI4NTQ3MjAwLCJlbWFpbCI6InRlc3RAc3RhY2tsZW5zLmFpIiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7ImVtYWlsIjpbInRlc3RAc3RhY2tsZW5zLmFpIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.example_signature
```

---

## Troubleshooting

### Error: "EMAIL_EXISTS"
- User already exists
- Use Method 2 Option A (signIn) instead of Option B (signUp)
- Or use a different email address

### Error: "WEAK_PASSWORD"
- Password must be at least 6 characters
- Use: `Test@12345` or longer

### Error: "INVALID_EMAIL"
- Check email format
- Must be valid email: `user@domain.com`

### Error: "TOO_MANY_ATTEMPTS_TRY_LATER"
- Firebase rate limiting
- Wait 5-10 minutes and try again

### Token Expires
- Firebase ID tokens expire after **1 hour**
- Re-run the script to generate a new token
- Or use refresh token for long-term testing

---

## Testing the Token

After adding the token to `.env`:

```bash
# 1. Verify token is set
cat .env | grep TEST_FIREBASE_TOKEN

# 2. Run tests
npm run test

# 3. You should see:
# ✓ 10 Firebase tests PASS (instead of skip)
```

---

## Quick Commands

```bash
# Generate token (Python)
python scripts/generate_firebase_token.py

# Generate token (curl + jq)
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stacklens.app","password":"Test@12345","returnSecureToken":true}' \
  | jq -r '.idToken'

# Run tests with token
npm run test

# Run only authenticated tests
npm run test tests/api/auth-upload.test.ts
```

---

## Need Help?

1. **Check Firebase Console**: https://console.firebase.google.com/project/error-analysis-f46c6
2. **View Users**: Authentication > Users tab
3. **Create user manually** in Firebase Console if needed
4. **Check logs** in the script output for detailed errors
