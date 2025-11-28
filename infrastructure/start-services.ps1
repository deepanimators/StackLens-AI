# start-services.ps1
# Starts Kafka and OpenTelemetry Collector on Windows
# Uses Windows Services (NSSM) since they're already installed

$ErrorActionPreference = "Continue"

# Find project root
$SCRIPT_DIR = $PSScriptRoot
if (-not $SCRIPT_DIR) { $SCRIPT_DIR = (Get-Location).Path }

if (Test-Path "$SCRIPT_DIR\..\package.json") {
    $ROOT_DIR = (Resolve-Path "$SCRIPT_DIR\..").Path
} elseif (Test-Path ".\package.json") {
    $ROOT_DIR = (Get-Location).Path
} else {
    $ROOT_DIR = "C:\Users\Administrator\Downloads\stacklens-ai"
}

$INFRA_DIR = "$ROOT_DIR\infrastructure"
$KAFKA_DIR = "$INFRA_DIR\kafka"
$OTEL_DIR = "$INFRA_DIR\otel-collector"
$LOGS_DIR = "$INFRA_DIR\logs"
$CONFIG_DIR = "$INFRA_DIR\config"
$DATA_DIR = "$INFRA_DIR\data"

# Load environment variables
$envFile = "$ROOT_DIR\.env.windows"
if (-not (Test-Path $envFile)) { $envFile = "$ROOT_DIR\.env" }
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$serverIp = if ($env:SERVER_IP) { $env:SERVER_IP } else { "localhost" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server IP: $serverIp" -ForegroundColor Yellow
Write-Host ""

# Create directories
@($LOGS_DIR, $CONFIG_DIR, $DATA_DIR, "$DATA_DIR\kafka-logs") | ForEach-Object {
    if (-not (Test-Path $_)) { New-Item -ItemType Directory -Force -Path $_ | Out-Null }
}

# ============================================
# KAFKA CONFIGURATION
# ============================================
$configFile = "$CONFIG_DIR\kraft-server.properties"
$kafkaDataDir = "$DATA_DIR\kafka-logs"

# Always recreate config with correct server IP
Write-Host "Creating Kafka configuration for $serverIp..." -ForegroundColor Yellow
$javaLogPath = $kafkaDataDir -replace '\\', '/'

@"
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
advertised.listeners=PLAINTEXT://${serverIp}:9092
controller.listener.names=CONTROLLER
inter.broker.listener.name=PLAINTEXT
log.dirs=$javaLogPath
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
"@ | Out-File -FilePath $configFile -Encoding ASCII -Force

# ============================================
# FORMAT KAFKA STORAGE (if needed)
# ============================================
if (-not (Test-Path "$kafkaDataDir\meta.properties")) {
    Write-Host "Formatting Kafka storage..." -ForegroundColor Yellow
    
    # Clean any old data
    if (Test-Path $kafkaDataDir) {
        Remove-Item "$kafkaDataDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    Push-Location $KAFKA_DIR
    
    # Generate cluster ID - use a pre-generated valid one to avoid path issues
    $clusterId = "MkU3OEVBNTcwNTJENDM2Qk"
    
    # Try to generate via Kafka, but don't fail if it doesn't work
    try {
        $genResult = & cmd /c "bin\windows\kafka-storage.bat random-uuid 2>nul"
        if ($genResult -and $genResult.Length -eq 22 -and -not $genResult.Contains("error")) {
            $clusterId = $genResult.Trim()
        }
    } catch { }
    
    Write-Host "  Cluster ID: $clusterId" -ForegroundColor Gray
    
    # Format with relative path to config
    try {
        & cmd /c "bin\windows\kafka-storage.bat format -t $clusterId -c `"..\config\kraft-server.properties`" 2>&1" | Out-Null
        Write-Host "  Storage formatted!" -ForegroundColor Green
    } catch {
        Write-Host "  Format warning (may be OK): $_" -ForegroundColor Yellow
    }
    
    Pop-Location
}

# ============================================
# START KAFKA
# ============================================
$kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue

if ($kafkaRunning) {
    Write-Host "[OK] Kafka is already running on port 9092" -ForegroundColor Green
} else {
    Write-Host "Starting Kafka..." -ForegroundColor Yellow
    
    # Try Windows Service first (NSSM)
    $kafkaSvc = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
    if ($kafkaSvc) {
        Write-Host "  Using Windows Service..." -ForegroundColor Gray
        Start-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
    }
    
    # Check if service started it
    $kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
    
    if (-not $kafkaRunning) {
        Write-Host "  Service didn't start, trying direct launch..." -ForegroundColor Yellow
        
        # Direct start using relative paths
        Push-Location $KAFKA_DIR
        $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "bin\windows\kafka-server-start.bat", "..\config\kraft-server.properties", ">", "..\logs\kafka.log", "2>&1" -PassThru -WindowStyle Hidden
        Pop-Location
        
        Write-Host "  Kafka process started (PID: $($proc.Id))" -ForegroundColor Green
    }
    
    # Wait for Kafka
    Write-Host "  Waiting for Kafka to be ready..." -ForegroundColor Gray
    for ($i = 0; $i -lt 30; $i++) {
        $ready = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
        if ($ready) {
            Write-Host "  [OK] Kafka is ready!" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline
    }
    Write-Host ""
    
    # Final check
    $kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
    if (-not $kafkaRunning) {
        Write-Host "  [WARN] Kafka may not have started. Check: $LOGS_DIR\kafka.log" -ForegroundColor Yellow
        if (Test-Path "$LOGS_DIR\kafka.log") {
            Write-Host "  Last log lines:" -ForegroundColor Gray
            Get-Content "$LOGS_DIR\kafka.log" -Tail 5 | ForEach-Object { Write-Host "    $_" }
        }
    }
}

# ============================================
# START OTEL COLLECTOR
# ============================================
$otelRunning = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue

if ($otelRunning) {
    Write-Host "[OK] OTEL Collector is already running on port 4317" -ForegroundColor Green
} elseif (Test-Path "$OTEL_DIR\otelcol-contrib.exe") {
    Write-Host "Starting OTEL Collector..." -ForegroundColor Yellow
    
    # Ensure config exists
    $otelConfig = "$CONFIG_DIR\otel-collector-config.yaml"
    if (-not (Test-Path $otelConfig)) {
        @"
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
"@ | Out-File -FilePath $otelConfig -Encoding UTF8
    }
    
    # Try Windows Service first
    $otelSvc = Get-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
    if ($otelSvc) {
        Start-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # Check if started
    $otelRunning = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue
    
    if (-not $otelRunning) {
        Push-Location $OTEL_DIR
        $proc = Start-Process -FilePath ".\otelcol-contrib.exe" -ArgumentList "--config", "..\config\otel-collector-config.yaml" -PassThru -WindowStyle Hidden -RedirectStandardOutput "..\logs\otel.log" -RedirectStandardError "..\logs\otel-err.log"
        Pop-Location
        Write-Host "  OTEL started (PID: $($proc.Id))" -ForegroundColor Green
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "[SKIP] OTEL Collector not installed" -ForegroundColor Yellow
}

# ============================================
# STATUS SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Infrastructure Status" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$kafka = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
$otelGrpc = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue
$otelHttp = Get-NetTCPConnection -LocalPort 4318 -State Listen -ErrorAction SilentlyContinue

if ($kafka) {
    Write-Host "  [RUNNING] Kafka        - ${serverIp}:9092" -ForegroundColor Green
} else {
    Write-Host "  [STOPPED] Kafka        - ${serverIp}:9092" -ForegroundColor Red
}

if ($otelGrpc) {
    Write-Host "  [RUNNING] OTEL gRPC    - ${serverIp}:4317" -ForegroundColor Green
} else {
    Write-Host "  [STOPPED] OTEL gRPC    - ${serverIp}:4317" -ForegroundColor Red
}

if ($otelHttp) {
    Write-Host "  [RUNNING] OTEL HTTP    - ${serverIp}:4318" -ForegroundColor Green
} else {
    Write-Host "  [STOPPED] OTEL HTTP    - ${serverIp}:4318" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Logs: $LOGS_DIR" -ForegroundColor Yellow
Write-Host ""
pause
