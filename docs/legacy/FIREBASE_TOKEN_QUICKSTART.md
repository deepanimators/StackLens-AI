# Quick Start: Generate Firebase Token

## Easiest Method (Recommended)

Run the bash script:

```bash
./scripts/generate-token.sh
```

**Choose Option 2** to create a new test user:
- Email: `test@stacklens.app`
- Password: `Test@12345`

The script will:
1. Create the user in Firebase
2. Generate an ID token
3. Offer to update your `.env` file automatically

## One-Line Command (If you prefer curl)

```bash
# Create user and get token
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stacklens.app","password":"Test@12345","returnSecureToken":true}' \
  | grep -o '"idToken":"[^"]*"' | cut -d'"' -f4
```

Copy the output and add to `.env`:
```
TEST_FIREBASE_TOKEN=<paste_token_here>
```

## Verify It Works

```bash
# Check .env has token
grep TEST_FIREBASE_TOKEN .env

# Run tests
npm run test

# You should now see:
# ✓ All Firebase tests PASS (instead of skip)
```

## Token Expires?

Firebase tokens expire after 1 hour. Just run the script again:

```bash
# Sign in with existing user
./scripts/generate-token.sh
# Choose option 1
# Email: test@stacklens.app
# Password: Test@12345
```

## Full Documentation

See `docs/FIREBASE_TOKEN_GUIDE.md` for:
- Python script method
- Browser console method
- Troubleshooting guide
- All available options
