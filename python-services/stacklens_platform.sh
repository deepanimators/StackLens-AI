#!/bin/bash

# StackLens AI Error Analysis Platform
# Production-ready launcher and management script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="StackLens AI Error Analysis Platform"
SERVICE_FILE="stacklens_error_analyzer.py"
TEST_FILE="test_stacklens_platform.py"
PORT=8888
PID_FILE="stacklens_analyzer.pid"
LOG_FILE="stacklens_analyzer.log"

# Banner
print_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   StackLens AI Platform                     ║"
    echo "║               Error Analysis & Intelligence                  ║"
    echo "║                                                              ║"
    echo "║  🧠 Advanced AI-Powered Error Detection                     ║"
    echo "║  🔍 Pattern Recognition & Learning                          ║"
    echo "║  ⚡ Real-time Analysis & Classification                     ║"
    echo "║  🛡️  Security & Performance Monitoring                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if Python and required packages are available
check_dependencies() {
    echo -e "${CYAN}🔍 Checking dependencies...${NC}"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 is not installed${NC}"
        exit 1
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null; then
        echo -e "${RED}❌ pip3 is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Python 3 found: $(python3 --version)${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${CYAN}📦 Installing dependencies...${NC}"
    
    if [ -f "requirements.txt" ]; then
        pip3 install -r requirements.txt
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  requirements.txt not found, installing core dependencies${NC}"
        pip3 install fastapi uvicorn scikit-learn numpy pandas requests
    fi
}

# Setup the platform
setup() {
    print_banner
    echo -e "${BLUE}🚀 Setting up StackLens AI Error Analysis Platform...${NC}"
    
    check_dependencies
    install_dependencies
    
    # Create data directories
    mkdir -p stacklens_data/models
    echo -e "${GREEN}✅ Data directories created${NC}"
    
    echo -e "${GREEN}🎉 StackLens AI Platform setup complete!${NC}"
    echo -e "${CYAN}💡 You can now start the platform with: ./stacklens_platform.sh start${NC}"
}

# Start the service
start_service() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  $SERVICE_NAME is already running (PID: $pid)${NC}"
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    
    echo -e "${BLUE}🚀 Starting $SERVICE_NAME...${NC}"
    
    if [ ! -f "$SERVICE_FILE" ]; then
        echo -e "${RED}❌ Service file $SERVICE_FILE not found${NC}"
        exit 1
    fi
    
    # Start the service in background
    nohup python3 "$SERVICE_FILE" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if service started successfully
    sleep 3
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $SERVICE_NAME started successfully (PID: $pid)${NC}"
        echo -e "${CYAN}🌐 Service available at: http://localhost:$PORT${NC}"
        echo -e "${CYAN}📊 Health check: http://localhost:$PORT/health${NC}"
        echo -e "${CYAN}📋 API docs: http://localhost:$PORT/docs${NC}"
        
        # Show initial status
        sleep 2
        show_status
    else
        echo -e "${RED}❌ Failed to start $SERVICE_NAME${NC}"
        echo -e "${YELLOW}📜 Check logs: tail -f $LOG_FILE${NC}"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Stop the service
stop_service() {
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}⚠️  $SERVICE_NAME is not running${NC}"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo -e "${BLUE}🛑 Stopping $SERVICE_NAME (PID: $pid)...${NC}"
        kill "$pid"
        
        # Wait for graceful shutdown
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Force killing process...${NC}"
            kill -9 "$pid"
        fi
        
        rm -f "$PID_FILE"
        echo -e "${GREEN}✅ $SERVICE_NAME stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  Process not found, cleaning up PID file${NC}"
        rm -f "$PID_FILE"
    fi
}

# Restart the service
restart_service() {
    echo -e "${BLUE}🔄 Restarting $SERVICE_NAME...${NC}"
    stop_service
    sleep 2
    start_service
}

