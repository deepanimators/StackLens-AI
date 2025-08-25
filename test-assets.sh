#!/bin/bash

echo "🧪 Testing StackLens-AI Asset Serving"
echo "======================================"

# Test main page
echo "1. Testing main page (/)..."
curl -s -o /dev/null -w "Status: %{http_code}, Content-Type: %{content_type}\n" http://localhost:4000/

# Test CSS file
echo "2. Testing CSS file (/assets/index-yUxBeiJW.css)..."
curl -s -o /dev/null -w "Status: %{http_code}, Content-Type: %{content_type}\n" http://localhost:4000/assets/index-yUxBeiJW.css

# Test JS file
echo "3. Testing JS file (/assets/index-2SjBJzb3.js)..."
curl -s -o /dev/null -w "Status: %{http_code}, Content-Type: %{content_type}\n" http://localhost:4000/assets/index-2SjBJzb3.js

# Test API endpoint
echo "4. Testing API endpoint (/api/health)..."
curl -s -o /dev/null -w "Status: %{http_code}, Content-Type: %{content_type}\n" http://localhost:4000/api/health

echo "✅ Asset serving test complete!"
