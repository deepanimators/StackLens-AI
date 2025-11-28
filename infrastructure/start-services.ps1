# start-services.ps1
# Starts Kafka and OpenTelemetry Collector on Windows
# Uses Windows Services (NSSM) since they're already installed

$ErrorActionPreference = "Continue"

# Service installation directory (SHORT path to avoid Windows command line limits)
# Kafka's batch scripts build classpath internally and can exceed 8192 char limit
$SVC_DIR = "C:\stacklens-svc"

# Find project root for config files
$SCRIPT_DIR = $PSScriptRoot
if (-not $SCRIPT_DIR) { $SCRIPT_DIR = (Get-Location).Path }

if (Test-Path "$SCRIPT_DIR\..\package.json") {
    $ROOT_DIR = (Resolve-Path "$SCRIPT_DIR\..").Path
} elseif (Test-Path ".\package.json") {
    $ROOT_DIR = (Get-Location).Path
} else {
    $ROOT_DIR = "C:\Users\Administrator\Downloads\stacklens-ai"
}

# Services are in the SHORT path directory
$KAFKA_DIR = "$SVC_DIR\kafka"
$OTEL_DIR = "$SVC_DIR\otel-collector"
$LOGS_DIR = "$SVC_DIR\logs"
$CONFIG_DIR = "$SVC_DIR\config"
$DATA_DIR = "$SVC_DIR\data"

# Fallback to local infrastructure if services not installed to C:\stacklens-svc yet
if (-not (Test-Path $KAFKA_DIR)) {
    $INFRA_DIR = "$ROOT_DIR\infrastructure"
    if (Test-Path "$INFRA_DIR\kafka") {
        $KAFKA_DIR = "$INFRA_DIR\kafka"
        $OTEL_DIR = "$INFRA_DIR\otel-collector"
        $LOGS_DIR = "$INFRA_DIR\logs"
        $CONFIG_DIR = "$INFRA_DIR\config"
        $DATA_DIR = "$INFRA_DIR\data"
        Write-Host "[WARN] Using legacy path - run installer to use short path" -ForegroundColor Yellow
    }
}

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

