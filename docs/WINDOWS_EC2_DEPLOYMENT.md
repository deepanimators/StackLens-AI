# StackLens Deployment Guide for Windows EC2

This guide explains how to deploy StackLens infrastructure (Kafka, Zookeeper, OpenTelemetry, Elasticsearch) on Windows EC2 using Docker Hub images.

## Prerequisites

### 1. Windows EC2 Instance Setup

**Recommended Instance Type:** `t3.large` or larger (2 vCPUs, 8GB RAM minimum)

**Operating System:** Windows Server 2019/2022 with Containers support

### 2. Install Docker Desktop for Windows

```powershell
# Download and install Docker Desktop for Windows
# https://www.docker.com/products/docker-desktop/

# Or use Chocolatey
choco install docker-desktop

# Enable WSL2 backend (recommended for better performance)
wsl --install
wsl --set-default-version 2
```

### 3. Configure Windows Firewall

Open the following ports in Windows Firewall and EC2 Security Group:

| Port | Service | Protocol |
|------|---------|----------|
| 2181 | Zookeeper | TCP |
| 9094 | Kafka (External) | TCP |
| 29092 | Kafka (Internal) | TCP |
| 4317 | OTEL Collector (gRPC) | TCP |
| 4318 | OTEL Collector (HTTP) | TCP |
| 9200 | Elasticsearch | TCP |
| 5601 | Kibana | TCP |
| 5432 | PostgreSQL | TCP |
| 16686 | Jaeger UI | TCP |

```powershell
# PowerShell commands to open ports
New-NetFirewallRule -DisplayName "Zookeeper" -Direction Inbound -LocalPort 2181 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Kafka" -Direction Inbound -LocalPort 9094 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OTEL gRPC" -Direction Inbound -LocalPort 4317 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "OTEL HTTP" -Direction Inbound -LocalPort 4318 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Elasticsearch" -Direction Inbound -LocalPort 9200 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Kibana" -Direction Inbound -LocalPort 5601 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Jaeger" -Direction Inbound -LocalPort 16686 -Protocol TCP -Action Allow
```

## Deployment Steps

### Step 1: Clone Repository

```powershell
cd C:\
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI
```

### Step 2: Configure Environment Variables

Edit `infra/.env.docker` and set your EC2 public IP:

```env
# Replace with your EC2 public IP address
KAFKA_EXTERNAL_HOST=YOUR_EC2_PUBLIC_IP

# Database credentials (change in production)
POSTGRES_USER=stacklens
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD
POSTGRES_DB=stacklens
```

**To find your EC2 public IP:**
```powershell
Invoke-RestMethod -Uri http://169.254.169.254/latest/meta-data/public-ipv4
```

### Step 3: Start Infrastructure

```powershell
# Run the PowerShell startup script
.\start-infra.ps1

# Or manually using docker-compose
cd infra
docker-compose up -d
```

The script will:
1. Load environment variables
2. Stop existing containers
3. Pull Docker Hub images (if not cached)
4. Start all services with health checks
5. Wait for all services to be healthy
6. Display connection information

### Step 4: Verify Services

```powershell
# Check running containers
docker ps

# Check service health
docker inspect --format='{{.State.Health.Status}}' stacklens-kafka
docker inspect --format='{{.State.Health.Status}}' stacklens-zookeeper
docker inspect --format='{{.State.Health.Status}}' stacklens-elasticsearch
docker inspect --format='{{.State.Health.Status}}' stacklens-postgres

# View logs
docker logs stacklens-kafka --tail 50
docker logs stacklens-otel-collector --tail 50
```

### Step 5: Test Connectivity

**From Windows EC2 (localhost):**
```powershell
# Test Kafka
telnet localhost 9094

# Test PostgreSQL
docker exec stacklens-postgres pg_isready

# Test Elasticsearch
Invoke-RestMethod -Uri http://localhost:9200

# Test Kibana
Invoke-RestMethod -Uri http://localhost:5601/api/status
```

**From External Machine:**
```bash
# Test Kafka (replace with your EC2 IP)
telnet YOUR_EC2_PUBLIC_IP 9094

# Test Elasticsearch
curl http://YOUR_EC2_PUBLIC_IP:9200

# Test Kibana UI
# Open in browser: http://YOUR_EC2_PUBLIC_IP:5601

# Test Jaeger UI
# Open in browser: http://YOUR_EC2_PUBLIC_IP:16686
```

