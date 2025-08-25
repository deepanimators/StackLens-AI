#!/bin/bash

# StackLens Enterprise Error Intelligence Platform
# Production deployment and management script

set -e

PLATFORM_NAME="StackLens Enterprise Error Intelligence"
PLATFORM_VERSION="2.0.0"
SERVICE_PORT=8889
SERVICE_FILE="enterprise_error_intelligence.py"
TEST_FILE="test_enterprise_intelligence.py"
PID_FILE="enterprise_intelligence.pid"
LOG_FILE="logs/enterprise_intelligence.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

print_header() {
    echo -e "${CYAN}"
    echo "========================================================================"
    echo "  🧠 $PLATFORM_NAME v$PLATFORM_VERSION"
    echo "     Advanced AI-Powered Error Detection & Analysis Platform"
    echo "========================================================================"
    echo -e "${NC}"
}

print_usage() {
    echo -e "${YELLOW}Usage: $0 {setup|start|stop|restart|status|test|clean|help}${NC}"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  setup     - Install dependencies and prepare environment"
    echo "  start     - Start the enterprise intelligence platform"
    echo "  stop      - Stop the platform"
    echo "  restart   - Restart the platform"
    echo "  status    - Check platform status"
    echo "  test      - Run comprehensive test suite"
    echo "  clean     - Clean up data and logs"
    echo "  help      - Show this help message"
    echo ""
    echo -e "${BLUE}Platform Features:${NC}"
    echo "  • Comprehensive error corpus (1000+ patterns)"
    echo "  • Multi-language support (Python, JavaScript, Java, C/C++, SQL)"
    echo "  • Intelligent classification and severity assessment"
    echo "  • Anomaly detection for unknown error patterns"
    echo "  • Continuous learning from new error patterns"
    echo "  • Risk assessment and actionable recommendations"
    echo "  • Enterprise-grade security and performance monitoring"
}

check_dependencies() {
    echo -e "${BLUE}🔍 Checking dependencies...${NC}"
    
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
    
    echo -e "${GREEN}✅ Python and pip are available${NC}"
}

setup_environment() {
    print_header
    echo -e "${BLUE}🚀 Setting up Enterprise Error Intelligence Platform...${NC}"
    
    check_dependencies
    
    # Install Python dependencies
    echo -e "${BLUE}📦 Installing Python dependencies...${NC}"
    pip3 install -q fastapi uvicorn scikit-learn numpy pandas requests &
    
    # Show progress
    while kill -0 $! 2>/dev/null; do
        echo -n "."
        sleep 1
    done
    echo ""
    
    wait
    
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    echo -e "${GREEN}✅ Environment setup complete${NC}"
}

start_platform() {
    echo -e "${BLUE}🚀 Starting $PLATFORM_NAME...${NC}"
    
    # Check if already running
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Platform is already running (PID: $(cat $PID_FILE))${NC}"
        return
    fi
    
    # Start the platform
    echo -e "${BLUE}📊 Initializing enterprise error corpus and ML models...${NC}"
    nohup python3 "$SERVICE_FILE" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    # Wait for startup
    echo -e "${BLUE}⏳ Waiting for platform to initialize...${NC}"
    sleep 5
    
    # Check if it's running
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        # Test health endpoint
        if curl -s -f "http://localhost:$SERVICE_PORT/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $PLATFORM_NAME started successfully!${NC}"
            echo -e "${CYAN}🌐 Platform available at: http://localhost:$SERVICE_PORT${NC}"
            echo -e "${CYAN}📊 Health check: http://localhost:$SERVICE_PORT/health${NC}"
            echo -e "${CYAN}📈 Corpus stats: http://localhost:$SERVICE_PORT/corpus/stats${NC}"
            show_status
        else
            echo -e "${RED}❌ Platform started but health check failed${NC}"
            echo -e "${YELLOW}Check logs: $LOG_FILE${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to start platform${NC}"
        echo -e "${YELLOW}Check logs: $LOG_FILE${NC}"
        rm -f "$PID_FILE"
    fi
}

stop_platform() {
    echo -e "${BLUE}🛑 Stopping $PLATFORM_NAME...${NC}"
    
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        kill $(cat "$PID_FILE")
        rm -f "$PID_FILE"
        echo -e "${GREEN}✅ Platform stopped successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Platform is not running${NC}"
    fi
    
    # Kill any remaining processes
    pkill -f "$SERVICE_FILE" 2>/dev/null || true
}

