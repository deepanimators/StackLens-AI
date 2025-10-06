#!/bin/bash

# StackLens AI - Production Deployment Script
# This script prepares and optionally deploys the application to production

SERVER_IP="${1:-13.235.73.106}"
SERVER_USER="${2:-ubuntu}"
SERVER_PATH="${3:-/home/ubuntu/stacklens}"

echo "🚀 StackLens AI - Production Deployment"
echo "========================================"
echo ""

# Build frontend
echo "📦 Building frontend..."
npm run build:client

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend built successfully"
echo ""

# Build server
echo "🔧 Building server..."
npm run build:server

if [ $? -ne 0 ]; then
    echo "❌ Server build failed!"
    exit 1
fi

echo "✅ Server built successfully"
echo ""

# Create deployment package
echo "📁 Creating deployment package..."
mkdir -p deployment

# Copy built files
cp -r dist deployment/
cp package.json deployment/
cp .env deployment/
cp -r db deployment/ 2>/dev/null || echo "ℹ️  No db folder found"

# Copy any additional files
cp README.md deployment/ 2>/dev/null
cp -r scripts deployment/ 2>/dev/null

echo "✅ Deployment package created"
echo ""

echo "📋 Deployment package contents:"
ls -la deployment/

echo ""
echo "🌐 Configuration Summary:"
echo "  API URL: $(grep VITE_API_URL .env)"
echo "  Server IP: $SERVER_IP"
echo "  Environment: production"
echo ""

# Optional: Display deployment instructions
echo "📝 Next steps:"
echo "  1. Copy the 'deployment' folder to your server"
echo "  2. On server, run: cd stacklens && npm install --production"
echo "  3. Start the server: npm start"
echo ""

# Optional: Offer to deploy via SCP (uncomment if you have SSH access)
# read -p "Deploy to server now? (y/n): " -n 1 -r
# echo
# if [[ $REPLY =~ ^[Yy]$ ]]; then
#     echo "🚀 Deploying to $SERVER_IP..."
#     scp -r deployment/* $SERVER_USER@$SERVER_IP:$SERVER_PATH/
#     echo "✅ Deployment complete!"
# fi

echo "✅ Build complete! Ready for deployment."
