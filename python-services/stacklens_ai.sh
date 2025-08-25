#!/bin/bash

# StackLens AI Microservices - Complete Setup and Launch Script
# This script handles installation, setup, and launching of all AI microservices

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_CMD="python3"
VENV_NAME="stacklens_ai_venv"
LOG_DIR="logs"
SERVICES=(
    "embeddings_service.py:8000"
    "ner_service.py:8001"
    "summarization_service.py:8002"
    "semantic_search_service.py:8003"
    "anomaly_service.py:8004"
    "vector_db_service.py:8005"
    "deep_learning_service.py:8006"
    "active_learning_service.py:8007"
)

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
port_available() {
    ! lsof -i:$1 >/dev/null 2>&1
}

# Function to setup Python environment
setup_environment() {
    print_status "Setting up Python environment..."
    
    # Check Python installation
    if ! command_exists python3; then
        print_error "Python 3 is not installed. Please install Python 3.9+ first."
        exit 1
    fi
    
    # Check Python version
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    print_status "Found Python $PYTHON_VERSION"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "$VENV_NAME" ]; then
        print_status "Creating virtual environment: $VENV_NAME"
        python3 -m venv $VENV_NAME
    fi
    
    # Activate virtual environment
    source $VENV_NAME/bin/activate
    
    # Upgrade pip
    print_status "Upgrading pip..."
    pip install --upgrade pip
    
    # Install requirements
    if [ -f "requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip install -r requirements.txt
    else
        print_error "requirements.txt not found!"
        exit 1
    fi
    
    print_success "Python environment setup complete!"
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check available memory
    if command_exists free; then
        AVAILABLE_MEM=$(free -g | awk 'NR==2{printf "%.0f", $7}')
        if [ $AVAILABLE_MEM -lt 4 ]; then
            print_warning "Available memory: ${AVAILABLE_MEM}GB. Recommended: 8GB+"
        else
            print_success "Available memory: ${AVAILABLE_MEM}GB"
        fi
    fi
    
    # Check disk space
    if command_exists df; then
        AVAILABLE_DISK=$(df -h . | awk 'NR==2{print $4}')
        print_status "Available disk space: $AVAILABLE_DISK"
    fi
    
    # Check for GPU
    if command_exists nvidia-smi; then
        print_success "NVIDIA GPU detected"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
    else
        print_warning "No NVIDIA GPU detected. Using CPU-only mode."
    fi
}

# Function to check port availability
check_ports() {
    print_status "Checking port availability..."
    
    for service in "${SERVICES[@]}"; do
        port=$(echo $service | cut -d':' -f2)
        if port_available $port; then
            print_success "Port $port is available"
        else
            print_error "Port $port is already in use!"
            print_status "You can stop the process using: lsof -ti:$port | xargs kill -9"
            exit 1
        fi
    done
}

# Function to create log directory
setup_logging() {
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p $LOG_DIR
        print_status "Created log directory: $LOG_DIR"
    fi
}

# Function to start services
start_services() {
    print_status "Starting all microservices..."
    
    # Use system Python since venv has issues
    PYTHON_CMD="python3"
    print_status "Using system Python: $(which python3)"
    
    # Create logs directory
    setup_logging
    
    # Start each service
    for service in "${SERVICES[@]}"; do
        service_file=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        service_name=$(basename $service_file .py)
        
        if [ -f "$service_file" ]; then
            print_status "Starting $service_name on port $port..."
            
            # Start service with system python
            nohup $PYTHON_CMD $service_file > $LOG_DIR/${service_name}.log 2>&1 &
            
            echo $! > $LOG_DIR/${service_name}.pid
            sleep 5  # Give service more time to start and download models
            
            # Check if service started successfully
            if [ -f "$LOG_DIR/${service_name}.pid" ] && kill -0 `cat $LOG_DIR/${service_name}.pid` 2>/dev/null; then
                print_success "$service_name started successfully (PID: $(cat $LOG_DIR/${service_name}.pid))"
            else
                print_error "Failed to start $service_name"
                print_status "Check log: $LOG_DIR/${service_name}.log"
                # Show last few lines of log for debugging
                if [ -f "$LOG_DIR/${service_name}.log" ] && [ -s "$LOG_DIR/${service_name}.log" ]; then
                    echo "Last lines from log:"
                    tail -5 $LOG_DIR/${service_name}.log
                fi
            fi
        else
            print_warning "Service file not found: $service_file"
        fi
    done
}

