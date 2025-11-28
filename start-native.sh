#!/bin/bash

# start-native.sh
# Starts the full StackLens stack natively on macOS.

# Function to kill processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    # Kill all child processes in the same process group
    kill -- -$$ 2>/dev/null
    
    # Explicitly kill known ports just in case
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    lsof -ti :3001 | xargs kill -9 2>/dev/null
    lsof -ti :4000 | xargs kill -9 2>/dev/null
    lsof -ti :5173 | xargs kill -9 2>/dev/null
    lsof -ti :5174 | xargs kill -9 2>/dev/null
    lsof -ti :8005 | xargs kill -9 2>/dev/null # ML Service
    lsof -ti :8006 | xargs kill -9 2>/dev/null # Predictive Alerter
    
    # Stop brew services if we started them? 
    # Usually better to leave them running or stop them explicitly.
    # We will just stop the foreground apps.
    
    echo "✅ Services stopped."
    exit
}

# Trap Ctrl+C
trap cleanup SIGINT

echo "🚀 Starting StackLens Native Stack..."
ROOT_DIR=$(pwd)

# 1. Start Infrastructure (Postgres, Zookeeper, Kafka)
echo "📦 Checking Infrastructure..."

# Postgres
if ! pg_isready -q; then
    echo "🚀 Starting Postgres..."
    brew services start postgresql@15
    sleep 3
else
    echo "✅ Postgres is running."
fi

# Zookeeper & Kafka
# We'll run them in background if not running via brew services
# First, kill any non-Kafka process using port 9092 (like Electron)
if lsof -i :9092 | grep -v "java" | grep -v "COMMAND" > /dev/null 2>&1; then
    echo "⚠️  Port 9092 is occupied by a non-Kafka process, attempting to free it..."
    # Don't kill the process, use different port for Kafka instead
fi

# Check if Zookeeper is actually running (not just port open)
ZOOKEEPER_RUNNING=$(pgrep -f "zookeeper" 2>/dev/null)
if [ -z "$ZOOKEEPER_RUNNING" ]; then
    echo "🚀 Starting Zookeeper..."
    # Kill anything on port 2181 first
    lsof -ti :2181 | xargs kill -9 2>/dev/null
    sleep 1
    zookeeper-server-start $(brew --prefix)/etc/kafka/zookeeper.properties > "$ROOT_DIR/logs/zookeeper.log" 2>&1 &
    echo "⏳ Waiting for Zookeeper to start..."
    sleep 8
    if pgrep -f "zookeeper" > /dev/null; then
        echo "✅ Zookeeper started successfully."
    else
        echo "❌ Zookeeper failed to start. Check logs/zookeeper.log"
    fi
else
    echo "✅ Zookeeper is running."
fi

# Check if Kafka is actually running (not just port open)
KAFKA_RUNNING=$(pgrep -f "kafka\.Kafka" 2>/dev/null)
if [ -z "$KAFKA_RUNNING" ]; then
    echo "🚀 Starting Kafka..."
    # Note: If port 9092 is taken by another app, Kafka will fail
    # For now we'll try to start it anyway
    kafka-server-start $(brew --prefix)/etc/kafka/server.properties > "$ROOT_DIR/logs/kafka.log" 2>&1 &
    echo "⏳ Waiting for Kafka to start..."
    sleep 10
    if pgrep -f "kafka\.Kafka" > /dev/null; then
        echo "✅ Kafka started successfully."
    else
        echo "❌ Kafka failed to start. Port 9092 may be in use by another app."
        echo "   Check: lsof -i :9092"
        echo "   Check logs: logs/kafka.log"
    fi
else
    echo "✅ Kafka is running."
fi

# Create Logs Directory
mkdir -p "$ROOT_DIR/logs"

# 2. Python Services Setup
echo "🐍 Setting up Python Environment..."
cd "$ROOT_DIR/python-services"
if [ ! -d "venv" ]; then
    echo "⚙️  Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "📦 Installing Python requirements..."
pip install -r requirements.txt > /dev/null 2>&1

# 3. Start Python ML Services
echo "🧠 Starting ML Service (Port 8005)..."
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_USER=stacklens
export POSTGRES_PASSWORD=stacklens_password
export POSTGRES_DB=stacklens
export DB_USER=stacklens
export DB_PASSWORD=stacklens_password
export DB_HOST=localhost
export DB_PORT=5432
export KAFKA_BOOTSTRAP_SERVERS=127.0.0.1:9092
export LOG_LEVEL=INFO

python ml_service.py > "$ROOT_DIR/logs/ml_service.log" 2>&1 &
ML_PID=$!

echo "🔮 Starting Predictive Alerter (Port 8006)..."
python predictive_alerter.py > "$ROOT_DIR/logs/predictive_alerter.log" 2>&1 &
ALERTER_PID=$!

cd "$ROOT_DIR"

# 4. Start Node.js API (apps/api) - Port 4000
echo "🔧 Starting StackLens API (Port 4000)..."
# Ensure port 4000 is free
lsof -ti :4000 | xargs kill -9 2>/dev/null

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)
# Override for local native
export DB_HOST=localhost
export KAFKA_BROKERS=localhost:9092

npm run dev:server > "$ROOT_DIR/logs/server.log" 2>&1 &
API_PID=$!

# 5. Start Frontend (apps/web) - Port 5173
echo "🎨 Starting StackLens Frontend (Port 5173)..."
lsof -ti :5173 | xargs kill -9 2>/dev/null
npm run dev:client > "$ROOT_DIR/logs/client.log" 2>&1 &
FRONTEND_PID=$!

# 6. Start POS Demo Backend - Port 3000
echo "🛒 Starting POS Demo Backend (Port 3000)..."
cd "$ROOT_DIR/pos-demo/backend"
lsof -ti :3000 | xargs kill -9 2>/dev/null
export KAFKA_BROKERS=localhost:9092
export ANALYTICS_URL=http://localhost:4000/api/analytics/events
npm install > /dev/null 2>&1
PORT=3000 npm start > "$ROOT_DIR/logs/pos_backend.log" 2>&1 &
POS_BACKEND_PID=$!

# 7. Start POS Demo Frontend - Port 5174
echo "🛍️ Starting POS Demo Frontend (Port 5174)..."
cd "$ROOT_DIR/pos-demo/frontend"
lsof -ti :5174 | xargs kill -9 2>/dev/null
npm install > /dev/null 2>&1
npm run dev -- --port 5174 > "$ROOT_DIR/logs/pos_frontend.log" 2>&1 &
POS_FRONTEND_PID=$!

cd "$ROOT_DIR"

echo ""
echo "✅ All services started!"
echo "------------------------------------------------"
echo "👉 StackLens UI:  http://localhost:5173"
echo "👉 StackLens API: http://localhost:4000"
echo "👉 POS Demo Shop: http://localhost:5174"
echo "👉 POS Demo API:  http://localhost:3000"
echo "------------------------------------------------"
echo "Press Ctrl+C to stop everything."

# Tail logs
tail -f logs/server.log logs/client.log logs/ml_service.log logs/pos_backend.log
