#!/bin/bash

echo "🧪 StackLens AI - Complete Fix Verification Test"
echo "================================================"
echo ""

# Test the login endpoint first
echo "1. 🔐 Testing Authentication - Login"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "deepanimators", "password": "admin123"}')

echo "Login response: $LOGIN_RESPONSE" | head -c 150
echo ""

# Extract token from response (assuming it's a JSON response)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "✅ Login successful, token extracted: ${TOKEN:0:20}..."
    echo ""
    
    echo "2. 🔍 Testing /api/auth/me endpoint"
    AUTH_ME_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/auth/me)
    echo "Auth me response: $AUTH_ME_RESPONSE" | head -c 200
    echo ""
    echo ""
    
    echo "3. 📊 Testing /api/dashboard endpoint"
    DASHBOARD_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/dashboard)
    echo "Dashboard response: $DASHBOARD_RESPONSE" | head -c 300
    echo ""
    echo ""
    
    echo "4. 🐛 Testing /api/errors endpoint"
    ERRORS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/errors)
    echo "Errors response: $ERRORS_RESPONSE" | head -c 200
    echo ""
    echo ""
    
    echo "5. 📁 Testing /api/files endpoint"
    FILES_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/files)
    echo "Files response: $FILES_RESPONSE" | head -c 200
    echo ""
    echo ""
    
    echo "6. ⚙️ Testing /api/admin/api-settings endpoint"
    API_SETTINGS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/admin/api-settings)
    echo "API Settings response: $API_SETTINGS_RESPONSE" | head -c 200
    echo ""
    
else
    echo "❌ Login failed, cannot test authenticated endpoints"
    echo "Login response was: $LOGIN_RESPONSE"
fi

echo ""
echo "✅ Authentication and API tests completed!"
echo ""
echo "🔧 Frontend Build Status:"
ls -la dist/public/assets/ | head -3

echo ""
echo "🌐 Next Steps:"
echo "  1. Open http://localhost:4000 in your browser"
echo "  2. You should be automatically logged in (dev mode)"
echo "  3. Navigate to /reports to see real data"
echo "  4. All API calls should work without 'Not authenticated' errors"
