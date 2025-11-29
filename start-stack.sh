#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    if [ -n "$API_PID" ]; then
        kill $API_PID 2>/dev/null
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ -n "$POS_BACKEND_PID" ]; then
        kill $POS_BACKEND_PID 2>/dev/null
    fi
    if [ -n "$POS_FRONTEND_PID" ]; then
        kill $POS_FRONTEND_PID 2>/dev/null
    fi
    if [ -n "$TAIL_PID" ]; then
        kill $TAIL_PID 2>/dev/null
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
cd "$ROOT_DIR/infra"
# Force kill anything on port 9094 if docker didn't catch it
if lsof -i :9094 >/dev/null; then
    echo "⚠️  Port 9094 is still in use. Attempting to stop Docker containers again..."
    docker-compose -f docker-compose.yml down
    if lsof -i :9094 >/dev/null; then
        echo "❌ Port 9094 is still busy. Please free this port manually."
        exit 1
    fi
fi
docker-compose -f docker-compose.yml up -d
cd "$ROOT_DIR"

# Wait for Postgres to be ready
echo "⏳ Waiting for Postgres to be ready..."
until nc -z localhost 5432; do
  sleep 1
done
echo "✅ Postgres is ready!"

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka to be ready..."
until nc -z localhost 9094; do
  sleep 1
done
echo "⏳ Waiting for Kafka broker initialization (leadership election)..."
sleep 10
echo "✅ Kafka is ready!"

# 2. Start Main API (apps/api) - Port 4000
echo "🔧 Starting StackLens API (Port 4000)..."
cd "$ROOT_DIR"
# Ensure port 4000 is free
if lsof -i :4000 >/dev/null; then
    echo "⚠️  Port 4000 is in use. Killing..."
    lsof -ti :4000 | xargs kill -9
fi
# Load environment variables
export $(cat .env | grep -v '^#' | xargs)
# Ensure services bind to all interfaces for external access
export HOST=0.0.0.0
npm run dev:server > "$ROOT_DIR/server.log" 2>&1 &
API_PID=$!

# 3. Start Frontend (apps/web) - Port 5173
echo "🎨 Starting StackLens Frontend (Port 5173)..."
cd "$ROOT_DIR"
# Ensure port 5173 is free
if lsof -i :5173 >/dev/null; then
    echo "⚠️  Port 5173 is in use. Killing..."
    lsof -ti :5173 | xargs kill -9
fi
# Bind to all interfaces for external access
export VITE_HOST=0.0.0.0
npm run dev:client -- --host 0.0.0.0 > "$ROOT_DIR/client.log" 2>&1 &
FRONTEND_PID=$!

# 4. Start Legacy Backend (Optional/Microservice) - Port 3001
echo "🔧 Starting Legacy Backend (Port 3001)..."
cd "$ROOT_DIR/stacklens/backend"
# Ensure port 3001 is free
if lsof -i :3001 >/dev/null; then
    echo "⚠️  Port 3001 is in use. Killing..."
    lsof -ti :3001 | xargs kill -9
fi
export KAFKA_BROKERS=localhost:9094
PORT=3001 npm start > "$ROOT_DIR/legacy_backend.log" 2>&1 &
BACKEND_PID=$!

# 5. Start POS Demo Backend - Port 3000
echo "🛒 Starting POS Demo Backend (Port 3000)..."
cd "$ROOT_DIR/pos-demo/backend"
# Ensure port 3000 is free
if lsof -i :3000 >/dev/null; then
    echo "⚠️  Port 3000 is in use. Killing..."
    lsof -ti :3000 | xargs kill -9
fi
export KAFKA_BROKERS=localhost:9094
export ANALYTICS_URL=http://localhost:4000/api/analytics/events
# Bind to all interfaces for external access
export HOST=0.0.0.0
npm install
PORT=3000 HOST=0.0.0.0 npm start > "$ROOT_DIR/pos_backend.log" 2>&1 &
POS_BACKEND_PID=$!

# 6. Start POS Demo Frontend - Port 5174
echo "🛍️ Starting POS Demo Frontend (Port 5174)..."
cd "$ROOT_DIR/pos-demo/frontend"
# Ensure port 5174 is free
if lsof -i :5174 >/dev/null; then
    echo "⚠️  Port 5174 is in use. Killing..."
    lsof -ti :5174 | xargs kill -9
fi

if [ -f "package.json" ]; then
    npm install
    # Bind to all interfaces for external access
    export VITE_HOST=0.0.0.0
    npm run dev -- --host 0.0.0.0 --port 5174 > "$ROOT_DIR/pos_frontend.log" 2>&1 &
    POS_FRONTEND_PID=$!
else
    echo "⚠️ POS Demo Frontend not found or empty. Skipping."
fi

echo ""
echo "✅ All services started!"
echo "------------------------------------------------"
echo "👉 StackLens UI:  http://localhost:5173 (external: http://<your-ip>:5173)"
echo "👉 StackLens API: http://localhost:4000 (external: http://<your-ip>:4000)"
echo "👉 POS Demo Shop: http://localhost:5174 (external: http://<your-ip>:5174)"
echo "👉 POS Demo API:  http://localhost:3000 (external: http://<your-ip>:3000)"
echo "👉 Jaeger:        http://localhost:16686"
echo "------------------------------------------------"
echo "All services bound to 0.0.0.0 for external access."
echo "Ensure AWS Security Group allows ports: 3000, 4000, 5173, 5174"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop everything."

# Wait for processes
# Stream logs to terminal
cd "$ROOT_DIR"
echo "📋 Tailing logs (server.log, client.log, pos_backend.log, pos_frontend.log)..."
# Create files if they don't exist to prevent tail errors
touch server.log client.log pos_backend.log pos_frontend.log legacy_backend.log
tail -f server.log client.log pos_backend.log pos_frontend.log legacy_backend.log &
TAIL_PID=$!

# Wait for processes
wait $API_PID $FRONTEND_PID $BACKEND_PID $POS_BACKEND_PID $POS_FRONTEND_PID
