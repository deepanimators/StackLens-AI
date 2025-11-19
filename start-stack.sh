#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ -n "$POS_BACKEND_PID" ]; then
        kill $POS_BACKEND_PID 2>/dev/null
    fi
    if [ -n "$POS_FRONTEND_PID" ]; then
        kill $POS_FRONTEND_PID 2>/dev/null
    fi
    echo "✅ Services stopped."
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT

echo "🚀 Starting StackLens Stack..."

# Get the root directory
ROOT_DIR=$(pwd)

# 1. Cleanup & Start Infra
echo "📦 Checking Infrastructure..."
# Force kill anything on port 9093 if docker didn't catch it
if lsof -i :9093 >/dev/null; then
    echo "⚠️  Port 9093 is still in use. Attempting to stop Docker containers again..."
    docker-compose down
    if lsof -i :9093 >/dev/null; then
        echo "❌ Port 9093 is still busy. Please free this port manually."
        exit 1
    fi
fi
docker-compose up -d
cd "$ROOT_DIR"

# 2. Start Backend
echo "🔧 Starting Backend (Port 3001)..."
cd "$ROOT_DIR/stacklens/backend"
export KAFKA_BROKERS=localhost:9093
npm start &
BACKEND_PID=$!

# 3. Start Frontend
echo "🎨 Starting Frontend (Port 5173)..."
cd "$ROOT_DIR/stacklens/frontend"
npm run dev &
FRONTEND_PID=$!

# 4. Start POS Demo Backend
echo "🛒 Starting POS Demo Backend (Port 3000)..."
cd "$ROOT_DIR/pos-demo/backend"
export KAFKA_BROKERS=localhost:9093
npm install
npm start &
POS_BACKEND_PID=$!

# 5. Start POS Demo Frontend
echo "🛍️ Starting POS Demo Frontend (Port 5174)..."
cd "$ROOT_DIR/pos-demo/frontend"
if [ -f "package.json" ]; then
    npm install
    npm run dev -- --port 5174 &
    POS_FRONTEND_PID=$!
else
    echo "⚠️ POS Demo Frontend not found or empty. Skipping."
fi

echo ""
echo "✅ All services started!"
echo "------------------------------------------------"
echo "👉 StackLens UI: http://localhost:5173"
echo "👉 StackLens API: http://localhost:3001"
echo "👉 POS Demo Shop: http://localhost:5174"
echo "👉 POS Demo API:  http://localhost:3000"
echo "👉 Jaeger:        http://localhost:16686"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop everything."

# Wait for processes
wait
