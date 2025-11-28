# install-services-windows.ps1
# Installs Kafka, OpenTelemetry Collector on Windows EC2 (without Docker)
# Run as Administrator

param(
    [switch]$SkipJava,
    [switch]$SkipKafka,
    [switch]$SkipOtel,
    [switch]$InstallAll
)

$ErrorActionPreference = "Stop"

# Configuration
$INSTALL_DIR = "C:\Users\Administrator\Downloads\stacklens-ai\infrastructure"
$KAFKA_VERSION = "3.7.0"
$SCALA_VERSION = "2.13"
$OTEL_VERSION = "0.91.0"
$JAVA_VERSION = "21"

# URLs
$KAFKA_URL = "https://downloads.apache.org/kafka/$KAFKA_VERSION/kafka_$SCALA_VERSION-$KAFKA_VERSION.tgz"
$OTEL_URL = "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v$OTEL_VERSION/otelcol-contrib_${OTEL_VERSION}_windows_amd64.tar.gz"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Installer" -ForegroundColor Cyan
Write-Host "  Windows EC2 (No Docker)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Create installation directory
Write-Host "Creating installation directory: $INSTALL_DIR" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\data" | Out-Null
New-Item -ItemType Directory -Force -Path "$INSTALL_DIR\config" | Out-Null