# Check and set JAVA_HOME if needed
if (-not $env:JAVA_HOME) {
    # Try to find Java installation
    $javaPath = Get-Command java -ErrorAction SilentlyContinue
    if ($javaPath) {
        $javaHome = (Split-Path (Split-Path $javaPath.Source))
        if (Test-Path "$javaHome\bin\java.exe") {
            $env:JAVA_HOME = $javaHome
            Write-Host "JAVA_HOME set to: $javaHome" -ForegroundColor Gray
        }
    }
    
    # Try common Windows paths
    $commonPaths = @(
        "C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot",
        "C:\Program Files\Java\jdk-21",
        "C:\Program Files\Microsoft\jdk-21*",
        "C:\Program Files\Eclipse Adoptium\jdk-21*"
    )
    foreach ($path in $commonPaths) {
        $resolved = Resolve-Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($resolved -and (Test-Path "$($resolved.Path)\bin\java.exe")) {
            $env:JAVA_HOME = $resolved.Path
            Write-Host "JAVA_HOME set to: $($resolved.Path)" -ForegroundColor Gray
            break
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server IP: $serverIp" -ForegroundColor Yellow
if ($env:JAVA_HOME) {
    Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Yellow
} else {
    Write-Host "JAVA_HOME: NOT SET (may cause issues)" -ForegroundColor Red
}
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
Write-Host "Checking Kafka storage..." -ForegroundColor Yellow
Write-Host "  Data directory: $kafkaDataDir" -ForegroundColor Gray
Write-Host "  Config file: $configFile" -ForegroundColor Gray

if (-not (Test-Path "$kafkaDataDir\meta.properties")) {
    Write-Host "  Storage not formatted, formatting now..." -ForegroundColor Yellow
    
    # Clean any old/corrupt data
    if (Test-Path $kafkaDataDir) {
        Write-Host "  Cleaning old data..." -ForegroundColor Gray
        Remove-Item "$kafkaDataDir\*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Ensure data directory exists
    if (-not (Test-Path $kafkaDataDir)) {
        New-Item -ItemType Directory -Force -Path $kafkaDataDir | Out-Null
    }
    
    Push-Location $KAFKA_DIR
    
    # Generate cluster ID - use a pre-generated valid one to avoid path issues
    $clusterId = "MkU3OEVBNTcwNTJENDM2Qk"
    
    # Try to generate via Kafka, but don't fail if it doesn't work
    Write-Host "  Generating cluster ID..." -ForegroundColor Gray
    try {
        $genResult = & cmd /c "bin\windows\kafka-storage.bat random-uuid 2>&1"
        Write-Host "    Raw output: $genResult" -ForegroundColor Gray
        if ($genResult -and $genResult.Length -ge 20 -and $genResult -notmatch "error|input line") {
            $clusterId = ($genResult -split "`n")[0].Trim()
        }
    } catch {
        Write-Host "    Using fallback cluster ID" -ForegroundColor Yellow
    }
    
    Write-Host "  Cluster ID: $clusterId" -ForegroundColor Cyan
    
    # Format storage - use the FULL path to avoid any ambiguity
    Write-Host "  Running kafka-storage format..." -ForegroundColor Gray
    try {
        $formatOutput = & cmd /c "bin\windows\kafka-storage.bat format -t $clusterId -c `"$configFile`" 2>&1"
        Write-Host "    Format output: $formatOutput" -ForegroundColor Gray
        
        if (Test-Path "$kafkaDataDir\meta.properties") {
            Write-Host "  [OK] Storage formatted successfully!" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] Format may have failed - meta.properties not found" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [ERROR] Format failed: $_" -ForegroundColor Red
    }
    
    Pop-Location
} else {
    Write-Host "  [OK] Storage already formatted" -ForegroundColor Green
}

# ============================================
# START KAFKA
# ============================================
$kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue

if ($kafkaRunning) {
    Write-Host "[OK] Kafka is already running on port 9092" -ForegroundColor Green
} else {
    Write-Host "Starting Kafka..." -ForegroundColor Yellow
    
    # Check if Kafka directory exists
    if (-not (Test-Path "$KAFKA_DIR\bin\windows\kafka-server-start.bat")) {
        Write-Host "  [ERROR] Kafka not installed at $KAFKA_DIR" -ForegroundColor Red
        Write-Host "  Run: .\scripts\install-services-windows.ps1" -ForegroundColor Yellow
    } else {
        # Try Windows Service first (NSSM)
        $kafkaSvc = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
        if ($kafkaSvc -and $kafkaSvc.Status -ne "Running") {
            Write-Host "  Using Windows Service..." -ForegroundColor Gray
            try {
                Start-Service -Name "StackLensKafka" -ErrorAction Stop
                Start-Sleep -Seconds 5
            } catch {
                Write-Host "  Service failed to start: $_" -ForegroundColor Yellow
            }
        }
        
        # Check if service started it
        $kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
        
        if (-not $kafkaRunning) {
            Write-Host "  Windows Service didn't start Kafka, trying direct launch..." -ForegroundColor Yellow
            
            # Kill any hung Kafka processes
            Get-Process -Name "java" -ErrorAction SilentlyContinue | ForEach-Object {
                try {
                    $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
                    if ($cmdLine -match "kafka") {
                        Write-Host "  Killing hung Kafka process (PID: $($_.Id))..." -ForegroundColor Yellow
                        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }
            Start-Sleep -Seconds 2
            
            # Use 8.3 short paths to avoid "input line too long" error
            # Get short path names for the long paths
            $fso = New-Object -ComObject Scripting.FileSystemObject
            $shortKafkaDir = $fso.GetFolder($KAFKA_DIR).ShortPath
            $shortConfigFile = $fso.GetFile($configFile).ShortPath
            $shortLogsDir = $fso.GetFolder($LOGS_DIR).ShortPath
            
            Write-Host "  Using short paths:" -ForegroundColor Gray
            Write-Host "    Kafka: $shortKafkaDir" -ForegroundColor Gray
            Write-Host "    Config: $shortConfigFile" -ForegroundColor Gray
            
            # Create a minimal batch file using short paths
            $batchContent = @"
@echo off
cd /d $shortKafkaDir
bin\windows\kafka-server-start.bat $shortConfigFile
"@
            $batchFile = "$shortLogsDir\run-kafka.bat"
            $batchContent | Out-File -FilePath $batchFile -Encoding ASCII
            
            # Start Kafka using the batch file
            $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "$batchFile", ">", "$shortLogsDir\kafka.log", "2>&1" -PassThru -WindowStyle Hidden -WorkingDirectory $shortKafkaDir
            
            Write-Host "  Kafka process started (PID: $($proc.Id))" -ForegroundColor Green
        }
        
        # Wait for Kafka
        Write-Host "  Waiting for Kafka to be ready" -ForegroundColor Gray -NoNewline
        for ($i = 0; $i -lt 30; $i++) {
            $ready = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
            if ($ready) {
                Write-Host ""
                Write-Host "  [OK] Kafka is ready!" -ForegroundColor Green
                break
            }
            Start-Sleep -Seconds 2
            Write-Host "." -NoNewline
        }
        
        # Final check
        $kafkaRunning = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
        if (-not $kafkaRunning) {
            Write-Host ""
            Write-Host "  [WARN] Kafka may not have started correctly." -ForegroundColor Yellow
            Write-Host "  Check log: $LOGS_DIR\kafka.log" -ForegroundColor Yellow
            
            # Show last few lines of log if exists
            if (Test-Path "$LOGS_DIR\kafka.log") {
                Write-Host "  Last log entries:" -ForegroundColor Gray
                Get-Content "$LOGS_DIR\kafka.log" -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
            }
            
            # Check for NSSM service logs
            if (Test-Path "$LOGS_DIR\kafka-stderr.log") {
                Write-Host "  Service error log:" -ForegroundColor Gray
                Get-Content "$LOGS_DIR\kafka-stderr.log" -Tail 5 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
            }
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
