#!/bin/bash

################################################################################
# StackLens AI - Production Deployment Script
# 
# This script handles complete production deployment including:
# - Infrastructure setup (Kafka, Postgres, Elasticsearch, etc.)
# - Application build and deployment
# - Health checks and validation
# - Environment configuration
#
# Usage: ./deploy-production.sh [options]
#   Options:
#     --skip-infra    Skip infrastructure setup
#     --skip-build    Skip application build
#     --port <port>   Custom port for application (default: 4000)
#     --help          Show this help message
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
INFRA_DIR="$PROJECT_ROOT/infra"
DIST_DIR="$PROJECT_ROOT/dist"
LOG_DIR="$PROJECT_ROOT/logs/production"
PID_FILE="$PROJECT_ROOT/stacklens.pid"
APP_PORT="${APP_PORT:-4000}"
SKIP_INFRA=false
SKIP_BUILD=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-infra)
            SKIP_INFRA=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --port)
            APP_PORT="$2"
            shift 2
            ;;
        --help)
            head -n 20 "$0" | tail -n +3
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo ""
    echo -e "${CYAN}================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}================================${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    check_command "node"
    check_command "npm"
    check_command "docker"
    
    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js 18 or higher is required (current: $(node -v))"
        exit 1
    fi
    log_success "Node.js version: $(node -v)"
    
    # Check Docker
    if ! docker ps &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    log_success "Docker is running"
    
    # Check disk space (need at least 5GB)
    AVAILABLE_SPACE=$(df -BG "$PROJECT_ROOT" | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        log_warn "Low disk space: ${AVAILABLE_SPACE}GB available (5GB recommended)"
    else
        log_success "Disk space: ${AVAILABLE_SPACE}GB available"
    fi
}

# Setup infrastructure
setup_infrastructure() {
    if [ "$SKIP_INFRA" = true ]; then
        log_warn "Skipping infrastructure setup (--skip-infra flag)"
        return
    fi
    
    log_section "Setting Up Infrastructure"
    
    cd "$INFRA_DIR"
    
    # Check if .env.docker exists, create from example if not
    if [ ! -f ".env.docker" ]; then
        log_info "Creating .env.docker from template..."
        cat > .env.docker << EOF
KAFKA_EXTERNAL_HOST=localhost
POSTGRES_USER=stacklens
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=stacklens
ES_JAVA_OPTS=-Xms512m -Xmx512m
EOF
        log_success "Created .env.docker"
    fi
    
    # Load environment variables
    export $(cat .env.docker | grep -v '^#' | xargs)
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down 2>/dev/null || true
    
    # Pull latest images
    log_info "Pulling Docker images (this may take a few minutes)..."
    docker-compose pull
    
    # Start infrastructure
    log_info "Starting infrastructure services..."
    docker-compose up -d
    
    if [ $? -ne 0 ]; then
        log_error "Failed to start infrastructure"
        exit 1
    fi
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    
    services=("zookeeper" "kafka" "elasticsearch" "postgres")
    max_wait=120  # 2 minutes
    
    for service in "${services[@]}"; do
        log_info "Checking $service..."
        elapsed=0
        healthy=false
        
        while [ $elapsed -lt $max_wait ]; do
            health=$(docker inspect --format='{{.State.Health.Status}}' "stacklens-$service" 2>/dev/null || echo "starting")
            
            if [ "$health" = "healthy" ]; then
                log_success "$service is healthy"
                healthy=true
                break
            elif [ "$health" = "unhealthy" ]; then
                log_error "$service is unhealthy"
                docker logs "stacklens-$service" --tail 20
                exit 1
            else
                sleep 5
                elapsed=$((elapsed + 5))
            fi
        done
        
        if [ "$healthy" = false ]; then
            log_error "Timeout waiting for $service to become healthy"
            docker logs "stacklens-$service" --tail 20
            exit 1
        fi
    done
    
    cd "$PROJECT_ROOT"
    log_success "Infrastructure is ready"
}

