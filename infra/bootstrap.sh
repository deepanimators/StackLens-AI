#!/bin/bash

# StackLens Bootstrap Script

echo "🚀 Starting StackLens Demo Stack..."

# 1. Start Infrastructure (Docker Compose)
echo "📦 Starting Infrastructure (Kafka, ES, Postgres, OTel)..."
cd infra
docker-compose up -d
cd ..

# 2. Install & Build Backend
echo "🔧 Setting up Backend..."
cd stacklens/backend
npm install
npm run build

# 3. Install Frontend
echo "🎨 Setting up Frontend..."
cd ../frontend
npm install

echo "✅ Setup Complete!"
echo ""
echo "To run the services:"
echo "1. Backend: cd stacklens/backend && npm start"
echo "2. Frontend: cd stacklens/frontend && npm run dev"
echo "3. Node SDK Example: node sdk-examples/node/index.js"
echo ""
echo "Infrastructure is running in the background."
