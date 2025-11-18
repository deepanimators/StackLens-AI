#!/bin/bash

# Quick Start: POS Demo Service (Week 1-2)
# This script gets you up and running in 2 minutes

set -e

echo "🚀 Starting POS Demo Service Quick Setup..."
echo ""

# Step 1: Verify we're in the right directory
echo "📁 Step 1: Verifying directory..."
if [ ! -f "package.json" ]; then
    echo "❌ Error: quickstart.sh must be run from demo-pos-app directory"
    exit 1
fi

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install --quiet
    echo "   ✅ Dependencies installed"
else
    echo "   ✅ Dependencies already installed"
fi

# Step 3: Build TypeScript
echo "🏗️  Step 3: Building TypeScript..."
npm run build > /dev/null 2>&1
echo "   ✅ TypeScript built"

# Step 4: Run tests
echo "🧪 Step 4: Running tests..."
npm test -- --passWithNoTests --testTimeout=5000 --silent 2>/dev/null | tail -5
echo "   ✅ Tests complete"

# Step 5: Show next steps
echo ""
echo "✅ Setup complete! Your options:"
echo ""
echo "   Development (hot reload):"
echo "      npm run dev"
echo ""
echo "   Production:"
echo "      npm start"
echo ""
echo "   Test with curl:"
echo "      curl http://localhost:3001/health"
echo ""
echo "   Docker:"
echo "      docker build -t stacklens/pos-demo:1.0.0 ."
echo "      docker run -p 3001:3001 stacklens/pos-demo:1.0.0"
echo ""
echo "📚 Documentation:"
echo "      ../WEEK_1_2_COMPLETION_REPORT.md"
echo "      ../docs/PHASE_1_QUICK_REFERENCE.md"
echo ""