# Setup environment
setup_environment() {
    log_section "Setting Up Environment"
    
    # Create production .env if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_info "Creating production .env file..."
        
        # Generate secure secrets
        JWT_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        
        cat > "$PROJECT_ROOT/.env" << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=$APP_PORT

# Database
DATABASE_URL=file:./data/database/stacklens.db
POSTGRES_URL=postgresql://stacklens:password@localhost:5432/stacklens

# Kafka
KAFKA_BROKERS=localhost:9094

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# AI Services
GEMINI_API_KEY=${GEMINI_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# URLs
CLIENT_URL=http://localhost:5173
API_URL=http://localhost:$APP_PORT

# Feature Flags
ENABLE_AI_ANALYSIS=true
ENABLE_TELEMETRY=true
ENABLE_KAFKA=true

# Logging
LOG_LEVEL=info
LOG_DIR=./logs/production
EOF
        log_success "Created .env file"
    else
        # Update NODE_ENV to production
        sed -i.bak 's/NODE_ENV=.*/NODE_ENV=production/' "$PROJECT_ROOT/.env"
        log_success "Updated .env to production mode"
    fi
    
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$PROJECT_ROOT/data/database"
    mkdir -p "$PROJECT_ROOT/uploads"
    
    log_success "Environment configured"
}

# Install dependencies
install_dependencies() {
    log_section "Installing Dependencies"
    
    cd "$PROJECT_ROOT"
    
    # Check if node_modules exists and is recent
    if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
        NODE_MODULES_TIME=$(stat -f %m "node_modules" 2>/dev/null || stat -c %Y "node_modules")
        PACKAGE_JSON_TIME=$(stat -f %m "package.json" 2>/dev/null || stat -c %Y "package.json")
        
        if [ "$NODE_MODULES_TIME" -gt "$PACKAGE_JSON_TIME" ]; then
            log_info "Dependencies are up to date"
            return
        fi
    fi
    
    log_info "Installing production dependencies..."
    npm ci --only=production
    
    log_success "Dependencies installed"
}

# Build application
build_application() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warn "Skipping application build (--skip-build flag)"
        return
    fi
    
    log_section "Building Application"
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    if [ -d "$DIST_DIR" ]; then
        log_info "Cleaning previous build..."
        rm -rf "$DIST_DIR"
    fi
    
    # Build client
    log_info "Building frontend..."
    npm run build:client
    
    if [ $? -ne 0 ]; then
        log_error "Frontend build failed"
        exit 1
    fi
    log_success "Frontend built successfully"
    
    # Build server
    log_info "Building backend..."
    npm run build:server
    
    if [ $? -ne 0 ]; then
        log_error "Backend build failed"
        exit 1
    fi
    log_success "Backend built successfully"
    
    # Copy necessary files
    log_info "Copying runtime files..."
    cp -r "$PROJECT_ROOT/data" "$DIST_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/.env" "$DIST_DIR/" 2>/dev/null || true
    
    log_success "Build completed"
}

# Setup database
setup_database() {
    log_section "Setting Up Database"
    
    cd "$PROJECT_ROOT"
    
    # Check if database exists
    if [ ! -f "$PROJECT_ROOT/data/database/stacklens.db" ]; then
        log_info "Initializing database..."
        
        # Run migrations
        npm run db:push
        
        if [ $? -ne 0 ]; then
            log_warn "Database migration failed, will initialize on first run"
        else
            log_success "Database initialized"
        fi
    else
        log_info "Database already exists"
        
        # Run migrations to update schema
        log_info "Running migrations..."
        npm run db:push || log_warn "Migration failed, continuing..."
    fi
}

