#!/bin/bash

# StackLens AI - Status Check Script

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/stacklens.pid"
APP_PORT="${APP_PORT:-4000}"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   StackLens AI Production Status${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Check application status
echo -e "${BLUE}Application Status:${NC}"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        echo -e "  Status:   ${GREEN}● Running${NC}"
        echo -e "  PID:      $PID"
        
        # Get process info
        MEM=$(ps -p $PID -o %mem= | xargs)
        CPU=$(ps -p $PID -o %cpu= | xargs)
        UPTIME=$(ps -p $PID -o etime= | xargs)
        
        echo -e "  Memory:   ${MEM}%"
        echo -e "  CPU:      ${CPU}%"
        echo -e "  Uptime:   $UPTIME"
        
        # Health check
        if curl -sf http://localhost:$APP_PORT/health > /dev/null 2>&1; then
            echo -e "  Health:   ${GREEN}✓ Healthy${NC}"
        else
            echo -e "  Health:   ${RED}✗ Unhealthy${NC}"
        fi
        
        echo -e "  URL:      http://localhost:$APP_PORT"
    else
        echo -e "  Status:   ${RED}● Stopped${NC} (stale PID file)"
    fi
else
    echo -e "  Status:   ${RED}● Stopped${NC}"
fi

echo ""

# Check infrastructure status
echo -e "${BLUE}Infrastructure Status:${NC}"

services=("zookeeper" "kafka" "postgres" "elasticsearch")
for service in "${services[@]}"; do
    if docker ps --filter "name=stacklens-$service" --filter "status=running" | grep -q "stacklens-$service"; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "stacklens-$service" 2>/dev/null || echo "unknown")
        
        if [ "$health" = "healthy" ]; then
            echo -e "  $service: ${GREEN}● Running (healthy)${NC}"
        elif [ "$health" = "unhealthy" ]; then
            echo -e "  $service: ${RED}● Running (unhealthy)${NC}"
        else
            echo -e "  $service: ${YELLOW}● Running${NC}"
        fi
    else
        echo -e "  $service: ${RED}● Stopped${NC}"
    fi
done

echo ""

# Check ports
echo -e "${BLUE}Port Status:${NC}"
ports=("2181:Zookeeper" "9094:Kafka" "5432:Postgres" "9200:Elasticsearch" "4000:StackLens")
for port_info in "${ports[@]}"; do
    port=$(echo $port_info | cut -d: -f1)
    name=$(echo $port_info | cut -d: -f2)
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  $port ($name): ${GREEN}● Listening${NC}"
    else
        echo -e "  $port ($name): ${RED}● Not listening${NC}"
    fi
done

echo ""

# Resource usage
echo -e "${BLUE}System Resources:${NC}"
if command -v free &> /dev/null; then
    MEM_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
    MEM_USED=$(free -h | awk '/^Mem:/ {print $3}')
    MEM_FREE=$(free -h | awk '/^Mem:/ {print $4}')
    echo -e "  Memory:   $MEM_USED / $MEM_TOTAL used ($MEM_FREE free)"
fi

if command -v df &> /dev/null; then
    DISK_INFO=$(df -h "$SCRIPT_DIR" | tail -1)
    DISK_USED=$(echo $DISK_INFO | awk '{print $3}')
    DISK_TOTAL=$(echo $DISK_INFO | awk '{print $2}')
    DISK_AVAIL=$(echo $DISK_INFO | awk '{print $4}')
    DISK_PERCENT=$(echo $DISK_INFO | awk '{print $5}')
    echo -e "  Disk:     $DISK_USED / $DISK_TOTAL used ($DISK_AVAIL available, $DISK_PERCENT)"
fi

LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | xargs)
echo -e "  Load:     $LOAD_AVG"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Show recent logs if application is running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        LOG_DIR="$SCRIPT_DIR/logs/production"
        LATEST_LOG=$(ls -t "$LOG_DIR"/stacklens_*.log 2>/dev/null | head -1)
        
        if [ -n "$LATEST_LOG" ]; then
            echo -e "${YELLOW}Recent Logs (last 10 lines):${NC}"
            echo -e "${CYAN}───────────────────────────────────────────${NC}"
            tail -10 "$LATEST_LOG" | sed 's/^/  /'
            echo -e "${CYAN}───────────────────────────────────────────${NC}"
            echo ""
            echo -e "Full logs: tail -f $LATEST_LOG"
            echo ""
        fi
    fi
fi

exit 0
