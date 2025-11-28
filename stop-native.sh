#!/bin/bash

# stop-native.sh
# Stops all StackLens services and frees up ports.

echo "🛑 Stopping StackLens Native Stack..."

# List of ports to kill
PORTS="3000 3001 4000 5173 5174 8005 8006"

for PORT in $PORTS; do
    PID=$(lsof -ti :$PORT)
    if [ -n "$PID" ]; then
        echo "Killing process on port $PORT (PID: $PID)..."
        kill -9 $PID 2>/dev/null
    fi
done

# Stop Kafka/Zookeeper if running in foreground (hard to track if not via brew services)
# If started via brew services, user should stop them via brew services stop ...
# But our start script runs them as background processes if not found.
# We can try to find them by name.

pkill -f "kafka.Kafka"
pkill -f "org.apache.zookeeper.server.quorum.QuorumPeerMain"
pkill -f "ml_service.py"
pkill -f "predictive_alerter.py"

echo "✅ All services stopped and ports freed."
