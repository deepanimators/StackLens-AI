#!/bin/bash

# Simple Firebase Token Generator using jq
# Requires: curl, jq

FIREBASE_API_KEY="AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU"

echo "🔐 Firebase Token Generator (Simple)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script will create a test user and generate a Firebase token."
echo ""

# Default test credentials
DEFAULT_EMAIL="test@stacklens.app"
DEFAULT_PASSWORD="Test@12345"

read -p "Email [$DEFAULT_EMAIL]: " email
email=${email:-$DEFAULT_EMAIL}

read -sp "Password [$DEFAULT_PASSWORD]: " password
password=${password:-$DEFAULT_PASSWORD}
echo ""
echo ""

echo "⏳ Creating user and generating token..."
echo ""

# Try to sign up (create new user)
response=$(curl -s -X POST \
    "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$FIREBASE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\",\"returnSecureToken\":true}")

# Check if user already exists
if echo "$response" | jq -e '.error.message' | grep -q "EMAIL_EXISTS"; then
    echo "ℹ️  User already exists, signing in instead..."
    echo ""
    response=$(curl -s -X POST \
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"returnSecureToken\":true}")
fi

# Extract token using jq
token=$(echo "$response" | jq -r '.idToken // empty')
user_email=$(echo "$response" | jq -r '.email // empty')
user_id=$(echo "$response" | jq -r '.localId // empty')
error_msg=$(echo "$response" | jq -r '.error.message // empty')

if [ -n "$token" ]; then
    echo "✅ Success!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Firebase ID Token:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "$token"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "User: $user_email"
    echo "UID: $user_id"
    echo ""
    echo "⚠️  Token expires in 1 hour"
    echo ""
    
    # Update .env file
    if [ -f ".env" ]; then
        echo -n "Updating .env file... "
        if grep -q "^TEST_FIREBASE_TOKEN=" .env; then
            sed -i '' "s|^TEST_FIREBASE_TOKEN=.*|TEST_FIREBASE_TOKEN=$token|" .env
        else
            echo "" >> .env
            echo "TEST_FIREBASE_TOKEN=$token" >> .env
        fi
        echo "✅ Done!"
        echo ""
        echo "💡 Run 'npm run test' to see all tests pass!"
    else
        echo "⚠️  .env file not found"
        echo "Please create .env and add:"
        echo "TEST_FIREBASE_TOKEN=$token"
    fi
else
    echo "❌ Failed to generate token"
    if [ -n "$error_msg" ]; then
        echo "Error: $error_msg"
        echo ""
        case "$error_msg" in
            *"WEAK_PASSWORD"*)
                echo "💡 Password must be at least 6 characters"
                ;;
            *"INVALID_EMAIL"*)
                echo "💡 Please use a valid email format"
                ;;
            *"INVALID_PASSWORD"*)
                echo "💡 Incorrect password for existing user"
                ;;
            *"TOO_MANY_ATTEMPTS"*)
                echo "💡 Too many attempts, please wait a few minutes"
                ;;
        esac
    fi
    exit 1
fi

echo ""