# Function to stop services
stop_services() {
    print_status "Stopping all microservices..."
    
    for service in "${SERVICES[@]}"; do
        service_file=$(echo $service | cut -d':' -f1)
        service_name=$(basename $service_file .py)
        pid_file="$LOG_DIR/${service_name}.pid"
        
        if [ -f "$pid_file" ]; then
            pid=$(cat $pid_file)
            if kill -0 $pid 2>/dev/null; then
                print_status "Stopping $service_name (PID: $pid)..."
                kill $pid
                rm $pid_file
                print_success "$service_name stopped"
            else
                print_warning "$service_name was not running"
                rm $pid_file
            fi
        else
            print_warning "No PID file found for $service_name"
        fi
    done
}

# Function to check service status
check_status() {
    print_status "Checking service status..."
    
    echo "┌────────────────────┬──────┬─────────┬─────────────┐"
    echo "│ Service            │ Port │ Status  │ PID         │"
    echo "├────────────────────┼──────┼─────────┼─────────────┤"
    
    for service in "${SERVICES[@]}"; do
        service_file=$(echo $service | cut -d':' -f1)
        port=$(echo $service | cut -d':' -f2)
        service_name=$(basename $service_file .py)
        pid_file="$LOG_DIR/${service_name}.pid"
        
        # Format service name
        formatted_name=$(printf "%-18s" $service_name)
        
        if [ -f "$pid_file" ]; then
            pid=$(cat $pid_file)
            if kill -0 $pid 2>/dev/null; then
                status="✅ Running"
            else
                status="❌ Dead"
                pid="N/A"
            fi
        else
            status="⭕ Stopped"
            pid="N/A"
        fi
        
        printf "│ %s │ %4s │ %s │ %-11s │\n" "$formatted_name" "$port" "$status" "$pid"
    done
    
    echo "└────────────────────┴──────┴─────────┴─────────────┘"
}

# Function to run tests
run_tests() {
    print_status "Running integration tests..."
    
    if [ -f "integration_test.py" ]; then
        # Activate virtual environment
        source $VENV_NAME/bin/activate
        
        # Wait for services to start
        print_status "Waiting for services to initialize..."
        sleep 10
        
        # Run tests
        $PYTHON_CMD integration_test.py
    else
        print_error "integration_test.py not found!"
    fi
}

# Function to show logs
show_logs() {
    if [ $# -eq 0 ]; then
        print_status "Available log files:"
        ls -la $LOG_DIR/*.log 2>/dev/null || print_warning "No log files found"
        return
    fi
    
    service_name=$1
    log_file="$LOG_DIR/${service_name}.log"
    
    if [ -f "$log_file" ]; then
        print_status "Showing logs for $service_name:"
        tail -f $log_file
    else
        print_error "Log file not found: $log_file"
    fi
}

# Function to display help
show_help() {
    echo "StackLens AI Microservices Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup      - Setup Python environment and install dependencies"
    echo "  start      - Start all microservices"
    echo "  stop       - Stop all microservices"
    echo "  restart    - Restart all microservices"
    echo "  status     - Show status of all services"
    echo "  test       - Run integration tests"
    echo "  logs [SERVICE] - Show logs (all or specific service)"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # Setup environment"
    echo "  $0 start                    # Start all services"
    echo "  $0 logs embeddings_service  # Show embeddings service logs"
    echo "  $0 test                     # Run integration tests"
    echo ""
}

# Main script logic
main() {
    case "${1:-help}" in
        setup)
            check_requirements
            setup_environment
            print_success "Setup complete! You can now run: $0 start"
            ;;
        start)
            check_requirements
            check_ports
            start_services
            echo ""
            print_success "All services started!"
            print_status "Run '$0 status' to check service status"
            print_status "Run '$0 test' to run integration tests"
            ;;
        stop)
            stop_services
            print_success "All services stopped!"
            ;;
        restart)
            stop_services
            sleep 3
            start_services
            print_success "All services restarted!"
            ;;
        status)
            check_status
            ;;
        test)
            run_tests
            ;;
        logs)
            show_logs $2
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Header
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│              StackLens AI Microservices Manager             │"
echo "│                     Advanced ML Platform                    │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Run main function
main "$@"