# ============================================
# FUNCTION: Install Java (Required for Kafka)
# ============================================
function Install-Java {
    Write-Host ""
    Write-Host "=== Installing Java $JAVA_VERSION ===" -ForegroundColor Green
    
    # Check if Java is already installed
    try {
        $javaVersion = java -version 2>&1 | Select-String "version"
        if ($javaVersion) {
            Write-Host "Java is already installed: $javaVersion" -ForegroundColor Green
            return
        }
    } catch {
        Write-Host "Java not found, installing..." -ForegroundColor Yellow
    }
    
    # Install via winget (Windows Package Manager)
    Write-Host "Installing Java via winget..." -ForegroundColor Yellow
    try {
        winget install --id Microsoft.OpenJDK.$JAVA_VERSION -e --accept-package-agreements --accept-source-agreements
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "Java installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "winget failed. Trying Chocolatey..." -ForegroundColor Yellow
        
        # Try Chocolatey
        try {
            choco install openjdk$JAVA_VERSION -y
            Write-Host "Java installed via Chocolatey!" -ForegroundColor Green
        } catch {
            Write-Host "ERROR: Could not install Java automatically." -ForegroundColor Red
            Write-Host "Please install Java manually from: https://adoptium.net/" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # Set JAVA_HOME
    $javaHome = (Get-Command java -ErrorAction SilentlyContinue).Source | Split-Path | Split-Path
    if ($javaHome) {
        [Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "Machine")
        $env:JAVA_HOME = $javaHome
        Write-Host "JAVA_HOME set to: $javaHome" -ForegroundColor Green
    }
}

# ============================================
# FUNCTION: Install Kafka (with KRaft mode)
# ============================================
function Install-Kafka {
    Write-Host ""
    Write-Host "=== Installing Apache Kafka $KAFKA_VERSION ===" -ForegroundColor Green
    
    $kafkaDir = "$INSTALL_DIR\kafka"
    $kafkaArchive = "$INSTALL_DIR\kafka.tgz"
    
    # Check if already installed
    if (Test-Path "$kafkaDir\bin\windows\kafka-server-start.bat") {
        Write-Host "Kafka is already installed at $kafkaDir" -ForegroundColor Green
        return
    }
    
    # Download Kafka
    Write-Host "Downloading Kafka from Apache mirrors..." -ForegroundColor Yellow
    try {
        # Try primary mirror
        Invoke-WebRequest -Uri $KAFKA_URL -OutFile $kafkaArchive -UseBasicParsing
    } catch {
        # Try backup mirror
        $backupUrl = "https://archive.apache.org/dist/kafka/$KAFKA_VERSION/kafka_$SCALA_VERSION-$KAFKA_VERSION.tgz"
        Write-Host "Primary mirror failed, trying archive..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $backupUrl -OutFile $kafkaArchive -UseBasicParsing
    }
    
    Write-Host "Extracting Kafka..." -ForegroundColor Yellow
    
    # Extract using tar (available in Windows 10+)
    Push-Location $INSTALL_DIR
    tar -xzf kafka.tgz
    Rename-Item "kafka_$SCALA_VERSION-$KAFKA_VERSION" "kafka"
    Remove-Item $kafkaArchive
    Pop-Location
    
    Write-Host "Kafka installed at: $kafkaDir" -ForegroundColor Green
    
    # Create KRaft configuration
    Write-Host "Configuring Kafka for KRaft mode (no Zookeeper)..." -ForegroundColor Yellow
    
    $kraftConfig = @"
# Kafka KRaft Mode Configuration
# Generated for StackLens on Windows EC2

# Node configuration
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093

# Listeners
listeners=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
inter.broker.listener.name=PLAINTEXT

# Log configuration
log.dirs=$($INSTALL_DIR -replace '\\', '/')/data/kafka-logs
num.partitions=3
default.replication.factor=1
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

# Performance tuning
num.network.threads=3
num.io.threads=8
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Log retention
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# Auto-create topics
auto.create.topics.enable=true
"@
    
    $kraftConfig | Out-File -FilePath "$INSTALL_DIR\config\kraft-server.properties" -Encoding UTF8
    
    # Generate cluster ID and format storage
    Write-Host "Generating Kafka cluster ID..." -ForegroundColor Yellow
    
    $clusterIdFile = "$INSTALL_DIR\data\cluster_id.txt"
    if (-not (Test-Path $clusterIdFile)) {
        $clusterId = & "$kafkaDir\bin\windows\kafka-storage.bat" random-uuid
        $clusterId | Out-File -FilePath $clusterIdFile -Encoding UTF8
        
        Write-Host "Formatting Kafka storage with cluster ID: $clusterId" -ForegroundColor Yellow
        & "$kafkaDir\bin\windows\kafka-storage.bat" format -t $clusterId -c "$INSTALL_DIR\config\kraft-server.properties"
    }
    
    Write-Host "Kafka configured for KRaft mode!" -ForegroundColor Green
}

# ============================================
# FUNCTION: Install OpenTelemetry Collector
# ============================================
function Install-Otel {
    Write-Host ""
    Write-Host "=== Installing OpenTelemetry Collector $OTEL_VERSION ===" -ForegroundColor Green
    
    $otelDir = "$INSTALL_DIR\otel-collector"
    $otelArchive = "$INSTALL_DIR\otel.tar.gz"
    
    # Check if already installed
    if (Test-Path "$otelDir\otelcol-contrib.exe") {
        Write-Host "OpenTelemetry Collector is already installed at $otelDir" -ForegroundColor Green
        return
    }
    
    New-Item -ItemType Directory -Force -Path $otelDir | Out-Null
    
    # Download OTEL Collector
    Write-Host "Downloading OpenTelemetry Collector..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $OTEL_URL -OutFile $otelArchive -UseBasicParsing
    
    Write-Host "Extracting..." -ForegroundColor Yellow
    Push-Location $otelDir
    tar -xzf $otelArchive
    Pop-Location
    Remove-Item $otelArchive
    
    Write-Host "OpenTelemetry Collector installed at: $otelDir" -ForegroundColor Green
    
    # Create configuration
    $otelConfig = @"
# OpenTelemetry Collector Configuration
# For StackLens on Windows EC2

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "*"

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
  
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  debug:
    verbosity: basic
  
  logging:
    loglevel: info

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
  
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug]
    
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug]
    
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug]
"@
    
    $otelConfig | Out-File -FilePath "$INSTALL_DIR\config\otel-collector-config.yaml" -Encoding UTF8
    Write-Host "OTEL configuration created!" -ForegroundColor Green
}

