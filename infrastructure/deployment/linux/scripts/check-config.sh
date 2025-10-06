#!/bin/bash

echo "=== Environment Configuration Check ==="
echo ""

echo "📁 Checking .env file:"
if [ -f .env ]; then
    echo "✅ .env file exists"
    echo "VITE_API_URL=$(grep VITE_API_URL .env || echo 'Not found')"
else
    echo "❌ .env file not found"
fi

echo ""
echo "🔧 Checking config.ts file:"
if [ -f client/src/lib/config.ts ]; then
    echo "✅ config.ts exists"
    echo "API Base URL configuration:"
    grep -A 3 "apiBaseUrl:" client/src/lib/config.ts
else
    echo "❌ config.ts not found"
fi

echo ""
echo "📦 Checking built assets:"
if [ -d dist/public ]; then
    echo "✅ Built assets exist in dist/public"
    ls -la dist/public/assets/ | head -5
else
    echo "❌ Built assets not found"
fi

echo ""
echo "🌐 Testing server connectivity:"
echo "Pinging production server..."
ping -c 2 13.235.73.106 2>/dev/null || echo "❌ Server not reachable"

echo ""
echo "✅ Configuration check complete!"