restart_platform() {
    echo -e "${BLUE}🔄 Restarting $PLATFORM_NAME...${NC}"
    stop_platform
    sleep 2
    start_platform
}

show_status() {
    echo -e "${BLUE}📊 Platform Status:${NC}"
    
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}✅ Status: Running (PID: $PID)${NC}"
        
        # Get health status
        if command -v curl &> /dev/null; then
            echo -e "${BLUE}🏥 Health Check:${NC}"
            if curl -s -f "http://localhost:$SERVICE_PORT/health" | python3 -m json.tool 2>/dev/null; then
                echo ""
            else
                echo -e "${RED}❌ Health check failed${NC}"
            fi
        fi
        
        # Show resource usage
        if command -v ps &> /dev/null; then
            CPU_MEM=$(ps -p $PID -o %cpu,%mem --no-headers 2>/dev/null || echo "N/A N/A")
            echo -e "${BLUE}💻 Resource Usage: CPU: $(echo $CPU_MEM | cut -d' ' -f1)% | Memory: $(echo $CPU_MEM | cut -d' ' -f2)%${NC}"
        fi
    else
        echo -e "${RED}❌ Status: Not Running${NC}"
        rm -f "$PID_FILE" 2>/dev/null
    fi
}

run_tests() {
    print_header
    echo -e "${BLUE}🧪 Running Comprehensive Test Suite...${NC}"
    
    # Check if platform is running
    if ! [ -f "$PID_FILE" ] || ! kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Platform is not running. Starting it first...${NC}"
        start_platform
        sleep 3
    fi
    
    # Run tests
    if [ -f "$TEST_FILE" ]; then
        echo -e "${BLUE}🎯 Executing enterprise intelligence validation...${NC}"
        python3 "$TEST_FILE"
    else
        echo -e "${RED}❌ Test file not found: $TEST_FILE${NC}"
        exit 1
    fi
}

clean_platform() {
    echo -e "${BLUE}🧹 Cleaning up platform data...${NC}"
    
    # Stop platform first
    stop_platform
    
    # Clean up data
    echo -e "${BLUE}🗑️  Removing data directories...${NC}"
    rm -rf enterprise_intelligence_data/
    rm -f "$LOG_FILE"
    rm -f "$PID_FILE"
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

show_platform_info() {
    print_header
    echo -e "${BLUE}📋 Platform Information:${NC}"
    echo -e "${CYAN}   Platform: $PLATFORM_NAME${NC}"
    echo -e "${CYAN}   Version: $PLATFORM_VERSION${NC}"
    echo -e "${CYAN}   Service Port: $SERVICE_PORT${NC}"
    echo -e "${CYAN}   Service File: $SERVICE_FILE${NC}"
    echo -e "${CYAN}   PID File: $PID_FILE${NC}"
    echo -e "${CYAN}   Log File: $LOG_FILE${NC}"
    echo ""
    echo -e "${BLUE}🎯 Capabilities:${NC}"
    echo -e "${GREEN}   ✅ Comprehensive error corpus (1000+ patterns)${NC}"
    echo -e "${GREEN}   ✅ Multi-language support (8+ languages)${NC}"
    echo -e "${GREEN}   ✅ Multi-framework detection (20+ frameworks)${NC}"
    echo -e "${GREEN}   ✅ Intelligent classification using ML${NC}"
    echo -e "${GREEN}   ✅ Anomaly detection for unknown patterns${NC}"
    echo -e "${GREEN}   ✅ Continuous learning capabilities${NC}"
    echo -e "${GREEN}   ✅ Risk assessment and recommendations${NC}"
    echo -e "${GREEN}   ✅ Enterprise security monitoring${NC}"
    echo -e "${GREEN}   ✅ Performance optimization insights${NC}"
    echo ""
    show_status
}

# Main script logic
case "${1:-help}" in
    "setup")
        setup_environment
        ;;
    "start")
        print_header
        start_platform
        ;;
    "stop")
        print_header
        stop_platform
        ;;
    "restart")
        print_header
        restart_platform
        ;;
    "status")
        print_header
        show_status
        ;;
    "test")
        run_tests
        ;;
    "clean")
        print_header
        clean_platform
        ;;
    "info")
        show_platform_info
        ;;
    "help"|*)
        print_header
        print_usage
        ;;
esac
