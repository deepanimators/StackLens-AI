#!/bin/bash

# StackLens Infrastructure Startup Script for Linux/macOS
# Run with: ./start-infra.sh

set -e

echo "🚀 Starting StackLens Infrastructure..."

# Navigate to infra directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/infra"

# Check if Docker is running
if ! docker ps >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi
echo "✅ Docker is running"

# Load environment variables from .env.docker
if [ -f ".env.docker" ]; then
    echo "📝 Loading environment variables from .env.docker..."
    export $(cat .env.docker | grep -v '^#' | xargs)
fi

# Set default KAFKA_EXTERNAL_HOST if not set
if [ -z "$KAFKA_EXTERNAL_HOST" ] || [ "$KAFKA_EXTERNAL_HOST" = "localhost" ]; then
    echo "⚠️  KAFKA_EXTERNAL_HOST not set. Using localhost."
    echo "   For external access, set KAFKA_EXTERNAL_HOST in infra/.env.docker"
    export KAFKA_EXTERNAL_HOST=localhost
fi

# Stop any existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Clean up old volumes (optional - uncomment to enable)
# echo "🗑️  Removing old volumes..."
# docker-compose down -v 2>/dev/null || true

# Start infrastructure
echo ""
echo "🏗️  Starting infrastructure services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to start infrastructure"
    exit 1
fi

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be healthy..."

services=("zookeeper" "kafka" "elasticsearch" "postgres")
max_wait=120  # 2 minutes

for service in "${services[@]}"; do
    echo "   Checking $service..."
    elapsed=0
    healthy=false
    
    while [ $elapsed -lt $max_wait ]; do
        health=$(docker inspect --format='{{.State.Health.Status}}' "stacklens-$service" 2>/dev/null || echo "starting")
        
        if [ "$health" = "healthy" ]; then
            echo "   ✅ $service is healthy"
            healthy=true
            break
        elif [ "$health" = "unhealthy" ]; then
            echo "   ❌ $service is unhealthy!"
            docker logs "stacklens-$service" --tail 20
            exit 1
        else
            sleep 5
            elapsed=$((elapsed + 5))
            echo "   ... waiting for $service ($elapsed/$max_wait seconds)"
        fi
    done
    
    if [ "$healthy" = false ]; then
        echo "   ❌ Timeout waiting for $service"
        docker logs "stacklens-$service" --tail 20
        exit 1
    fi
done

# Show running containers
echo ""
echo "📦 Running containers:"
docker-compose ps

# Show connection info
echo ""
echo "✅ Infrastructure is ready!"
echo "─────────────────────────────────────────────"
echo "📊 Services:"
echo "   Kafka:          localhost:9094"
echo "   Zookeeper:      localhost:2181"
echo "   PostgreSQL:     localhost:5432"
echo "   Elasticsearch:  http://localhost:9200"
echo "   Kibana:         http://localhost:5601"
echo "   OTEL Collector: localhost:4317 (gRPC), localhost:4318 (HTTP)"
echo "   Jaeger UI:      http://localhost:16686"
echo "─────────────────────────────────────────────"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:      docker-compose logs -f [service-name]"
echo "   Stop all:       docker-compose down"
echo "   Restart:        docker-compose restart [service-name]"
echo "   Remove volumes: docker-compose down -v"
echo "─────────────────────────────────────────────"
echo ""
echo "✨ Ready to run your StackLens application!"
