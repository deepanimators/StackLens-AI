#!/bin/bash

# StackLens AI - Log Viewer Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs/production"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if logs directory exists
if [ ! -d "$LOG_DIR" ]; then
    echo -e "${YELLOW}No production logs found. Application may not have been started yet.${NC}"
    exit 1
fi

# Get latest log file
LATEST_LOG=$(ls -t "$LOG_DIR"/stacklens_*.log 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
    echo -e "${YELLOW}No log files found in $LOG_DIR${NC}"
    exit 1
fi

# Parse command line arguments
LINES="${1:-50}"
FOLLOW="${2:-}"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}   StackLens AI Production Logs${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Log file:${NC} $LATEST_LOG"
echo ""

# List all log files
echo -e "${BLUE}Available log files:${NC}"
ls -lh "$LOG_DIR"/stacklens_*.log 2>/dev/null | awk '{printf "  %s %s %s\n", $9, $5, $6" "$7}' | sed "s|$LOG_DIR/||"
echo ""

# Show logs
if [ "$FOLLOW" = "-f" ] || [ "$FOLLOW" = "--follow" ]; then
    echo -e "${GREEN}Following logs (Ctrl+C to exit)...${NC}"
    echo -e "${CYAN}───────────────────────────────────────────${NC}"
    tail -f "$LATEST_LOG"
else
    echo -e "${GREEN}Last $LINES lines:${NC}"
    echo -e "${CYAN}───────────────────────────────────────────${NC}"
    tail -n "$LINES" "$LATEST_LOG"
    echo -e "${CYAN}───────────────────────────────────────────${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  ./logs-production.sh [lines] [-f|--follow]"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  ./logs-production.sh          # Show last 50 lines"
    echo -e "  ./logs-production.sh 100      # Show last 100 lines"
    echo -e "  ./logs-production.sh 0 -f     # Follow logs in real-time"
    echo ""
fi

exit 0
