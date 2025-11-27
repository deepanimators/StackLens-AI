#!/bin/bash
echo "🧹 Clearing TypeScript and build caches..."
rm -rf dist .tsbuildinfo node_modules/.cache node_modules/.ts-node 2>/dev/null
echo "✓ Cache cleared successfully"
echo ""
echo "📦 To start the server, run:"
echo "  npm start"
echo ""
echo "🧪 To verify controllers are loaded, run:"
echo "  node -e \"require('ts-node').register(); const c = require('./src/controllers'); console.log('✓ All controllers loaded')\""
