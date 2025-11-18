# Docker Compose: Phase 1 Test Stack

Complete Docker Compose configuration for testing Phase 1 locally and in CI.

## Files to Create/Update

### File: `docker-compose.test.yml`

This file is for running tests locally and in CI. Services are optimized for testing (minimal resources, in-memory where possible).

```yaml
version: '3.8'

services:
  # PostgreSQL - primary database for alerts
  postgres:
    image: postgres:15-alpine
    container_name: stacklens-postgres-test
    environment:
      POSTGRES_DB: stacklens_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_INITDB_ARGS: "-c log_statement=all"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_test:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - stacklens-test

  # Zookeeper - required for Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: stacklens-zookeeper-test
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_SYNC_LIMIT: 2
      ZOOKEEPER_INIT_LIMIT: 5
    ports:
      - "2181:2181"
    networks:
      - stacklens-test
    healthcheck:
      test: ["CMD", "echo", "ruok", "|", "nc", "localhost", "2181"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Kafka - event streaming
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: stacklens-kafka-test
    depends_on:
      zookeeper:
        condition: service_healthy
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:29092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
      KAFKA_LOG_RETENTION_HOURS: 1
    ports:
      - "9092:9092"
      - "29092:29092"
    networks:
      - stacklens-test
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions.sh", "--bootstrap-server", "localhost:9092"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - kafka_data_test:/var/lib/kafka/data

  # Redis - for caching (optional for Phase 1)
  redis:
    image: redis:7-alpine
    container_name: stacklens-redis-test
    ports:
      - "6379:6379"
    networks:
      - stacklens-test
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Logs Ingest API - FastAPI service
  logs-ingest:
    build:
      context: ./python-services
      dockerfile: Dockerfile
      args:
        - PYTHON_VERSION=3.9
    container_name: stacklens-logs-ingest-test
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
    environment:
      POSTGRES_URL: postgresql://postgres:postgres@postgres:5432/stacklens_test
      KAFKA_BROKERS: kafka:9092
      LOG_LEVEL: DEBUG
      NODE_ENV: test
      PORT: 8001
    ports:
      - "8001:8001"
    networks:
      - stacklens-test
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - ./python-services:/app
    command: |
      bash -c "
        pip install -e . &&
        uvicorn logs_ingest_service:app --host 0.0.0.0 --port 8001 --reload
      "

  # Consumer Service - processes logs and creates alerts
  consumer:
    build:
      context: ./python-services
      dockerfile: Dockerfile
      args:
        - PYTHON_VERSION=3.9
    container_name: stacklens-consumer-test
    depends_on:
      postgres:
        condition: service_healthy
      kafka:
        condition: service_healthy
    environment:
      POSTGRES_URL: postgresql://postgres:postgres@postgres:5432/stacklens_test
      KAFKA_BROKERS: kafka:9092
      LOG_LEVEL: DEBUG
      NODE_ENV: test
    networks:
      - stacklens-test
    volumes:
      - ./python-services:/app
    command: |
      bash -c "
        pip install -e . &&
        python consumer_service.py
      "
    restart: unless-stopped

  # POS Demo Service - Node/Express
  pos-demo:
    build:
      context: ./demo-pos-app
      dockerfile: Dockerfile
    container_name: stacklens-pos-demo-test
    environment:
      NODE_ENV: test
      LOG_LEVEL: debug
      PORT: 3001
    ports:
      - "3001:3001"
    networks:
      - stacklens-test
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - ./demo-pos-app/logs:/app/logs

  # Frontend (optional, for UI testing)
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=http://localhost:3000/api
    container_name: stacklens-web-test
    environment:
      NODE_ENV: test
      VITE_API_URL: http://localhost:3000/api
    ports:
      - "5173:5173"
    networks:
      - stacklens-test
    depends_on:
      - pos-demo
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  stacklens-test:
    driver: bridge

volumes:
  postgres_data_test:
  kafka_data_test:
```

### File: `scripts/init-db.sql`

Initialize database schema for testing:

```sql
-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(36) PRIMARY KEY,
    issue_code VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    suggested_fix TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    raw_log JSONB,
    status VARCHAR(50) DEFAULT 'NEW' NOT NULL,
    jira_issue_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_issue_code ON alerts(issue_code);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_jira_key ON alerts(jira_issue_key);

-- Create raw logs table (fallback for Kafka-less environments)
CREATE TABLE IF NOT EXISTS raw_logs (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_raw_logs_processed ON raw_logs(processed);
CREATE INDEX IF NOT EXISTS idx_raw_logs_created_at ON raw_logs(created_at);

-- Grant permissions
GRANT ALL PRIVILEGES ON alerts TO postgres;
GRANT ALL PRIVILEGES ON raw_logs TO postgres;
```

---

## Usage

### Local Development

Start the full stack:
```bash
docker-compose -f docker-compose.test.yml up --build
```

This will start all services and display logs. Press Ctrl+C to stop.

### Run Tests Against Stack

```bash
# In another terminal, run tests
npm run test:integration
npm run test:e2e
```

### View Service Logs

```bash
# All services
docker-compose -f docker-compose.test.yml logs -f

# Specific service
docker-compose -f docker-compose.test.yml logs -f consumer
docker-compose -f docker-compose.test.yml logs -f logs-ingest
docker-compose -f docker-compose.test.yml logs -f pos-demo
```

### Check Service Health

```bash
# See all running services
docker-compose -f docker-compose.test.yml ps

# Check specific service
docker-compose -f docker-compose.test.yml ps pos-demo
```

### Connect to Database

