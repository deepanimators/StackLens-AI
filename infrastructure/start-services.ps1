# start-services.ps1
# Starts Kafka and OpenTelemetry Collector on Windows
# Run from the infrastructure folder or project root

$ErrorActionPreference = "Continue"

# Find project root
$SCRIPT_DIR = $PSScriptRoot
if ($SCRIPT_DIR -and (Test-Path "$SCRIPT_DIR\..\package.json")) {
    $ROOT_DIR = (Resolve-Path "$SCRIPT_DIR\..").Path
} elseif (Test-Path ".\package.json") {
    $ROOT_DIR = (Get-Location).Path
} else {
    $ROOT_DIR = "C:\Users\Administrator\Downloads\stacklens-ai"
}

$INFRA_DIR = "$ROOT_DIR\infrastructure"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Infrastructure Directory: $INFRA_DIR" -ForegroundColor Yellow
Write-Host ""

# Check if Kafka is installed
$KAFKA_DIR = "$INFRA_DIR\kafka"
if (-not (Test-Path "$KAFKA_DIR\bin\windows\kafka-server-start.bat")) {
    Write-Host "ERROR: Kafka is not installed at $KAFKA_DIR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the installer first:" -ForegroundColor Yellow
    Write-Host "  .\scripts\install-services.bat" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Check if already running
$kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
if ($kafkaRunning) {
    Write-Host "Kafka is already running on port 9092" -ForegroundColor Green
} else {
    Write-Host "Starting Kafka (KRaft mode)..." -ForegroundColor Yellow
    
    # Create logs directory
    $logsDir = "$INFRA_DIR\logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
    }
    
    # Check if storage is formatted
    $dataDir = "$INFRA_DIR\data\kafka-logs"
    $configFile = "$INFRA_DIR\config\kraft-server.properties"
    
    if (-not (Test-Path $configFile)) {
        # Create default KRaft config
        Write-Host "  Creating Kafka configuration..." -ForegroundColor Gray
        
        if (-not (Test-Path "$INFRA_DIR\config")) {
            New-Item -ItemType Directory -Force -Path "$INFRA_DIR\config" | Out-Null
        }
        
        $kraftConfig = @"
# Kafka KRaft Mode Configuration
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093

listeners=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
inter.broker.listener.name=PLAINTEXT

log.dirs=$($dataDir -replace '\\', '/')
num.partitions=3
default.replication.factor=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

auto.create.topics.enable=true
"@
        $kraftConfig | Out-File -FilePath $configFile -Encoding UTF8
    }
    
    # Format storage if needed
    if (-not (Test-Path "$dataDir\meta.properties")) {
        Write-Host "  Formatting Kafka storage..." -ForegroundColor Gray
        
        if (-not (Test-Path $dataDir)) {
            New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
        }
        
        # Generate cluster ID
        $clusterId = & "$KAFKA_DIR\bin\windows\kafka-storage.bat" random-uuid
        Write-Host "  Cluster ID: $clusterId" -ForegroundColor Gray
        
        # Format storage
        & "$KAFKA_DIR\bin\windows\kafka-storage.bat" format -t $clusterId -c $configFile
    }
    
    # Start Kafka
    $kafkaBatch = "$logsDir\start-kafka.bat"
    "@echo off`r`ncd /d `"$KAFKA_DIR`"`r`nbin\windows\kafka-server-start.bat `"$configFile`" > `"$logsDir\kafka.log`" 2>&1" | Out-File -FilePath $kafkaBatch -Encoding ASCII
    
    $kafkaProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$kafkaBatch`"" -PassThru -WindowStyle Hidden
    Write-Host "  Kafka started (PID: $($kafkaProcess.Id))" -ForegroundColor Green
    
    # Wait for Kafka to be ready
    Write-Host "  Waiting for Kafka to be ready..." -ForegroundColor Gray
    $timeout = 60
    $elapsed = 0
    while ($elapsed -lt $timeout) {
        $ready = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
        if ($ready) {
            Write-Host "  Kafka is ready on port 9092!" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    
    if ($elapsed -ge $timeout) {
        Write-Host "  WARNING: Kafka may not have started correctly. Check logs\kafka.log" -ForegroundColor Yellow
    }
}

# Check OTEL Collector
$OTEL_DIR = "$INFRA_DIR\otel-collector"
$otelRunning = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue

if ($otelRunning) {
    Write-Host "OTEL Collector is already running on port 4317" -ForegroundColor Green
} elseif (Test-Path "$OTEL_DIR\otelcol-contrib.exe") {
    Write-Host "Starting OpenTelemetry Collector..." -ForegroundColor Yellow
    
    $otelConfig = "$INFRA_DIR\config\otel-collector-config.yaml"
    if (-not (Test-Path $otelConfig)) {
        # Create default config
        $otelConfigContent = @"
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s

exporters:
  debug:
    verbosity: basic

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
"@
        $otelConfigContent | Out-File -FilePath $otelConfig -Encoding UTF8
    }
    
    $logsDir = "$INFRA_DIR\logs"
    $otelBatch = "$logsDir\start-otel.bat"
    "@echo off`r`ncd /d `"$OTEL_DIR`"`r`notelcol-contrib.exe --config `"$otelConfig`" > `"$logsDir\otel.log`" 2>&1" | Out-File -FilePath $otelBatch -Encoding ASCII
    
    $otelProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$otelBatch`"" -PassThru -WindowStyle Hidden
    Write-Host "  OTEL Collector started (PID: $($otelProcess.Id))" -ForegroundColor Green
    
    Start-Sleep -Seconds 3
} else {
    Write-Host "OTEL Collector not installed (optional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Infrastructure Services Status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Final status check
$kafka = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
$otel = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue

if ($kafka) {
    Write-Host "  [RUNNING] Kafka        - localhost:9092" -ForegroundColor Green
} else {
    Write-Host "  [STOPPED] Kafka        - localhost:9092" -ForegroundColor Red
}

if ($otel) {
    Write-Host "  [RUNNING] OTEL gRPC    - localhost:4317" -ForegroundColor Green
    Write-Host "  [RUNNING] OTEL HTTP    - localhost:4318" -ForegroundColor Green
} else {
    Write-Host "  [STOPPED] OTEL         - localhost:4317" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Logs: $INFRA_DIR\logs\" -ForegroundColor Yellow
Write-Host ""
