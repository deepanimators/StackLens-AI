#!/bin/bash

# Firebase Token Generation Helper
# This script helps you generate a new Firebase ID token for testing

set -e

PROJECT_ID="error-analysis-f46c6"
TEST_EMAIL="test@stacklens.app"
TEST_PASSWORD="Test@123456"  # Change this to a secure password
API_KEY="AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU"

echo "🔑 Firebase Token Generation Helper"
echo "===================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Test Email: $TEST_EMAIL"
echo ""

# Function to get ID token using Firebase REST API
get_firebase_token() {
    echo "📝 Step 1: Creating test user..."
    
    # Sign up new user
    SIGNUP_RESPONSE=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"returnSecureToken\": true
      }")
    
    echo "$SIGNUP_RESPONSE" | jq . 2>/dev/null || echo "Response: $SIGNUP_RESPONSE"
    
    # Check for errors
    if echo "$SIGNUP_RESPONSE" | grep -q "error"; then
        echo "❌ Error creating user:"
        echo "$SIGNUP_RESPONSE" | jq '.error.message' 2>/dev/null || echo "$SIGNUP_RESPONSE"
        
        # Try to sign in existing user instead
        echo ""
        echo "📝 Attempting to sign in existing user..."
        SIGNIN_RESPONSE=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$API_KEY" \
          -H "Content-Type: application/json" \
          -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"returnSecureToken\": true
          }")
        
        echo "$SIGNIN_RESPONSE" | jq . 2>/dev/null || echo "Response: $SIGNIN_RESPONSE"
        
        if echo "$SIGNIN_RESPONSE" | grep -q "error"; then
            echo "❌ Error signing in user:"
            echo "$SIGNIN_RESPONSE" | jq '.error.message' 2>/dev/null || echo "$SIGNIN_RESPONSE"
            exit 1
        fi
        
        ID_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.idToken' 2>/dev/null)
    else
        ID_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.idToken' 2>/dev/null)
    fi
    
    if [ -z "$ID_TOKEN" ] || [ "$ID_TOKEN" = "null" ]; then
        echo "❌ Failed to extract ID token"
        exit 1
    fi
    
    echo "✅ Successfully obtained ID token"
    echo ""
    
    # Display token info
    echo "📊 Token Information:"
    echo "===================="
    
    # Decode JWT (requires jq and base64)
    IFS='.' read -r header payload signature <<< "$ID_TOKEN"
    
    # Add padding if needed
    padding=$((4 - ${#payload} % 4))
    if [ $padding -ne 4 ]; then
        payload="${payload}$(printf '%*s' $padding | tr ' ' '=')"
    fi
    
    echo ""
    echo "Decoded Payload:"
    echo "$payload" | base64 -d 2>/dev/null | jq . 2>/dev/null || echo "(Could not decode - jq may not be installed)"
    
    echo ""
    echo "🔐 Your New Token:"
    echo "=================="
    echo "$ID_TOKEN"
    echo ""
    echo "✅ Token is valid for 1 hour"
    echo ""
    
    # Ask to update .env
    read -p "Would you like to update .env with this token? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ENV_FILE=".env"
        
        if [ ! -f "$ENV_FILE" ]; then
            echo "❌ .env file not found!"
            exit 1
        fi
        
        # Backup .env
        cp "$ENV_FILE" "$ENV_FILE.backup"
        echo "✅ Backed up .env to .env.backup"
        
        # Update .env (using sed for cross-platform compatibility)
        # On macOS, need -i ''
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|TEST_FIREBASE_TOKEN=.*|TEST_FIREBASE_TOKEN=$ID_TOKEN|" "$ENV_FILE"
        else
            sed -i "s|TEST_FIREBASE_TOKEN=.*|TEST_FIREBASE_TOKEN=$ID_TOKEN|" "$ENV_FILE"
        fi
        
        echo "✅ Updated TEST_FIREBASE_TOKEN in .env"
        echo ""
        echo "You can now run tests:"
        echo "  npm run test"
    fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    echo "❌ curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found - JSON parsing will be limited"
    echo "   Install it with: brew install jq"
fi

# Run token generation
get_firebase_token