## Docker Hub Images Used

All images are from official Docker Hub repositories:

| Service | Image | Source |
|---------|-------|--------|
| Kafka | `confluentinc/cp-kafka:7.4.0` | https://hub.docker.com/r/confluentinc/cp-kafka |
| Zookeeper | `confluentinc/cp-zookeeper:7.4.0` | https://hub.docker.com/r/confluentinc/cp-zookeeper |
| OpenTelemetry | `otel/opentelemetry-collector-contrib:0.91.0` | https://hub.docker.com/r/otel/opentelemetry-collector-contrib |
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch:7.17.10` | https://hub.docker.com/_/elasticsearch |
| Kibana | `docker.elastic.co/kibana/kibana:7.17.10` | https://hub.docker.com/_/kibana |
| PostgreSQL | `postgres:15-alpine` | https://hub.docker.com/_/postgres |
| Jaeger | `jaegertracing/all-in-one:1.51` | https://hub.docker.com/r/jaegertracing/all-in-one |

## Advantages of Docker Hub Deployment

✅ **Cross-Platform:** Works on Windows, Linux, macOS
✅ **Official Images:** Maintained by vendors (Confluent, Elastic, etc.)
✅ **Version Control:** Pin specific versions for stability
✅ **Auto-Updates:** Easy to upgrade by changing version tags
✅ **No Compilation:** Pre-built binaries, fast deployment
✅ **Health Checks:** Built-in health monitoring
✅ **Scalable:** Easy to add replicas or scale vertically

## Management Commands

### View Logs
```powershell
# All services
docker-compose -f infra/docker-compose.yml logs -f

# Specific service
docker logs stacklens-kafka -f
```

### Restart Services
```powershell
# Restart all
docker-compose -f infra/docker-compose.yml restart

# Restart specific service
docker restart stacklens-kafka
```

### Stop Services
```powershell
cd infra
docker-compose down
```

### Update Services
```powershell
cd infra
docker-compose pull        # Pull latest images
docker-compose up -d       # Recreate containers with new images
```

### Clean Up (Remove Data)
```powershell
cd infra
docker-compose down -v     # Remove containers and volumes
```

## Troubleshooting

### Issue: Kafka not accessible externally

**Solution:** Check KAFKA_EXTERNAL_HOST is set to EC2 public IP in `infra/.env.docker`

```powershell
# Get your EC2 public IP
$publicIP = Invoke-RestMethod -Uri http://169.254.169.254/latest/meta-data/public-ipv4
Write-Host "Your EC2 Public IP: $publicIP"

# Update .env.docker
"KAFKA_EXTERNAL_HOST=$publicIP" | Out-File -Append infra/.env.docker

# Restart Kafka
docker restart stacklens-kafka
```

### Issue: Service unhealthy

```powershell
# Check service logs
docker logs stacklens-SERVICE_NAME --tail 100

# Check health status
docker inspect --format='{{json .State.Health}}' stacklens-SERVICE_NAME | ConvertFrom-Json | Format-List

# Restart service
docker restart stacklens-SERVICE_NAME
```

### Issue: Port already in use

```powershell
# Find process using port (example: 9094)
netstat -ano | findstr :9094

# Kill process by PID
taskkill /PID <PID> /F
```

### Issue: Docker daemon not running

```powershell
# Start Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

# Or restart Docker service
Restart-Service docker
```

### Issue: Elasticsearch fails with memory errors

**Solution:** Increase Docker memory allocation

1. Open Docker Desktop
2. Settings → Resources → Advanced
3. Set Memory to at least 4GB
4. Click "Apply & Restart"

Or disable memory lock in docker-compose.yml:
```yaml
elasticsearch:
  ulimits:
    memlock:
      soft: -1
      hard: -1
  # Comment out if issues persist:
  # environment:
  #   - bootstrap.memory_lock=true
