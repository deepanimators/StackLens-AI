# StackLens AI - Production Deployment Guide

Complete guide for deploying StackLens AI to production with seamless shell command execution.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Scripts](#deployment-scripts)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Backup & Recovery](#backup--recovery)

---

## Prerequisites

### System Requirements

- **OS**: Linux, macOS, or Windows (with WSL2/PowerShell)
- **Node.js**: 18.x or higher
- **Docker**: 20.10+ with Docker Compose
- **Memory**: 4GB minimum (8GB recommended)
- **Disk**: 10GB free space
- **Network**: Ports 4000, 9094, 5432, 9200, 2181 available

### Software Installation

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Check Docker
docker --version
docker-compose --version

# Check disk space
df -h .
```

---

## Quick Start

### First-Time Deployment

```bash
# 1. Navigate to project directory
cd /path/to/StackLens-AI-Deploy

# 2. Run deployment script
./deploy-production.sh
```

That's it! The script will:
- ✅ Validate prerequisites
- ✅ Start infrastructure services (Kafka, Postgres, Elasticsearch, etc.)
- ✅ Configure environment variables
- ✅ Install dependencies
- ✅ Build application
- ✅ Run database migrations
- ✅ Start application server
- ✅ Verify health checks

### Expected Output

```
═════════════════════════════════════════
   StackLens AI Production Deployment
═════════════════════════════════════════

✓ Prerequisites Check
  ✓ Node.js: v18.17.0
  ✓ Docker: 24.0.6
  ✓ Docker Compose: v2.23.0
  ✓ Free disk space: 15GB

✓ Infrastructure Setup
  ✓ Zookeeper: healthy
  ✓ Kafka: healthy
  ✓ PostgreSQL: healthy
  ✓ Elasticsearch: healthy

✓ Application Build
  ✓ Client built successfully
  ✓ Server built successfully

✓ Application Started
  PID: 12345
  URL: http://localhost:4000
  Logs: logs/production/stacklens_2024-01-15_10-30-00.log

═════════════════════════════════════════
✓ Deployment completed successfully!
═════════════════════════════════════════
```

### Deployment Time

- **First deployment**: 5-10 minutes (includes Docker image pulls)
- **Subsequent deployments**: 2-3 minutes

---

## Deployment Scripts

### 1. deploy-production.sh

**Main deployment script** - Deploys the complete application.

```bash
# Full deployment
./deploy-production.sh

# Skip infrastructure (if already running)
./deploy-production.sh --skip-infra

# Skip build (for configuration-only changes)
./deploy-production.sh --skip-build

# Custom port
./deploy-production.sh --port 8080

# Combined options
./deploy-production.sh --skip-infra --skip-build --port 8080
```

**Options:**
- `--skip-infra`: Skip Docker infrastructure setup
- `--skip-build`: Skip npm build process
- `--port <port>`: Use custom port (default: 4000)
- `--help`: Show help message

**What it does:**
1. Validates prerequisites (Node.js, Docker, disk space)
2. Starts infrastructure services with health checks
3. Generates `.env` file with secure secrets
4. Installs production dependencies (`npm ci`)
5. Builds client and server (`npm run build`)
6. Runs database migrations
7. Starts application in background
8. Verifies health endpoints
9. Creates timestamped log files

**Files Created:**
- `.env` - Environment configuration
- `stacklens.pid` - Process ID file
- `logs/production/stacklens_<timestamp>.log` - Application logs

---

### 2. stop-production.sh

**Graceful shutdown script** - Stops the application safely.

```bash
# Stop application
./stop-production.sh
```

**What it does:**
1. Reads PID from `stacklens.pid`
2. Sends SIGTERM (graceful shutdown)
3. Waits up to 15 seconds
4. Force kills if needed (SIGKILL)
5. Cleans up port
6. Removes PID file

**Output:**
```
Stopping StackLens AI (PID: 12345)...
  Waiting for graceful shutdown...
  ✓ Application stopped successfully
```

---

### 3. restart-production.sh

**Fast restart script** - Restarts without rebuilding.

```bash
# Restart application
./restart-production.sh

# Restart with custom port
./restart-production.sh --port 8080
```

**What it does:**
1. Calls `stop-production.sh`
2. Waits 2 seconds
3. Calls `deploy-production.sh --skip-infra --skip-build`

**Use Cases:**
- Configuration changes (`.env` updates)
- Code hotfixes (after manual file edits)
- Memory leak recovery

---

### 4. status-production.sh

**Status monitoring script** - Shows application and infrastructure status.

```bash
# Check status
./status-production.sh
```

**Output:**
```
═══════════════════════════════════════════
   StackLens AI Production Status
═══════════════════════════════════════════

Application Status:
  Status:   ● Running
  PID:      12345
  Memory:   2.3%
  CPU:      5.1%
  Uptime:   2:15:32
  Health:   ✓ Healthy
  URL:      http://localhost:4000

Infrastructure Status:
  zookeeper: ● Running (healthy)
  kafka: ● Running (healthy)
  postgres: ● Running (healthy)
  elasticsearch: ● Running (healthy)

Port Status:
  2181 (Zookeeper): ● Listening
  9094 (Kafka): ● Listening
  5432 (Postgres): ● Listening
  9200 (Elasticsearch): ● Listening
  4000 (StackLens): ● Listening

System Resources:
  Memory:   3.2G / 16G used (12.8G free)
  Disk:     45G / 500G used (455G available, 10%)
  Load:     1.24, 1.45, 1.67

Recent Logs (last 10 lines):
───────────────────────────────────────────
  [2024-01-15 10:45:23] INFO: Server listening on port 4000
  [2024-01-15 10:45:24] INFO: Database connected
  [2024-01-15 10:45:25] INFO: Kafka producer ready
───────────────────────────────────────────
```

---

### 5. logs-production.sh

**Log viewer script** - View application logs.

```bash
# Show last 50 lines (default)
./logs-production.sh

# Show last 100 lines
./logs-production.sh 100

# Follow logs in real-time
./logs-production.sh 0 -f
./logs-production.sh 0 --follow
```

**Output:**
```
═══════════════════════════════════════════
   StackLens AI Production Logs
═══════════════════════════════════════════

Log file: logs/production/stacklens_2024-01-15_10-30-00.log

Available log files:
  stacklens_2024-01-15_10-30-00.log 2.3M Jan 15 10:30
  stacklens_2024-01-14_09-15-00.log 5.1M Jan 14 09:15

Last 50 lines:
───────────────────────────────────────────
[log content here]
───────────────────────────────────────────
```

---

### 6. health-check.sh

**Health verification script** - Tests all system components.

```bash
# Quick health check
./health-check.sh

# Verbose mode (includes endpoint tests)
./health-check.sh -v
./health-check.sh --verbose
```

**Output:**
```
═══════════════════════════════════════════
   StackLens AI Health Check
═══════════════════════════════════════════

Application Health:
  Status:   ✓ Healthy

Infrastructure Health:
  Zookeeper: ✓ Healthy
  Kafka:     ✓ Healthy
  PostgreSQL:✓ Healthy
  Elasticsearch: ✓ Healthy
  OTEL:      ✓ Healthy
  Jaeger:    ✓ Healthy

═══════════════════════════════════════════
Overall Status: ✓ All systems operational
═══════════════════════════════════════════
```

**Exit Codes:**
- `0`: All systems healthy
- `1`: One or more systems unhealthy

**Use in Scripts:**
```bash
if ./health-check.sh; then
    echo "System is healthy"
else
    echo "System needs attention"
fi
```

---

## Configuration

### Environment Variables

The deployment script automatically generates `.env` file with these variables:

```bash
# Application
NODE_ENV=production
APP_PORT=4000

# Database
DATABASE_URL=postgresql://stacklens:secure_password@localhost:5432/stacklens
DB_PATH=./data/database/stacklens.db

# Kafka
KAFKA_BROKERS=localhost:9094
KAFKA_CLIENT_ID=stacklens-api

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=stacklens-api

# AI Models
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Security
JWT_SECRET=auto_generated_secure_secret
SESSION_SECRET=auto_generated_secure_secret

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Resources
MAX_CONNECTIONS=100
REQUEST_TIMEOUT=30000
```

### Custom Configuration

Edit `.env` file after first deployment:

```bash
# Deploy first
./deploy-production.sh

# Edit configuration
nano .env

# Restart to apply changes
./restart-production.sh
```

### Infrastructure Configuration

Infrastructure settings in `infra/docker-compose.yml`:

**Memory Limits:**
```yaml
services:
  elasticsearch:
    environment:
      - ES_JAVA_OPTS=-Xms512m -Xmx512m  # Adjust for your system
```

**Port Mappings:**
```yaml
services:
  postgres:
    ports:
      - "5432:5432"  # Change if port conflicts
```

**Data Persistence:**
```yaml
volumes:
  postgres_data:      # PostgreSQL data
  kafka_data:         # Kafka data
  zookeeper_data:     # Zookeeper data
  elasticsearch_data: # Elasticsearch data
```

---

## Monitoring

### Real-Time Monitoring

```bash
# Watch status in real-time
watch -n 5 ./status-production.sh

# Follow logs continuously
./logs-production.sh 0 -f

# Monitor health
while true; do ./health-check.sh && sleep 30; done
```

### Application Endpoints

- **Health Check**: `http://localhost:4000/health`
- **API**: `http://localhost:4000/api`
- **Metrics**: `http://localhost:4000/metrics` (if enabled)

### Infrastructure Dashboards

- **Kibana**: http://localhost:5601 (Elasticsearch UI)
- **Jaeger**: http://localhost:16686 (Distributed tracing)
- **OpenTelemetry**: http://localhost:13133 (Health endpoint)

### Log Files

All logs stored in `logs/production/`:

```bash
# List all logs
ls -lh logs/production/

# Search logs
grep "ERROR" logs/production/stacklens_*.log

# Count errors
grep -c "ERROR" logs/production/stacklens_*.log

# Analyze response times
grep "Gemini 2.0 Flash responded" logs/production/stacklens_*.log | awk '{print $NF}'
```

---

## Troubleshooting

### Application Won't Start

**Symptom**: `deploy-production.sh` fails

**Check:**
```bash
# Check if port is in use
lsof -i :4000

# Check prerequisites
node --version
docker --version

# Check disk space
df -h .

# View detailed logs
./logs-production.sh 100
```

**Solution:**
```bash
# Use different port
./deploy-production.sh --port 8080

# Kill process on port
lsof -ti:4000 | xargs kill -9

# Clean Docker
docker-compose -f infra/docker-compose.yml down -v
```

---

### Infrastructure Services Unhealthy

**Symptom**: `health-check.sh` shows unhealthy services

**Check Infrastructure:**
```bash
# Check Docker containers
docker ps -a

# Check specific service logs
docker logs stacklens-kafka
docker logs stacklens-postgres
docker logs stacklens-elasticsearch

# Check service health
docker inspect stacklens-kafka | grep Health -A 10
```

**Solution:**
```bash
# Restart infrastructure
cd infra
docker-compose down
docker-compose up -d

# Wait for health
sleep 60
./health-check.sh
```

---

### Kafka Connection Issues

**Symptom**: "Kafka connection timeout" errors

**Check Kafka:**
```bash
# Test Kafka connectivity
docker exec stacklens-kafka kafka-broker-api-versions \
    --bootstrap-server localhost:29092

# Check topics
docker exec stacklens-kafka kafka-topics \
    --bootstrap-server localhost:29092 --list
```

**Solution:**
```bash
# Restart Kafka and Zookeeper
docker restart stacklens-zookeeper
sleep 10
docker restart stacklens-kafka
sleep 20
```

---

### Database Connection Errors

**Symptom**: "Database connection failed"

**Check PostgreSQL:**
```bash
# Test connection
docker exec stacklens-postgres \
    psql -U stacklens -d stacklens -c "SELECT 1;"

# Check migrations
docker exec stacklens-postgres \
    psql -U stacklens -d stacklens -c "\dt"
```

**Solution:**
```bash
# Restart PostgreSQL
docker restart stacklens-postgres
sleep 5

# Run migrations manually
npm run migrate

# Verify schema
npm run db:push
```

---

### Out of Memory

**Symptom**: Application crashes with OOM errors

**Check Memory:**
```bash
# System memory
free -h

# Docker memory
docker stats --no-stream

# Application memory
ps aux | grep node
```

**Solution:**
```bash
# Reduce Elasticsearch memory
# Edit infra/docker-compose.yml:
# ES_JAVA_OPTS=-Xms256m -Xmx256m

# Restart infrastructure
docker-compose -f infra/docker-compose.yml restart

# Increase system swap
sudo swapon --show
```

---

### High Response Times

**Symptom**: Gemini API taking >2 seconds

**Check Performance:**
```bash
# Check Gemini response times in logs
grep "Gemini 2.0 Flash responded" logs/production/stacklens_*.log

# Check system load
uptime

# Check network
ping -c 5 google.com
```

**Solution:**
```bash
# Already optimized with:
# - gemini-2.0-flash-exp model
# - Temperature: 0.2
# - Max tokens: 1200
# - 8-second timeout

# Check API key quota
# Visit: https://makersuite.google.com/app/apikey

# Monitor in logs
./logs-production.sh 0 -f | grep "Gemini"
```

---

## Security

### Production Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Use strong `JWT_SECRET` and `SESSION_SECRET`
- [ ] Enable HTTPS/TLS (reverse proxy recommended)
- [ ] Configure firewall rules
- [ ] Set up API rate limiting
- [ ] Enable CORS properly
- [ ] Use environment-specific API keys
- [ ] Restrict database access
- [ ] Enable Docker security features
- [ ] Set up log rotation

### Firewall Configuration

**Linux (ufw):**
```bash
# Allow application
sudo ufw allow 4000/tcp

# Restrict to specific IP
sudo ufw allow from 192.168.1.0/24 to any port 4000

# Infrastructure (only if needed externally)
sudo ufw allow 9094/tcp  # Kafka
sudo ufw allow 5432/tcp  # PostgreSQL
```

**macOS:**
```bash
# Managed through System Preferences > Security & Privacy > Firewall
```

### SSL/TLS Setup (Recommended)

Use a reverse proxy like Nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Backup & Recovery

### Database Backup

**PostgreSQL:**
```bash
# Backup database
docker exec stacklens-postgres pg_dump -U stacklens stacklens > backup.sql

# With timestamp
backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec stacklens-postgres pg_dump -U stacklens stacklens > "$backup_file"

# Compress
gzip "$backup_file"
```

**SQLite (if using):**
```bash
# Backup SQLite database
cp data/database/stacklens.db "backup_$(date +%Y%m%d_%H%M%S).db"
```

### Full System Backup

```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup data
cp -r data backups/$(date +%Y%m%d)/
cp -r logs backups/$(date +%Y%m%d)/
cp .env backups/$(date +%Y%m%d)/
cp stacklens.pid backups/$(date +%Y%m%d)/ 2>/dev/null || true

# Backup Docker volumes
docker run --rm \
    -v stacklens-postgres_data:/data \
    -v $(pwd)/backups:/backup \
    alpine tar czf /backup/postgres_$(date +%Y%m%d).tar.gz /data
```

### Restore from Backup

**PostgreSQL:**
```bash
# Stop application
./stop-production.sh

# Restore database
cat backup.sql | docker exec -i stacklens-postgres psql -U stacklens stacklens

# Restart
./deploy-production.sh --skip-infra --skip-build
```

**Full Restore:**
```bash
# Stop everything
./stop-production.sh
docker-compose -f infra/docker-compose.yml down -v

# Restore files
cp -r backups/20240115/data ./
cp backups/20240115/.env ./

# Restore Docker volumes
docker run --rm \
    -v stacklens-postgres_data:/data \
    -v $(pwd)/backups:/backup \
    alpine tar xzf /backup/postgres_20240115.tar.gz -C /

# Start
./deploy-production.sh
```

### Automated Backup Script

Create `backup-production.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Database
docker exec stacklens-postgres pg_dump -U stacklens stacklens | gzip > "$BACKUP_DIR/db.sql.gz"

# Application data
tar czf "$BACKUP_DIR/data.tar.gz" data logs .env

# Keep last 7 days
find /path/to/backups -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
```

**Schedule with cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-production.sh
```

---

## Advanced Usage

### Multi-Environment Setup

Create environment-specific scripts:

**staging-deploy.sh:**
```bash
#!/bin/bash
export NODE_ENV=staging
export APP_PORT=5000
./deploy-production.sh
```

**production-deploy.sh:**
```bash
#!/bin/bash
export NODE_ENV=production
export APP_PORT=4000
./deploy-production.sh
```

### Zero-Downtime Deployment

```bash
#!/bin/bash
# Deploy new version on different port
APP_PORT=4001 ./deploy-production.sh

# Verify health
sleep 10
curl http://localhost:4001/health

# Switch traffic (using load balancer)
# Update nginx/load balancer config

# Stop old version
./stop-production.sh
```

### Docker-Only Deployment

Create `docker-compose.app.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - kafka
```

Deploy:
```bash
docker-compose -f infra/docker-compose.yml -f docker-compose.app.yml up -d
```

---

## Performance Tuning

### Gemini API Optimization

Already optimized in code:
- Model: `gemini-2.0-flash-exp` (fastest)
- Temperature: 0.2 (focused responses)
- Max tokens: 1200 (shorter responses)
- Top P: 0.75, Top K: 30
- Timeout: 8 seconds
- Response format: JSON

Expected performance: **0.5-2 seconds** (60-75% faster)

### Database Optimization

**PostgreSQL:**
```sql
-- Create indexes
CREATE INDEX idx_traces_timestamp ON traces(timestamp);
CREATE INDEX idx_errors_created_at ON errors(created_at);

-- Analyze tables
ANALYZE traces;
ANALYZE errors;
```

**Connection pooling** (already configured in code):
```typescript
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Node.js Optimization

```bash
# Increase max memory
NODE_OPTIONS="--max-old-space-size=4096" ./deploy-production.sh

# Enable clustering (edit package.json start script)
"start": "node -r dotenv/config --enable-source-maps dist/server/index.js"
```

---

## Support & Resources

### Quick Reference

```bash
# Deploy
./deploy-production.sh

# Stop
./stop-production.sh

# Restart
./restart-production.sh

# Status
./status-production.sh

# Logs
./logs-production.sh 0 -f

# Health
./health-check.sh -v
```

### Documentation Files

- `README.md` - Project overview
- `PRODUCTION_DEPLOYMENT.md` - This file
- `WINDOWS_EC2_DEPLOYMENT.md` - Windows-specific guide
- `DOCKER_HUB_IMAGES.md` - Infrastructure images reference

### External Resources

- **StackLens Documentation**: (Add your docs URL)
- **Gemini API**: https://ai.google.dev/
- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **Docker Compose**: https://docs.docker.com/compose/
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## Changelog

### 2024-01-15
- ✨ Initial production deployment scripts
- ✨ Gemini 2.0 Flash Experimental optimization
- ✨ Docker Hub infrastructure setup
- ✨ Health check system
- ✨ Windows/Linux/macOS support
- 📝 Comprehensive documentation

---

**Need Help?** Check troubleshooting section or run `./health-check.sh -v` for detailed diagnostics.

**Ready to Deploy?** Run `./deploy-production.sh` 🚀
