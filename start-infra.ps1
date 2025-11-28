# StackLens Infrastructure Startup Script for Windows
# Run with: .\start-infra.ps1

Write-Host "🚀 Starting StackLens Infrastructure on Windows..." -ForegroundColor Green

# Set location to infra directory
$infraDir = Join-Path $PSScriptRoot "infra"
Set-Location $infraDir

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Load environment variables from .env.docker
if (Test-Path ".env.docker") {
    Write-Host "📝 Loading environment variables from .env.docker..." -ForegroundColor Yellow
    Get-Content ".env.docker" | ForEach-Object {
        if ($_ -match '^([^#].+?)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, [System.EnvironmentVariableTarget]::Process)
            Write-Host "   Set $name" -ForegroundColor Gray
        }
    }
}

# Get Windows host IP for Kafka (if not set in .env.docker)
if (-not $env:KAFKA_EXTERNAL_HOST -or $env:KAFKA_EXTERNAL_HOST -eq "localhost") {
    Write-Host "⚠️  KAFKA_EXTERNAL_HOST not set. Using localhost." -ForegroundColor Yellow
    Write-Host "   For external access, set KAFKA_EXTERNAL_HOST in infra/.env.docker to your EC2 public IP" -ForegroundColor Yellow
}

# Stop any existing containers
Write-Host "`n🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Clean up old volumes (optional - comment out to keep data)
# Write-Host "🗑️  Removing old volumes..." -ForegroundColor Yellow
# docker-compose down -v 2>$null

# Start infrastructure
Write-Host "`n🏗️  Starting infrastructure services..." -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Failed to start infrastructure" -ForegroundColor Red
    exit 1
}

# Wait for services to be healthy
Write-Host "`n⏳ Waiting for services to be healthy..." -ForegroundColor Yellow

$services = @("zookeeper", "kafka", "elasticsearch", "postgres")
$maxWait = 120  # 2 minutes
$elapsed = 0

foreach ($service in $services) {
    Write-Host "   Checking $service..." -ForegroundColor Gray
    $healthy = $false
    $serviceElapsed = 0
    
    while (-not $healthy -and $serviceElapsed -lt $maxWait) {
        $health = docker inspect --format='{{.State.Health.Status}}' "stacklens-$service" 2>$null
        
        if ($health -eq "healthy") {
            $healthy = $true
            Write-Host "   ✅ $service is healthy" -ForegroundColor Green
        } elseif ($health -eq "unhealthy") {
            Write-Host "   ❌ $service is unhealthy!" -ForegroundColor Red
            docker logs "stacklens-$service" --tail 20
            exit 1
        } else {
            Start-Sleep -Seconds 5
            $serviceElapsed += 5
            Write-Host "   ... waiting for $service ($serviceElapsed/$maxWait seconds)" -ForegroundColor Gray
        }
    }
    
    if (-not $healthy) {
        Write-Host "   ❌ Timeout waiting for $service" -ForegroundColor Red
        docker logs "stacklens-$service" --tail 20
        exit 1
    }
}

# Show running containers
Write-Host "`n📦 Running containers:" -ForegroundColor Cyan
docker-compose ps

# Show connection info
Write-Host "`n✅ Infrastructure is ready!" -ForegroundColor Green
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "📊 Services:" -ForegroundColor Cyan
Write-Host "   Kafka:          localhost:9094" -ForegroundColor White
Write-Host "   Zookeeper:      localhost:2181" -ForegroundColor White
Write-Host "   PostgreSQL:     localhost:5432" -ForegroundColor White
Write-Host "   Elasticsearch:  http://localhost:9200" -ForegroundColor White
Write-Host "   Kibana:         http://localhost:5601" -ForegroundColor White
Write-Host "   OTEL Collector: localhost:4317 (gRPC), localhost:4318 (HTTP)" -ForegroundColor White
Write-Host "   Jaeger UI:      http://localhost:16686" -ForegroundColor White
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "`n🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "   View logs:      docker-compose logs -f [service-name]" -ForegroundColor White
Write-Host "   Stop all:       docker-compose down" -ForegroundColor White
Write-Host "   Restart:        docker-compose restart [service-name]" -ForegroundColor White
Write-Host "   Remove volumes: docker-compose down -v" -ForegroundColor White
Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray

# Return to original directory
Set-Location $PSScriptRoot

Write-Host "`n✨ Ready to run your StackLens application!" -ForegroundColor Green
