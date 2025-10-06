#!/bin/bash

API_BASE="http://13.235.73.106:4000"

echo "🧪 Testing StackLens API endpoints..."
echo "API Base: $API_BASE"
echo ""

echo "1. Testing /api/dashboard endpoint:"
curl -s "$API_BASE/api/dashboard" | head -c 200
echo ""
echo ""

echo "2. Testing /api/admin/api-settings endpoint:"
curl -s "$API_BASE/api/admin/api-settings" | head -c 200
echo ""
echo ""

echo "3. Testing /api/errors endpoint:"
curl -s "$API_BASE/api/errors" | head -c 200
echo ""
echo ""

echo "4. Testing /api/files endpoint:"
curl -s "$API_BASE/api/files" | head -c 200
echo ""
echo ""

echo "✅ API endpoint tests completed!"
