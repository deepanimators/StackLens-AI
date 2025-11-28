#!/bin/bash

# StackLens AI - Stop Production Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/stacklens.pid"
APP_PORT="${APP_PORT:-4000}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo -e "${YELLOW}🛑 Stopping StackLens AI Production${NC}"
echo ""

# Stop application
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        log_info "Stopping StackLens (PID: $PID)..."
        kill "$PID"
        
        # Wait for graceful shutdown
        for i in {1..15}; do
            if ! kill -0 "$PID" 2>/dev/null; then
                log_success "Application stopped gracefully"
                rm -f "$PID_FILE"
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            log_error "Graceful shutdown timeout, force killing..."
            kill -9 "$PID"
            rm -f "$PID_FILE"
            log_success "Application stopped (forced)"
        fi
    else
        log_info "Application is not running (stale PID file)"
        rm -f "$PID_FILE"
    fi
else
    log_info "No PID file found"
fi

# Check and kill process on port if still running
if lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_info "Cleaning up process on port $APP_PORT..."
    lsof -ti:$APP_PORT | xargs kill -9 2>/dev/null || true
    log_success "Port $APP_PORT freed"
fi

echo ""
log_success "StackLens has been stopped"
echo ""
echo "To stop infrastructure (Kafka, Postgres, etc.):"
echo "  cd infra && docker-compose down"
echo ""

exit 0