# ============================================
# FUNCTION: Create Windows Services
# ============================================
function Create-WindowsServices {
    Write-Host ""
    Write-Host "=== Creating Windows Services ===" -ForegroundColor Green
    
    # Create Kafka service using NSSM (Non-Sucking Service Manager)
    Write-Host "Installing NSSM for service management..." -ForegroundColor Yellow
    
    $nssmPath = "$INSTALL_DIR\nssm\nssm.exe"
    if (-not (Test-Path $nssmPath)) {
        $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $nssmZip = "$INSTALL_DIR\nssm.zip"
        
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip -UseBasicParsing
        Expand-Archive -Path $nssmZip -DestinationPath "$INSTALL_DIR\nssm-temp"
        Move-Item "$INSTALL_DIR\nssm-temp\nssm-2.24\win64" "$INSTALL_DIR\nssm"
        Remove-Item "$INSTALL_DIR\nssm-temp" -Recurse
        Remove-Item $nssmZip
    }
    
    # Create Kafka Service
    Write-Host "Creating Kafka Windows Service..." -ForegroundColor Yellow
    & $nssmPath install StackLensKafka "$INSTALL_DIR\kafka\bin\windows\kafka-server-start.bat" "$INSTALL_DIR\config\kraft-server.properties"
    & $nssmPath set StackLensKafka AppDirectory "$INSTALL_DIR\kafka"
    & $nssmPath set StackLensKafka DisplayName "StackLens Kafka"
    & $nssmPath set StackLensKafka Description "Apache Kafka for StackLens"
    & $nssmPath set StackLensKafka Start SERVICE_AUTO_START
    & $nssmPath set StackLensKafka AppStdout "$INSTALL_DIR\logs\kafka-stdout.log"
    & $nssmPath set StackLensKafka AppStderr "$INSTALL_DIR\logs\kafka-stderr.log"
    
    # Create OTEL Service
    Write-Host "Creating OpenTelemetry Collector Windows Service..." -ForegroundColor Yellow
    & $nssmPath install StackLensOtel "$INSTALL_DIR\otel-collector\otelcol-contrib.exe" "--config=$INSTALL_DIR\config\otel-collector-config.yaml"
    & $nssmPath set StackLensOtel AppDirectory "$INSTALL_DIR\otel-collector"
    & $nssmPath set StackLensOtel DisplayName "StackLens OpenTelemetry Collector"
    & $nssmPath set StackLensOtel Description "OpenTelemetry Collector for StackLens"
    & $nssmPath set StackLensOtel Start SERVICE_AUTO_START
    & $nssmPath set StackLensOtel AppStdout "$INSTALL_DIR\logs\otel-stdout.log"
    & $nssmPath set StackLensOtel AppStderr "$INSTALL_DIR\logs\otel-stderr.log"
    
    Write-Host "Windows Services created!" -ForegroundColor Green
}

# ============================================
# FUNCTION: Configure Firewall
# ============================================
function Configure-Firewall {
    Write-Host ""
    Write-Host "=== Configuring Windows Firewall ===" -ForegroundColor Green
    
    $rules = @(
        @{Name="StackLens-Kafka"; Port=9092; Description="Kafka Broker"},
        @{Name="StackLens-Kafka-Controller"; Port=9093; Description="Kafka Controller"},
        @{Name="StackLens-OTEL-gRPC"; Port=4317; Description="OTEL gRPC"},
        @{Name="StackLens-OTEL-HTTP"; Port=4318; Description="OTEL HTTP"},
        @{Name="StackLens-OTEL-Health"; Port=13133; Description="OTEL Health Check"},
        @{Name="StackLens-API"; Port=4000; Description="StackLens API"},
        @{Name="StackLens-Web"; Port=5173; Description="StackLens Web UI"}
    )
    
    foreach ($rule in $rules) {
        $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
        if (-not $existing) {
            New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol TCP -LocalPort $rule.Port -Action Allow -Description $rule.Description | Out-Null
            Write-Host "  Created firewall rule: $($rule.Name) (port $($rule.Port))" -ForegroundColor Green
        } else {
            Write-Host "  Firewall rule exists: $($rule.Name)" -ForegroundColor Yellow
        }
    }
}

# ============================================
# MAIN INSTALLATION
# ============================================

if (-not $SkipJava) {
    Install-Java
}

if (-not $SkipKafka) {
    Install-Kafka
}

if (-not $SkipOtel) {
    Install-Otel
}

# Create Windows Services
Create-WindowsServices

# Configure Firewall
Configure-Firewall

# ============================================
# Create Start/Stop Scripts
# ============================================
Write-Host ""
Write-Host "=== Creating Management Scripts ===" -ForegroundColor Green

# Start script
$startScript = @"
# start-services.ps1
# Starts all StackLens infrastructure services

Write-Host "Starting StackLens Infrastructure Services..." -ForegroundColor Cyan