# Stop existing application
stop_application() {
    log_info "Stopping existing application..."
    
    # Check if PID file exists
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        
        if kill -0 "$OLD_PID" 2>/dev/null; then
            log_info "Stopping process $OLD_PID..."
            kill "$OLD_PID"
            
            # Wait for process to stop
            for i in {1..10}; do
                if ! kill -0 "$OLD_PID" 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # Force kill if still running
            if kill -0 "$OLD_PID" 2>/dev/null; then
                log_warn "Force killing process $OLD_PID..."
                kill -9 "$OLD_PID"
            fi
            
            log_success "Stopped old application"
        fi
        
        rm -f "$PID_FILE"
    fi
    
    # Also check port
    if lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "Port $APP_PORT is still in use, attempting to free it..."
        lsof -ti:$APP_PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Start application
start_application() {
    log_section "Starting Application"
    
    cd "$PROJECT_ROOT"
    
    # Create log file
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    LOG_FILE="$LOG_DIR/stacklens_${TIMESTAMP}.log"
    
    log_info "Starting StackLens on port $APP_PORT..."
    log_info "Logs: $LOG_FILE"
    
    # Start application in background
    # Bind to all interfaces (0.0.0.0) for external access
    NODE_ENV=production PORT=$APP_PORT HOST=0.0.0.0 nohup node dist/index.js > "$LOG_FILE" 2>&1 &
    APP_PID=$!
    
    # Save PID
    echo $APP_PID > "$PID_FILE"
    
    # Wait for application to start
    log_info "Waiting for application to start (PID: $APP_PID)..."
    sleep 5
    
    # Check if process is still running
    if ! kill -0 $APP_PID 2>/dev/null; then
        log_error "Application failed to start"
        log_error "Check logs: tail -f $LOG_FILE"
        exit 1
    fi
    
    # Health check
    log_info "Performing health check..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf http://localhost:$APP_PORT/health > /dev/null 2>&1; then
            log_success "Application is healthy"
            break
        fi
        
        # Check if process died
        if ! kill -0 $APP_PID 2>/dev/null; then
            log_error "Application process died"
            log_error "Check logs: tail -f $LOG_FILE"
            exit 1
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "Health check timeout"
        log_error "Application may not be responding correctly"
        log_error "Check logs: tail -f $LOG_FILE"
        exit 1
    fi
}

# Display deployment info
display_info() {
    log_section "Deployment Complete"
    
    echo ""
    echo -e "${GREEN}✅ StackLens AI is now running in production mode${NC}"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}📊 Application Info${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "  ${BLUE}Process ID:${NC}      $(cat $PID_FILE)"
    echo -e "  ${BLUE}Application:${NC}     http://localhost:$APP_PORT"
    echo -e "  ${BLUE}Health Check:${NC}    http://localhost:$APP_PORT/health"
    echo -e "  ${BLUE}API Docs:${NC}        http://localhost:$APP_PORT/api"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}📦 Infrastructure${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "  ${BLUE}Kafka:${NC}           localhost:9094"
    echo -e "  ${BLUE}PostgreSQL:${NC}      localhost:5432"
    echo -e "  ${BLUE}Elasticsearch:${NC}   http://localhost:9200"
    echo -e "  ${BLUE}Kibana:${NC}          http://localhost:5601"
    echo -e "  ${BLUE}Jaeger:${NC}          http://localhost:16686"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}🔧 Management Commands${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "  ${BLUE}View Logs:${NC}       tail -f $LOG_DIR/stacklens_*.log"
    echo -e "  ${BLUE}Stop:${NC}            ./stop-production.sh"
    echo -e "  ${BLUE}Restart:${NC}         ./restart-production.sh"
    echo -e "  ${BLUE}Status:${NC}          ./status-production.sh"
    echo -e "  ${BLUE}Health:${NC}          curl http://localhost:$APP_PORT/health"
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next Steps:${NC}"
    echo -e "  1. Configure your AI API keys in .env"
    echo -e "  2. Set up SSL/TLS for production"
    echo -e "  3. Configure your domain and DNS"
    echo -e "  4. Set up monitoring and alerts"
    echo -e "  5. Configure backups"
    echo ""
}

# Main deployment flow
main() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════╗"
    echo "║   StackLens AI Production Deployment       ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    setup_infrastructure
    setup_environment
    install_dependencies
    build_application
    setup_database
    stop_application
    start_application
    display_info
}

# Run main function
main

exit 0
