#!/bin/bash

# Firebase Token Generator Script
# Simple bash script to generate Firebase ID token

FIREBASE_API_KEY="AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU"

echo "🔐 Firebase Token Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose an option:"
echo "  1) Sign in with existing user"
echo "  2) Create new test user"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "📧 Sign In"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -p "Email: " email
    read -sp "Password: " password
    echo ""
    echo ""
    echo "⏳ Authenticating..."
    
    response=$(curl -s -X POST \
        "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"returnSecureToken\":true}")
    
    if echo "$response" | grep -q "idToken"; then
        token=$(echo "$response" | grep -o '"idToken":"[^"]*"' | cut -d'"' -f4)
        user_email=$(echo "$response" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
        user_id=$(echo "$response" | grep -o '"localId":"[^"]*"' | cut -d'"' -f4)
        
        echo ""
        echo "✅ Authentication successful!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Firebase ID Token (copy to .env as TEST_FIREBASE_TOKEN):"
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
        
        read -p "Update .env file automatically? (y/n): " update_env
        if [ "$update_env" = "y" ] || [ "$update_env" = "Y" ]; then
            if [ -f ".env" ]; then
                # Update or add TEST_FIREBASE_TOKEN
                if grep -q "TEST_FIREBASE_TOKEN=" .env; then
                    # macOS compatible sed
                    sed -i '' "s|TEST_FIREBASE_TOKEN=.*|TEST_FIREBASE_TOKEN=$token|" .env
                else
                    echo "" >> .env
                    echo "TEST_FIREBASE_TOKEN=$token" >> .env
                fi
                echo "✅ .env file updated!"
            else
                echo "❌ .env file not found"
            fi
        fi
    else
        echo ""
        echo "❌ Authentication failed!"
        error=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "Error: $error"
        echo ""
        echo "Common errors:"
        echo "  - EMAIL_NOT_FOUND: User doesn't exist (try option 2)"
        echo "  - INVALID_PASSWORD: Wrong password"
        echo "  - INVALID_EMAIL: Check email format"
    fi

elif [ "$choice" = "2" ]; then
    echo ""
    echo "👤 Create New Test User"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    read -p "Email: " email
    read -sp "Password (min 6 chars): " password
    echo ""
    read -sp "Confirm password: " password2
    echo ""
    
    if [ "$password" != "$password2" ]; then
        echo ""
        echo "❌ Passwords don't match!"
        exit 1
    fi
    
    echo ""
    echo "⏳ Creating user..."
    
    response=$(curl -s -X POST \
        "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$FIREBASE_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\",\"returnSecureToken\":true}")
    
    if echo "$response" | grep -q "idToken"; then
        token=$(echo "$response" | grep -o '"idToken":"[^"]*"' | cut -d'"' -f4)
        user_email=$(echo "$response" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
        user_id=$(echo "$response" | grep -o '"localId":"[^"]*"' | cut -d'"' -f4)
        
        echo ""
        echo "✅ User created successfully!"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "Firebase ID Token (copy to .env as TEST_FIREBASE_TOKEN):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "$token"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "User: $user_email"
        echo "UID: $user_id"
        echo ""
        echo "📝 Save these credentials:"
        echo "   Email: $user_email"
        echo "   Password: $password"
        echo ""
        echo "⚠️  Token expires in 1 hour"
        echo ""
        
        read -p "Update .env file automatically? (y/n): " update_env
        if [ "$update_env" = "y" ] || [ "$update_env" = "Y" ]; then
            if [ -f ".env" ]; then
                # Update or add TEST_FIREBASE_TOKEN
                if grep -q "TEST_FIREBASE_TOKEN=" .env; then
                    sed -i '' "s|TEST_FIREBASE_TOKEN=.*|TEST_FIREBASE_TOKEN=$token|" .env
                else
                    echo "" >> .env
                    echo "TEST_FIREBASE_TOKEN=$token" >> .env
                fi
                echo "✅ .env file updated!"
            else
                echo "❌ .env file not found"
            fi
        fi
    else
        echo ""
        echo "❌ User creation failed!"
        error=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        echo "Error: $error"
        echo ""
        echo "Common errors:"
        echo "  - EMAIL_EXISTS: User already exists (try option 1)"
        echo "  - WEAK_PASSWORD: Use at least 6 characters"
        echo "  - INVALID_EMAIL: Check email format"
    fi
    
else
    echo ""
    echo "❌ Invalid choice!"
    exit 1
fi

echo ""
