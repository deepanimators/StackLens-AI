#!/bin/bash

# start-kafka-native.sh
# Starts Kafka 4.x in KRaft mode (no Zookeeper needed) on macOS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KAFKA_HOME=$(brew --prefix)/opt/kafka
KAFKA_LOG_DIR="$SCRIPT_DIR/logs/kafka"
KAFKA_DATA_DIR="$SCRIPT_DIR/data/kafka"

echo "🚀 Starting Kafka in KRaft Mode (No Zookeeper Required)"
echo "   Kafka Version: $(kafka-broker-api-versions --version 2>/dev/null || echo '4.x')"
echo ""

# Create directories
mkdir -p "$KAFKA_LOG_DIR"
mkdir -p "$KAFKA_DATA_DIR"

# Check if Kafka is already running
if pgrep -f "kafka.Kafka" > /dev/null 2>&1; then
    echo "✅ Kafka is already running"
    echo "   PID: $(pgrep -f 'kafka.Kafka')"
    exit 0
fi

# Check if port 9092 is in use by something else
if lsof -i :9092 > /dev/null 2>&1; then
    echo "⚠️  Port 9092 is already in use:"
    lsof -i :9092 | head -3
    echo ""
    read -p "Do you want to kill the process and continue? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :9092 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        echo "❌ Aborting. Free port 9092 first."
        exit 1
    fi
fi

# Create KRaft config if not exists
KRAFT_CONFIG="$SCRIPT_DIR/config/kraft-server.properties"
mkdir -p "$SCRIPT_DIR/config"

if [ ! -f "$KRAFT_CONFIG" ]; then
    echo "📝 Creating KRaft configuration..."
    cat > "$KRAFT_CONFIG" << 'EOF'
# Kafka KRaft Mode Configuration
# Generated for StackLens local development

# Node configuration
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093

# Listeners
listeners=PLAINTEXT://localhost:9092,CONTROLLER://localhost:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
inter.broker.listener.name=PLAINTEXT

# Log configuration
log.dirs=/tmp/kraft-combined-logs
num.partitions=3
default.replication.factor=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

# Performance tuning for local dev
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Log retention
log.retention.hours=24
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# Auto-create topics
auto.create.topics.enable=true
EOF
    echo "✅ Created KRaft configuration at $KRAFT_CONFIG"
fi

# Update log.dirs to use our data directory
sed -i '' "s|log.dirs=.*|log.dirs=$KAFKA_DATA_DIR|g" "$KRAFT_CONFIG"

# Generate cluster ID if not exists
CLUSTER_ID_FILE="$SCRIPT_DIR/data/kafka/.cluster_id"
if [ ! -f "$CLUSTER_ID_FILE" ]; then
    echo "🔑 Generating Kafka Cluster ID..."
    CLUSTER_ID=$(kafka-storage random-uuid)
    echo "$CLUSTER_ID" > "$CLUSTER_ID_FILE"
    echo "   Cluster ID: $CLUSTER_ID"
    
    # Format storage
    echo "📦 Formatting Kafka storage..."
    kafka-storage format -t "$CLUSTER_ID" -c "$KRAFT_CONFIG" --ignore-formatted
fi

CLUSTER_ID=$(cat "$CLUSTER_ID_FILE")
echo "   Using Cluster ID: $CLUSTER_ID"

# Start Kafka
echo ""
echo "🚀 Starting Kafka broker..."
nohup kafka-server-start "$KRAFT_CONFIG" > "$KAFKA_LOG_DIR/kafka.log" 2>&1 &
KAFKA_PID=$!
echo "$KAFKA_PID" > "$SCRIPT_DIR/data/kafka.pid"

# Wait for Kafka to start
echo "⏳ Waiting for Kafka to be ready..."
for i in {1..30}; do
    if kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
        echo ""
        echo "✅ Kafka is running!"
        echo "   PID: $KAFKA_PID"
        echo "   Bootstrap Server: localhost:9092"
        echo "   Logs: $KAFKA_LOG_DIR/kafka.log"
        echo ""
        echo "📋 Quick Commands:"
        echo "   List topics:    kafka-topics --bootstrap-server localhost:9092 --list"
        echo "   Create topic:   kafka-topics --bootstrap-server localhost:9092 --create --topic my-topic"
        echo "   Stop Kafka:     kill $KAFKA_PID"
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "❌ Kafka failed to start. Check logs:"
echo "   tail -50 $KAFKA_LOG_DIR/kafka.log"
exit 1
