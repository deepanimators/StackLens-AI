#!/bin/bash

# Bootstrap script for StackLens OTel pipeline
# Usage: ./infra/bootstrap.sh [up|down|restart|logs|health]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
COMPOSE_DIR="$SCRIPT_DIR/compose"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
  echo -e "${BLUE}==== $1 ====${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

check_docker() {
  if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
  fi

  if ! docker ps &> /dev/null; then
    print_error "Docker daemon is not running or you lack permissions"
    exit 1
  fi

  print_success "Docker is available"
}

check_docker_compose() {
  if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed"
    exit 1
  fi

  print_success "docker-compose is available"
}

up() {
  print_header "Starting StackLens OTel Pipeline Stack"
  
  cd "$COMPOSE_DIR"
  
  print_header "Starting services..."
  docker-compose up -d
  
  print_header "Waiting for services to be ready..."
  
  # Wait for key services
  declare -a services=("otel-collector" "elasticsearch" "kafka" "postgres")
  
  for service in "${services[@]}"; do
    print_warning "Waiting for $service..."
    
    # Use docker-compose logs to check if service is ready
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
      if docker-compose logs "$service" 2>/dev/null | grep -qi "ready\|listening\|started\|running" || docker-compose ps "$service" 2>/dev/null | grep -qi "healthy\|running"; then
        print_success "$service is ready"
        break
      fi
      
      attempt=$((attempt + 1))
      sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
      print_warning "$service startup check timed out (but it may still be running)"
    fi
  done
  
  print_header "Health Check Results"
  docker-compose ps
  
  print_success "Stack is up!"
  
  print_header "Service URLs:"
  echo "  OTLP Collector (HTTP):    http://localhost:4318"
  echo "  Elasticsearch:            http://localhost:9200"
  echo "  Kibana:                   http://localhost:5601"
  echo "  Jaeger:                   http://localhost:16686"
  echo "  Kafka:                    localhost:9092"
  echo "  PostgreSQL:               localhost:5432"
  echo "  Redis:                    localhost:6379"
  echo ""
  print_warning "Default PostgreSQL credentials: stacklens / stacklens_dev"
}

down() {
  print_header "Stopping StackLens OTel Pipeline Stack"
  cd "$COMPOSE_DIR"
  docker-compose down
  print_success "Stack stopped"
}

restart() {
  print_header "Restarting StackLens OTel Pipeline Stack"
  down
  sleep 2
  up
}

logs() {
  cd "$COMPOSE_DIR"
  service=${1:-""}
  
  if [ -z "$service" ]; then
    docker-compose logs -f
  else
    docker-compose logs -f "$service"
  fi
}

health() {
  print_header "Checking StackLens Stack Health"
  cd "$COMPOSE_DIR"
  
  echo "Docker Compose Status:"
  docker-compose ps
  
  echo ""
  echo "Service Endpoints:"
  echo -n "OTLP Collector: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:4318/v1/logs 2>/dev/null || echo "FAIL"
  
  echo -n "Elasticsearch: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:9200/_cluster/health 2>/dev/null || echo "FAIL"
  
  echo -n "Kibana: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:5601/api/status 2>/dev/null || echo "FAIL"
  
  echo -n "Jaeger: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:16686/api/services 2>/dev/null || echo "FAIL"
  
  echo -n "PostgreSQL: "
  if docker-compose exec -T postgres pg_isready -U stacklens > /dev/null 2>&1; then
    echo "OK"
  else
    echo "FAIL"
  fi
  
  echo ""
  echo "Kafka Topics:"
  if docker exec $(docker-compose ps -q kafka) kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | head -10; then
    :
  else
    echo "  (unable to list topics)"
  fi
}

clean() {
  print_header "Cleaning up StackLens Stack"
  cd "$COMPOSE_DIR"
  
  print_warning "This will remove all data volumes!"
  read -p "Are you sure? (yes/no): " -r
  echo
  
  if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    docker-compose down -v
    print_success "Stack cleaned"
  else
    print_warning "Cleanup cancelled"
  fi
}

main() {
  check_docker
  check_docker_compose
  
  command=${1:-"up"}
  
  case "$command" in
    up)
      up
      ;;
    down)
      down
      ;;
    restart)
      restart
      ;;
    logs)
      logs "${2:-}"
      ;;
    health)
      health
      ;;
    clean)
      clean
      ;;
    *)
      echo "Usage: $0 {up|down|restart|logs|health|clean} [service]"
      echo ""
      echo "Commands:"
      echo "  up       - Start all services"
      echo "  down     - Stop all services"
      echo "  restart  - Restart all services"
      echo "  logs     - View logs (optionally for a specific service)"
      echo "  health   - Check health of all services"
      echo "  clean    - Stop services and remove all volumes"
      exit 1
      ;;
  esac
}

main "$@"