# Start Kafka
Write-Host "Starting Kafka..." -ForegroundColor Yellow
Start-Service StackLensKafka -ErrorAction SilentlyContinue
if (`$?) { Write-Host "  Kafka started!" -ForegroundColor Green }

# Start OTEL
Write-Host "Starting OpenTelemetry Collector..." -ForegroundColor Yellow
Start-Service StackLensOtel -ErrorAction SilentlyContinue
if (`$?) { Write-Host "  OTEL Collector started!" -ForegroundColor Green }

Write-Host ""
Write-Host "All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Cyan
Write-Host "  Kafka:       localhost:9092"
Write-Host "  OTEL gRPC:   localhost:4317"
Write-Host "  OTEL HTTP:   localhost:4318"
Write-Host "  OTEL Health: localhost:13133"
"@

$startScript | Out-File -FilePath "$INSTALL_DIR\start-services.ps1" -Encoding UTF8

# Stop script
$stopScript = @"
# stop-services.ps1
# Stops all StackLens infrastructure services

Write-Host "Stopping StackLens Infrastructure Services..." -ForegroundColor Cyan

Stop-Service StackLensKafka -ErrorAction SilentlyContinue
Write-Host "  Kafka stopped" -ForegroundColor Yellow

Stop-Service StackLensOtel -ErrorAction SilentlyContinue
Write-Host "  OTEL Collector stopped" -ForegroundColor Yellow

Write-Host "All services stopped!" -ForegroundColor Green
"@

$stopScript | Out-File -FilePath "$INSTALL_DIR\stop-services.ps1" -Encoding UTF8

# Status script
$statusScript = @"
# status-services.ps1
# Shows status of StackLens infrastructure services

Write-Host ""
Write-Host "StackLens Infrastructure Status" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

`$services = @("StackLensKafka", "StackLensOtel")

foreach (`$svc in `$services) {
    `$service = Get-Service -Name `$svc -ErrorAction SilentlyContinue
    if (`$service) {
        if (`$service.Status -eq "Running") {
            Write-Host "  [`$svc]: Running" -ForegroundColor Green
        } else {
            Write-Host "  [`$svc]: `$(`$service.Status)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [`$svc]: Not Installed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Port Status:" -ForegroundColor Cyan

`$ports = @(9092, 4317, 4318, 13133)
foreach (`$port in `$ports) {
    `$conn = Get-NetTCPConnection -LocalPort `$port -ErrorAction SilentlyContinue
    if (`$conn) {
        Write-Host "  Port `$port: LISTENING" -ForegroundColor Green
    } else {
        Write-Host "  Port `$port: NOT LISTENING" -ForegroundColor Red
    }
}
"@

$statusScript | Out-File -FilePath "$INSTALL_DIR\status-services.ps1" -Encoding UTF8

Write-Host "Management scripts created in $INSTALL_DIR" -ForegroundColor Green

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation Directory: $INSTALL_DIR" -ForegroundColor Yellow
Write-Host ""
Write-Host "Installed Components:" -ForegroundColor Cyan
Write-Host "  - Java $JAVA_VERSION (OpenJDK)"
Write-Host "  - Apache Kafka $KAFKA_VERSION (KRaft mode - no Zookeeper)"
Write-Host "  - OpenTelemetry Collector $OTEL_VERSION"
Write-Host ""
Write-Host "Windows Services Created:" -ForegroundColor Cyan
Write-Host "  - StackLensKafka"
Write-Host "  - StackLensOtel"
Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Cyan
Write-Host "  Start:  $INSTALL_DIR\start-services.ps1"
Write-Host "  Stop:   $INSTALL_DIR\stop-services.ps1"
Write-Host "  Status: $INSTALL_DIR\status-services.ps1"
Write-Host ""
Write-Host "Or use Windows Services:" -ForegroundColor Cyan
Write-Host "  Start-Service StackLensKafka"
Write-Host "  Start-Service StackLensOtel"
Write-Host ""
Write-Host "Endpoints (after starting services):" -ForegroundColor Cyan
Write-Host "  Kafka Bootstrap:  localhost:9092"
Write-Host "  OTEL gRPC:        localhost:4317"
Write-Host "  OTEL HTTP:        localhost:4318"
Write-Host "  OTEL Health:      localhost:13133"
Write-Host ""
Write-Host "To start services now, run:" -ForegroundColor Yellow
Write-Host "  & '$INSTALL_DIR\start-services.ps1'"
Write-Host ""