```

## Performance Optimization for Windows EC2

### 1. Enable WSL2 Backend
- Docker Desktop → Settings → General
- Enable "Use the WSL 2 based engine"
- Better performance than Hyper-V

### 2. Increase Docker Resources
- Settings → Resources → Advanced
- Memory: 6-8 GB (for t3.large)
- CPUs: 2-4
- Disk: 50GB minimum

### 3. Use SSD Storage
- Ensure EC2 instance uses gp3 EBS volumes
- Better I/O for Kafka and Elasticsearch

### 4. Enable JVM Optimization
Already configured in docker-compose.yml:
```yaml
ES_JAVA_OPTS=-Xms512m -Xmx512m
```

## Monitoring

### Jaeger UI (Distributed Tracing)
```
http://YOUR_EC2_PUBLIC_IP:16686
```

### Kibana (Elasticsearch UI)
```
http://YOUR_EC2_PUBLIC_IP:5601
```

### Container Stats
```powershell
docker stats
```

### Health Check Endpoint
```powershell
# OTEL Collector health
Invoke-RestMethod -Uri http://localhost:13133/

# Individual service health
docker inspect --format='{{.State.Health.Status}}' stacklens-kafka
```

## Security Recommendations

### Production Deployment:

1. **Change Default Passwords**
   ```env
   POSTGRES_PASSWORD=STRONG_RANDOM_PASSWORD
   ```

2. **Enable Elasticsearch Security**
   ```yaml
   environment:
     - xpack.security.enabled=true
     - ELASTIC_PASSWORD=your_password
   ```

3. **Use TLS/SSL**
   - Enable SSL for Kafka, Elasticsearch, PostgreSQL
   - Use AWS Certificate Manager for load balancers

4. **Restrict Network Access**
   - Use Security Groups to limit access by IP
   - Don't expose services to 0.0.0.0/0
   - Use VPN or bastion host for management

5. **Enable Kafka Authentication**
   ```yaml
   environment:
     - KAFKA_SASL_ENABLED_MECHANISMS=PLAIN
     - KAFKA_SASL_MECHANISM_INTER_BROKER_PROTOCOL=PLAIN
   ```

6. **Regular Updates**
   ```powershell
   docker-compose pull  # Update images monthly
   ```

## Cost Optimization

- Use EC2 Reserved Instances for 40-60% savings
- Stop non-production environments outside business hours
- Use Auto Scaling for variable loads
- Monitor with CloudWatch and optimize resource allocation

## Next Steps

After infrastructure is running:

1. **Deploy StackLens Application**
   ```powershell
   # Set environment variables
   $env:KAFKA_BROKERS = "YOUR_EC2_IP:9094"
   $env:DATABASE_URL = "postgresql://stacklens:password@YOUR_EC2_IP:5432/stacklens"
   
   # Start application
   npm run dev
   ```

2. **Configure Application**
   - Update connection strings to use EC2 IP
   - Test end-to-end flow
   - Set up monitoring dashboards

3. **Production Hardening**
   - Enable authentication
   - Set up backups
   - Configure alerts
   - Document runbooks

## Support

For issues:
- Check logs: `docker logs stacklens-SERVICE_NAME`
- Review health: `docker inspect stacklens-SERVICE_NAME`
- Test connectivity: `telnet HOST PORT`
- Consult Docker Hub documentation for each image

## Appendix: Manual Docker Commands

If you prefer not to use docker-compose:

```powershell
# Create network
docker network create stacklens-network

# Start Zookeeper
docker run -d --name stacklens-zookeeper `
  --network stacklens-network `
  -p 2181:2181 `
  -e ZOOKEEPER_CLIENT_PORT=2181 `
  confluentinc/cp-zookeeper:7.4.0

# Start Kafka
docker run -d --name stacklens-kafka `
  --network stacklens-network `
  -p 9094:9094 `
  -e KAFKA_ZOOKEEPER_CONNECT=stacklens-zookeeper:2181 `
  -e KAFKA_ADVERTISED_LISTENERS=EXTERNAL://YOUR_EC2_IP:9094 `
  confluentinc/cp-kafka:7.4.0

# Start PostgreSQL
docker run -d --name stacklens-postgres `
  --network stacklens-network `
  -p 5432:5432 `
  -e POSTGRES_PASSWORD=password `
  postgres:15-alpine

# Start Elasticsearch
docker run -d --name stacklens-elasticsearch `
  --network stacklens-network `
  -p 9200:9200 `
  -e discovery.type=single-node `
  docker.elastic.co/elasticsearch/elasticsearch:7.17.10
```