# Show service status
show_status() {
    echo -e "${BLUE}📊 StackLens AI Platform Status${NC}"
    echo "================================"
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}🟢 Status: RUNNING (PID: $pid)${NC}"
            
            # Check if service is responding
            if command -v curl &> /dev/null; then
                local health_check=$(curl -s "http://localhost:$PORT/health" 2>/dev/null || echo "failed")
                if [[ "$health_check" == *"healthy"* ]]; then
                    echo -e "${GREEN}🟢 Health: HEALTHY${NC}"
                    
                    # Extract additional info from health check
                    local corpus_size=$(echo "$health_check" | grep -o '"corpus_size":[0-9]*' | cut -d':' -f2 || echo "unknown")
                    local models_trained=$(echo "$health_check" | grep -o '"models_trained":[a-z]*' | cut -d':' -f2 || echo "unknown")
                    
                    echo -e "${CYAN}📚 Corpus Size: $corpus_size error patterns${NC}"
                    echo -e "${CYAN}🧠 Models Trained: $models_trained${NC}"
                else
                    echo -e "${YELLOW}🟡 Health: SERVICE NOT RESPONDING${NC}"
                fi
            fi
            
            echo -e "${CYAN}🌐 Port: $PORT${NC}"
            echo -e "${CYAN}📁 Log File: $LOG_FILE${NC}"
            echo -e "${CYAN}⏱️  Uptime: $(ps -o etime= -p "$pid" | tr -d ' ')${NC}"
        else
            echo -e "${RED}🔴 Status: STOPPED (stale PID file)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${RED}🔴 Status: STOPPED${NC}"
    fi
    
    echo ""
    echo -e "${PURPLE}🔗 Quick Links:${NC}"
    echo -e "   Health Check: ${CYAN}http://localhost:$PORT/health${NC}"
    echo -e "   API Documentation: ${CYAN}http://localhost:$PORT/docs${NC}"
    echo -e "   Service Info: ${CYAN}http://localhost:$PORT/${NC}"
}

# View logs
view_logs() {
    if [ -f "$LOG_FILE" ]; then
        echo -e "${BLUE}📜 Viewing $SERVICE_NAME logs...${NC}"
        echo -e "${CYAN}Press Ctrl+C to exit${NC}"
        echo "================================"
        tail -f "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠️  Log file $LOG_FILE not found${NC}"
    fi
}

# Run tests
run_tests() {
    echo -e "${BLUE}🧪 Running StackLens AI Platform Tests...${NC}"
    
    if [ ! -f "$TEST_FILE" ]; then
        echo -e "${RED}❌ Test file $TEST_FILE not found${NC}"
        exit 1
    fi
    
    # Check if service is running
    if [ ! -f "$PID_FILE" ]; then
        echo -e "${YELLOW}⚠️  Service not running, starting for tests...${NC}"
        start_service
        sleep 5
    fi
    
    python3 "$TEST_FILE"
}

# Clean up data and logs
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up StackLens AI Platform...${NC}"
    
    stop_service
    
    # Remove logs and PID files
    rm -f "$LOG_FILE" "$PID_FILE"
    echo -e "${GREEN}✅ Cleaned up log and PID files${NC}"
    
    # Ask about data directory
    echo -e "${YELLOW}⚠️  Do you want to remove the data directory (stacklens_data)? This will delete all learned patterns! [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf stacklens_data
        echo -e "${GREEN}✅ Data directory removed${NC}"
    else
        echo -e "${CYAN}📚 Data directory preserved${NC}"
    fi
}

# Monitor the service
monitor() {
    echo -e "${BLUE}📊 Monitoring StackLens AI Platform...${NC}"
    echo -e "${CYAN}Press Ctrl+C to exit monitoring${NC}"
    echo "================================"
    
    while true; do
        clear
        print_banner
        show_status
        
        if command -v curl &> /dev/null; then
            echo ""
            echo -e "${PURPLE}📈 Recent Activity:${NC}"
            
            # Try to get some basic stats
            local stats=$(curl -s "http://localhost:$PORT/get-corpus-stats" 2>/dev/null || echo "failed")
            if [[ "$stats" == *"total_patterns"* ]]; then
                echo -e "${CYAN}🔍 Monitoring corpus and model performance...${NC}"
                # You could extract and display more detailed stats here
            fi
        fi
        
        sleep 10
    done
}

# Show help
show_help() {
    print_banner
    echo -e "${BLUE}StackLens AI Error Analysis Platform - Management Commands${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC} $0 [command]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  setup       - Install dependencies and setup the platform"
    echo "  start       - Start the error analysis service"
    echo "  stop        - Stop the error analysis service"
    echo "  restart     - Restart the error analysis service"
    echo "  status      - Show service status and health"
    echo "  logs        - View real-time service logs"
    echo "  test        - Run comprehensive platform tests"
    echo "  monitor     - Monitor service in real-time"
    echo "  cleanup     - Stop service and clean up files"
    echo "  help        - Show this help message"
    echo ""
    echo -e "${PURPLE}Examples:${NC}"
    echo "  $0 setup      # First time setup"
    echo "  $0 start      # Start the platform"
    echo "  $0 test       # Test all functionality"
    echo "  $0 status     # Check if running"
    echo ""
    echo -e "${CYAN}🔗 After starting, access the platform at: http://localhost:$PORT${NC}"
}

# Main command handler
case "${1:-help}" in
    setup)
        setup
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        view_logs
        ;;
    test)
        run_tests
        ;;
    monitor)
        monitor
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
