#!/usr/bin/env python3
"""
Firebase Token Generator for Testing

This script generates a Firebase ID token using Firebase REST API.
No additional dependencies required beyond standard library and requests.

Usage:
    python scripts/generate_firebase_token.py
"""

import requests
import json
import os
from getpass import getpass

# Firebase configuration
FIREBASE_API_KEY = "AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU"
FIREBASE_PROJECT_ID = "error-analysis-f46c6"

def sign_in_with_email_password(email, password):
    """Sign in with email and password using Firebase REST API"""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"
    
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        return data['idToken'], data['email'], data['localId']
    else:
        error_data = response.json()
        raise Exception(f"Authentication failed: {error_data.get('error', {}).get('message', 'Unknown error')}")

def create_user_with_email_password(email, password):
    """Create a new user with email and password"""
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={FIREBASE_API_KEY}"
    
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        return data['idToken'], data['email'], data['localId']
    else:
        error_data = response.json()
        raise Exception(f"User creation failed: {error_data.get('error', {}).get('message', 'Unknown error')}")

def main():
    print("🔐 Firebase Token Generator for Testing\n")
    print("═" * 60)
    print("Choose an option:")
    print("1. Sign in with existing email/password")
    print("2. Create new test user")
    print("3. Get instructions for manual token retrieval")
    print("═" * 60)
    
    choice = input("\nEnter your choice (1-3): ").strip()
    
    try:
        if choice == "1":
            print("\n📧 Sign In with Email/Password\n")
            email = input("Email: ").strip()
            password = getpass("Password: ")
            
            print("\n⏳ Authenticating...")
            token, user_email, uid = sign_in_with_email_password(email, password)
            
            print("\n✅ Authentication successful!\n")
            print("═" * 60)
            print("Firebase ID Token (copy to .env as TEST_FIREBASE_TOKEN):")
            print("═" * 60)
            print(f"\n{token}\n")
            print("═" * 60)
            print(f"\nUser Email: {user_email}")
            print(f"User ID: {uid}")
            print("\n⚠️  Note: This token expires in 1 hour")
            print("💡 Tip: You can regenerate it anytime by running this script again\n")
            
            # Optionally write to .env file
            update_env = input("Update .env file automatically? (y/n): ").strip().lower()
            if update_env == 'y':
                update_env_file(token)
                
        elif choice == "2":
            print("\n👤 Create New Test User\n")
            email = input("Email for test user: ").strip()
            password = getpass("Password (min 6 chars): ")
            confirm_password = getpass("Confirm password: ")
            
            if password != confirm_password:
                print("\n❌ Passwords don't match!")
                return
            
            if len(password) < 6:
                print("\n❌ Password must be at least 6 characters!")
                return
            
            print("\n⏳ Creating user...")
            token, user_email, uid = create_user_with_email_password(email, password)
            
            print("\n✅ User created successfully!\n")
            print("═" * 60)
            print("Firebase ID Token (copy to .env as TEST_FIREBASE_TOKEN):")
            print("═" * 60)
            print(f"\n{token}\n")
            print("═" * 60)
            print(f"\nUser Email: {user_email}")
            print(f"User ID: {uid}")
            print(f"\n📝 Save these credentials:")
            print(f"   Email: {user_email}")
            print(f"   Password: {password}")
            print("\n⚠️  Note: This token expires in 1 hour")
            print("💡 Tip: You can sign in again with option 1 to get a new token\n")
            
            # Optionally write to .env file
            update_env = input("Update .env file automatically? (y/n): ").strip().lower()
            if update_env == 'y':
                update_env_file(token)
                
        elif choice == "3":
            print("\n📋 Manual Token Retrieval Methods\n")
            print("═" * 60)
            print("\nMethod 1: Using Browser Console")
            print("-" * 60)
            print("1. Open your app: http://localhost:4000")
            print("2. Sign in with Google/Email")
            print("3. Open DevTools (F12 or Cmd+Option+I)")
            print("4. Go to Console tab")
            print("5. Run:")
            print("\n   firebase.auth().currentUser.getIdToken().then(console.log)\n")
            print("6. Copy the token from console")
            print("7. Add to .env: TEST_FIREBASE_TOKEN=<token>")
            
            print("\n\nMethod 2: Using Firebase Console")
            print("-" * 60)
            print("1. Go to: https://console.firebase.google.com")
            print(f"2. Select project: {FIREBASE_PROJECT_ID}")
            print("3. Go to Authentication > Users")
            print("4. Create a test user or use existing")
            print("5. Use this script with option 1 or 2")
            
            print("\n\nMethod 3: Using curl")
            print("-" * 60)
            print("curl -X POST \\")
            print(f'  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}" \\')
            print('  -H "Content-Type: application/json" \\')
            print('  -d \'{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD","returnSecureToken":true}\' \\')
            print("  | jq -r '.idToken'")
            print("\n═" * 60)
            
        else:
            print("\n❌ Invalid choice!")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Common issues:")
        print("   - EMAIL_NOT_FOUND: User doesn't exist (try option 2 to create)")
        print("   - INVALID_PASSWORD: Wrong password")
        print("   - INVALID_EMAIL: Check email format")
        print("   - TOO_MANY_ATTEMPTS_TRY_LATER: Wait a few minutes")

def update_env_file(token):
    """Update .env file with the new token"""
    env_path = ".env"
    
    if not os.path.exists(env_path):
        print(f"\n❌ .env file not found at {env_path}")
        return
    
    try:
        with open(env_path, 'r') as f:
            lines = f.readlines()
        
        updated = False
        for i, line in enumerate(lines):
            if line.startswith('TEST_FIREBASE_TOKEN='):
                lines[i] = f'TEST_FIREBASE_TOKEN={token}\n'
                updated = True
                break
        
        if not updated:
            lines.append(f'\nTEST_FIREBASE_TOKEN={token}\n')
        
        with open(env_path, 'w') as f:
            f.writelines(lines)
        
        print(f"\n✅ Updated {env_path} with new token!")
        
    except Exception as e:
        print(f"\n⚠️  Could not update .env file: {e}")
        print("Please add manually:")
        print(f"TEST_FIREBASE_TOKEN={token}")

if __name__ == "__main__":
    main()