```bash
# Using psql
psql postgresql://postgres:postgres@localhost:5432/stacklens_test

# Or using docker exec
docker-compose -f docker-compose.test.yml exec postgres psql -U postgres -d stacklens_test
```

### Test the Flow Manually

```bash
# 1. Place an order with null price (triggers alert)
curl -X POST http://localhost:3001/api/order \
  -H "Content-Type: application/json" \
  -d '{"product_id": "prod_mouse_defect", "user_id": "test_user"}'

# 2. Wait 10 seconds for consumer to process

# 3. Check if alert was created
docker-compose -f docker-compose.test.yml exec postgres \
  psql -U postgres -d stacklens_test \
  -c "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 1;"

# 4. Expected output:
# id | issue_code | severity | suggested_fix | confidence | raw_log | status | jira_issue_key | created_at | updated_at
# ----|------------|----------|---------------|------------|---------|--------|----------------|-----------|----------
# abc-123 | PRICE_MISSING | critical | ... | 95 | {...} | NEW | NULL | 2024-01-15 10:00:00 | 2024-01-15 10:00:00
```

### Cleanup

```bash
# Stop all services
docker-compose -f docker-compose.test.yml down

# Stop and remove volumes (resets database)
docker-compose -f docker-compose.test.yml down -v

# Prune unused resources
docker system prune -a --volumes
```

---

## Service Details

### PostgreSQL
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: stacklens_test
- **User/Pass**: postgres/postgres
- **Tables**: alerts, raw_logs
- **Initialized by**: scripts/init-db.sql

### Kafka & Zookeeper
- **Kafka Port**: 9092 (internal), 29092 (external for localhost)
- **Zookeeper Port**: 2181
- **Topic**: pos-logs (auto-created)
- **Auto-create topics**: enabled
- **Log retention**: 1 hour

### Redis
- **Port**: 6379
- **Used for**: Caching (optional for Phase 1)

### Logs Ingest API
- **Language**: Python/FastAPI
- **Port**: 8001
- **Endpoint**: POST /api/logs/ingest
- **Health**: GET /health
- **Docs**: GET /docs (Swagger UI)

### Consumer Service
- **Language**: Python
- **Reads from**: Kafka topic `pos-logs` or Postgres `raw_logs` (fallback)
- **Writes to**: Postgres `alerts` table
- **Logs**: stdout (visible with `docker-compose logs consumer`)

### POS Demo Service
- **Language**: Node/Express
- **Port**: 3001
- **Endpoints**:
  - GET /api/products
  - POST /api/order
  - GET /health
- **Logs**: Written to /app/logs/ (volume mounted)

### Frontend
- **Language**: React/Vite
- **Port**: 5173
- **API URL**: http://localhost:3000/api (configurable)

---

## Troubleshooting

### Service won't start: "port already in use"
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Kafka consumer lag
```bash
# Check consumer group status
docker exec stacklens-kafka-test \
  kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group stacklens-consumer \
  --describe
```

### Database connection error
```bash
# Check if postgres is running
docker-compose -f docker-compose.test.yml ps postgres

# Check logs
docker-compose -f docker-compose.test.yml logs postgres

# Restart
docker-compose -f docker-compose.test.yml restart postgres
```

### Consumer not processing logs
```bash
# Check consumer logs
docker-compose -f docker-compose.test.yml logs consumer -f

# Check if Kafka topic exists
docker exec stacklens-kafka-test \
  kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list

# Verify database connection
docker-compose -f docker-compose.test.yml exec consumer \
  python -c "import psycopg2; psycopg2.connect('postgresql://postgres:postgres@postgres:5432/stacklens_test')"
```

### Logs not appearing in UI
```bash
# Check if logs-ingest API is responding
curl -s http://localhost:8001/health | jq .

# Check logs
docker-compose -f docker-compose.test.yml logs logs-ingest -f

# Test ingest endpoint
curl -X POST http://localhost:8001/api/logs/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "test-123",
    "service": "test",
    "env": "test",
    "timestamp": "2024-01-15T10:00:00Z",
    "action": "test",
    "level": "info",
    "message": "test"
  }'
```

---

## Performance Tuning (for Production Phase 2)

```yaml
# Kafka performance
environment:
  KAFKA_NUM_NETWORK_THREADS: 8
  KAFKA_NUM_IO_THREADS: 8
  KAFKA_SOCKET_SEND_BUFFER_BYTES: 102400
  KAFKA_SOCKET_RECEIVE_BUFFER_BYTES: 102400
  KAFKA_SOCKET_REQUEST_MAX_BYTES: 104857600

# PostgreSQL performance
environment:
  # Connection pool
  max_connections: 200
  shared_buffers: 256MB
  effective_cache_size: 1GB
  maintenance_work_mem: 64MB
  checkpoint_completion_target: 0.9
  wal_buffers: 16MB
  default_statistics_target: 100
```

---

## CI/CD Integration

In GitHub Actions, use this service composition:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
  
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    options: >-
      --health-cmd "kafka-broker-api-versions.sh --bootstrap-server localhost:9092"
      --health-interval 10s
```

(See `.github/workflows/ci.yml` for full implementation)

---

## Summary

This docker-compose.test.yml provides:
✅ All services needed for Phase 1 testing  
✅ Health checks for reliability  
✅ Volume mounts for development  
✅ Proper networking and dependencies  
✅ Logging and debugging tools  
✅ Database initialization  
✅ Ready for CI/CD integration  

Start with `docker-compose -f docker-compose.test.yml up --build` and you're ready to test! 🚀
