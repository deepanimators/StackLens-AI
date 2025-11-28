#!/bin/bash

# StackLens AI - Health Check Script

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_PORT="${APP_PORT:-4000}"
VERBOSE="${1:-}"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   StackLens AI Health Check${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

exit_code=0

# Application health check
echo -e "${BLUE}Application Health:${NC}"
if response=$(curl -sf http://localhost:$APP_PORT/health 2>&1); then
    echo -e "  Status:   ${GREEN}✓ Healthy${NC}"
    
    if [ "$VERBOSE" = "-v" ] || [ "$VERBOSE" = "--verbose" ]; then
        echo -e "  Response: $response"
    fi
else
    echo -e "  Status:   ${RED}✗ Unhealthy${NC}"
    echo -e "  Error:    Application not responding on port $APP_PORT"
    exit_code=1
fi

echo ""

# Infrastructure health checks
echo -e "${BLUE}Infrastructure Health:${NC}"

# Zookeeper
echo -n "  Zookeeper: "
if docker ps --filter "name=stacklens-zookeeper" --filter "status=running" | grep -q "stacklens-zookeeper"; then
    if docker exec stacklens-zookeeper zkServer.sh status 2>&1 | grep -q "Mode:"; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Running but unhealthy${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}✗ Not running${NC}"
    exit_code=1
fi

# Kafka
echo -n "  Kafka:     "
if docker ps --filter "name=stacklens-kafka" --filter "status=running" | grep -q "stacklens-kafka"; then
    if docker exec stacklens-kafka kafka-broker-api-versions --bootstrap-server localhost:29092 2>&1 | grep -q "ApiVersion"; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Running but unhealthy${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}✗ Not running${NC}"
    exit_code=1
fi

# PostgreSQL
echo -n "  PostgreSQL:"
if docker ps --filter "name=stacklens-postgres" --filter "status=running" | grep -q "stacklens-postgres"; then
    if docker exec stacklens-postgres pg_isready -U stacklens 2>&1 | grep -q "accepting connections"; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Running but unhealthy${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}✗ Not running${NC}"
    exit_code=1
fi

# Elasticsearch
echo -n "  Elasticsearch: "
if docker ps --filter "name=stacklens-elasticsearch" --filter "status=running" | grep -q "stacklens-elasticsearch"; then
    if curl -sf http://localhost:9200/_cluster/health 2>&1 | grep -q "status"; then
        cluster_status=$(curl -sf http://localhost:9200/_cluster/health 2>&1 | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        if [ "$cluster_status" = "green" ]; then
            echo -e "${GREEN}✓ Healthy (green)${NC}"
        elif [ "$cluster_status" = "yellow" ]; then
            echo -e "${YELLOW}⚠ Warning (yellow)${NC}"
        else
            echo -e "${RED}✗ Unhealthy (red)${NC}"
            exit_code=1
        fi
    else
        echo -e "${YELLOW}⚠ Running but not responding${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}✗ Not running${NC}"
    exit_code=1
fi

# OpenTelemetry Collector
echo -n "  OTEL:      "
if docker ps --filter "name=stacklens-otel-collector" --filter "status=running" | grep -q "stacklens-otel-collector"; then
    if curl -sf http://localhost:13133/ 2>&1 > /dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Running but unhealthy${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}✗ Not running${NC}"
    exit_code=1
fi

# Jaeger
echo -n "  Jaeger:    "
if docker ps --filter "name=stacklens-jaeger" --filter "status=running" | grep -q "stacklens-jaeger"; then
    if curl -sf http://localhost:16686/ 2>&1 > /dev/null; then
        echo -e "${GREEN}✓ Healthy${NC}"
    else
        echo -e "${YELLOW}⚠ Running but unhealthy${NC}"
        exit_code=1
    fi
else
    echo -e "${RED}✗ Not running${NC}"
    exit_code=1
fi

echo ""

# Endpoint checks
if [ "$VERBOSE" = "-v" ] || [ "$VERBOSE" = "--verbose" ]; then
    echo -e "${BLUE}API Endpoint Tests:${NC}"
    
    endpoints=(
        "/health:Health Check"
        "/api/traces:Traces API"
        "/api/analytics:Analytics API"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        endpoint=$(echo $endpoint_info | cut -d: -f1)
        name=$(echo $endpoint_info | cut -d: -f2)
        
        echo -n "  $name ($endpoint): "
        if curl -sf "http://localhost:$APP_PORT$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
        else
            echo -e "${RED}✗${NC}"
        fi
    done
    
    echo ""
fi

# Summary
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}Overall Status: ✓ All systems operational${NC}"
else
    echo -e "${RED}Overall Status: ✗ Some systems need attention${NC}"
fi
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

if [ "$VERBOSE" != "-v" ] && [ "$VERBOSE" != "--verbose" ]; then
    echo -e "${YELLOW}Run with -v or --verbose for detailed endpoint tests${NC}"
    echo ""
fi

exit $exit_code
