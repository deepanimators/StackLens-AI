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
# Use SHORT path to avoid Windows "input line too long" error in Kafka batch scripts
$INSTALL_DIR = "C:\stacklens-svc"
$PROJECT_DIR = "C:\Users\Administrator\Downloads\stacklens-ai"
$KAFKA_VERSION = "3.9.0"
$SCALA_VERSION = "2.13"
$OTEL_VERSION = "0.91.0"
$JAVA_VERSION = "21"

# URLs - Using Apache archive for reliability
$KAFKA_URL = "https://archive.apache.org/dist/kafka/$KAFKA_VERSION/kafka_$SCALA_VERSION-$KAFKA_VERSION.tgz"
$OTEL_URL = "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v$OTEL_VERSION/otelcol-contrib_${OTEL_VERSION}_windows_amd64.tar.gz"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Installer" -ForegroundColor Cyan
Write-Host "  Windows EC2 (No Docker)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services will be installed to: $INSTALL_DIR" -ForegroundColor Yellow
Write-Host "(Short path avoids Windows command line length limits)" -ForegroundColor Gray
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
        
        # Try Chocolatey with correct package name
        try {
            choco install temurin21 -y
            Write-Host "Java installed via Chocolatey!" -ForegroundColor Green
        } catch {
            # Try alternative package names
            try {
                choco install temurin -y
                Write-Host "Java (Temurin) installed via Chocolatey!" -ForegroundColor Green
            } catch {
                try {
                    choco install adoptopenjdk21 -y
                    Write-Host "Java (AdoptOpenJDK) installed via Chocolatey!" -ForegroundColor Green
                } catch {
                    Write-Host "ERROR: Could not install Java automatically." -ForegroundColor Red
                    Write-Host "Please install Java manually from: https://adoptium.net/" -ForegroundColor Yellow
                    Write-Host "Or run: choco install temurin21" -ForegroundColor Yellow
                    exit 1
                }
            }
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
    
    # Download Kafka with multiple mirror options
    Write-Host "Downloading Kafka from Apache mirrors..." -ForegroundColor Yellow
    
    $downloadUrls = @(
        "https://archive.apache.org/dist/kafka/$KAFKA_VERSION/kafka_$SCALA_VERSION-$KAFKA_VERSION.tgz",
        "https://downloads.apache.org/kafka/$KAFKA_VERSION/kafka_$SCALA_VERSION-$KAFKA_VERSION.tgz",
        "https://dlcdn.apache.org/kafka/$KAFKA_VERSION/kafka_$SCALA_VERSION-$KAFKA_VERSION.tgz"
    )
    
    $downloadSuccess = $false
    foreach ($url in $downloadUrls) {
        try {
            Write-Host "  Trying: $url" -ForegroundColor Gray
            # Use more reliable download with progress
            $ProgressPreference = 'SilentlyContinue'
            Invoke-WebRequest -Uri $url -OutFile $kafkaArchive -UseBasicParsing -TimeoutSec 300
            $downloadSuccess = $true
            Write-Host "  Download successful!" -ForegroundColor Green
            break
        } catch {
            Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    if (-not $downloadSuccess) {
        Write-Host "ERROR: Could not download Kafka from any mirror." -ForegroundColor Red
        Write-Host "Please download manually from: https://kafka.apache.org/downloads" -ForegroundColor Yellow
        Write-Host "Extract to: $kafkaDir" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Extracting Kafka..." -ForegroundColor Yellow
    
    # Extract using tar (available in Windows 10+)
    Push-Location $INSTALL_DIR
    tar -xzf kafka.tgz
    
    # Handle rename - check if target already exists
    $extractedFolder = "kafka_$SCALA_VERSION-$KAFKA_VERSION"
    if (Test-Path $kafkaDir) {
        Write-Host "  Kafka folder already exists, skipping rename..." -ForegroundColor Yellow
        # Clean up extracted folder if it exists
        if (Test-Path $extractedFolder) {
            Remove-Item $extractedFolder -Recurse -Force -ErrorAction SilentlyContinue
        }
    } elseif (Test-Path $extractedFolder) {
        try {
            Rename-Item $extractedFolder "kafka" -ErrorAction Stop
        } catch {
            Write-Host "  Rename failed, trying robocopy..." -ForegroundColor Yellow
            robocopy $extractedFolder "kafka" /E /MOVE /NFL /NDL /NJH /NJS | Out-Null
            if (Test-Path $extractedFolder) {
                Remove-Item $extractedFolder -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
    
    # Clean up archive
    if (Test-Path $kafkaArchive) {
        Remove-Item $kafkaArchive -ErrorAction SilentlyContinue
    }
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
    
    # Create data directory
    $dataDir = "$INSTALL_DIR\data\kafka-logs"
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
    }
    
    $clusterIdFile = "$INSTALL_DIR\data\cluster_id.txt"
    if (-not (Test-Path $clusterIdFile)) {
        # Use a pre-generated valid cluster ID to avoid path issues on Windows
        # Kafka cluster IDs are base64-encoded UUIDs (22 characters)
        $clusterId = "MkU3OEVBNTcwNTJENDM2Qk"
        
        # Try to generate via Kafka command, but use fallback if it fails
        Push-Location $kafkaDir
        try {
            $genResult = & cmd /c "bin\windows\kafka-storage.bat random-uuid 2>nul"
            if ($genResult -and $genResult.Length -ge 20 -and -not $genResult.Contains("error") -and -not $genResult.Contains("input")) {
                $clusterId = $genResult.Trim()
            }
        } catch {
            Write-Host "  Using fallback cluster ID" -ForegroundColor Yellow
        }
        Pop-Location
        
        $clusterId | Out-File -FilePath $clusterIdFile -Encoding UTF8
        Write-Host "  Cluster ID: $clusterId" -ForegroundColor Gray
        
        # Format storage using relative paths to avoid "input line too long" error
        Write-Host "Formatting Kafka storage..." -ForegroundColor Yellow
        Push-Location $kafkaDir
        try {
            & cmd /c "bin\windows\kafka-storage.bat format -t $clusterId -c `"..\config\kraft-server.properties`" 2>&1" | Out-Null
            Write-Host "  Storage formatted successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  Format warning: $_" -ForegroundColor Yellow
        }
        Pop-Location
    } else {
        Write-Host "  Cluster ID already exists, skipping format" -ForegroundColor Yellow
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
    
    # Get 8.3 short paths to avoid "input line too long" error with NSSM
    $fso = New-Object -ComObject Scripting.FileSystemObject
    $shortInstallDir = $fso.GetFolder($INSTALL_DIR).ShortPath
    $shortKafkaDir = $fso.GetFolder("$INSTALL_DIR\kafka").ShortPath
    $shortOtelDir = $fso.GetFolder("$INSTALL_DIR\otel-collector").ShortPath
    
    Write-Host "  Using short paths for services:" -ForegroundColor Gray
    Write-Host "    Install: $shortInstallDir" -ForegroundColor Gray
    
    # Create Kafka Service (check if exists first)
    Write-Host "Creating Kafka Windows Service..." -ForegroundColor Yellow
    $kafkaSvc = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
    if ($kafkaSvc) {
        Write-Host "  Service StackLensKafka already exists, updating configuration..." -ForegroundColor Yellow
        # Stop service before updating
        Stop-Service -Name "StackLensKafka" -Force -ErrorAction SilentlyContinue
        # Remove and recreate to update path
        & $nssmPath remove StackLensKafka confirm 2>$null
    }
    
    # Use short paths for Kafka service
    $kafkaBat = "$shortKafkaDir\bin\windows\kafka-server-start.bat"
    $kafkaConfig = "$shortInstallDir\config\kraft-server.properties"
    
    & $nssmPath install StackLensKafka "$kafkaBat" "$kafkaConfig" 2>$null
    & $nssmPath set StackLensKafka AppDirectory "$shortKafkaDir"
    & $nssmPath set StackLensKafka DisplayName "StackLens Kafka"
    & $nssmPath set StackLensKafka Description "Apache Kafka for StackLens"
    & $nssmPath set StackLensKafka Start SERVICE_AUTO_START
    & $nssmPath set StackLensKafka AppStdout "$shortInstallDir\logs\kafka-stdout.log"
    & $nssmPath set StackLensKafka AppStderr "$shortInstallDir\logs\kafka-stderr.log"
    Write-Host "  Kafka service configured!" -ForegroundColor Green
    
    # Create OTEL Service (check if exists first)
    Write-Host "Creating OpenTelemetry Collector Windows Service..." -ForegroundColor Yellow
    $otelSvc = Get-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
    if ($otelSvc) {
        Write-Host "  Service StackLensOtel already exists, updating configuration..." -ForegroundColor Yellow
        Stop-Service -Name "StackLensOtel" -Force -ErrorAction SilentlyContinue
        & $nssmPath remove StackLensOtel confirm 2>$null
    }
    
    # Use short paths for OTEL service
    $otelExe = "$shortOtelDir\otelcol-contrib.exe"
    $otelConfig = "$shortInstallDir\config\otel-collector-config.yaml"
    
    & $nssmPath install StackLensOtel "$otelExe" "--config=$otelConfig" 2>$null
    & $nssmPath set StackLensOtel AppDirectory "$shortOtelDir"
    & $nssmPath set StackLensOtel DisplayName "StackLens OpenTelemetry Collector"
    & $nssmPath set StackLensOtel Description "OpenTelemetry Collector for StackLens"
    & $nssmPath set StackLensOtel Start SERVICE_AUTO_START
    & $nssmPath set StackLensOtel AppStdout "$shortInstallDir\logs\otel-stdout.log"
    & $nssmPath set StackLensOtel AppStderr "$shortInstallDir\logs\otel-stderr.log"
    Write-Host "  OTEL service configured!" -ForegroundColor Green
    
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

# NOTE: Management scripts (start-services.ps1, stop-services.ps1, status-services.ps1)
# are already included in the git repository with full functionality.
# We skip creating them here to avoid overwriting the improved versions.

Write-Host ""
Write-Host "Management scripts available in $INSTALL_DIR" -ForegroundColor Green

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
