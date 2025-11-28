# start-stack-windows.ps1
# Comprehensive StackLens startup script for Windows
# Run from the project root directory: cd C:\Users\Administrator\Downloads\stacklens-ai

param(
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [switch]$SkipInfra,
    [switch]$DevMode
)

$ErrorActionPreference = "Continue"

# ============================================
# DETECT ROOT DIRECTORY - FIXED
# ============================================
$SCRIPT_DIR = $PSScriptRoot
$ROOT_DIR = $null

# Method 1: Script is in scripts folder
if ($SCRIPT_DIR -and (Test-Path "$SCRIPT_DIR\..\package.json")) {
    $ROOT_DIR = (Resolve-Path "$SCRIPT_DIR\..").Path
}
# Method 2: Running from project root
elseif (Test-Path ".\package.json") {
    $ROOT_DIR = (Get-Location).Path
}
# Method 3: Search for stacklens-ai in current path
else {
    $currentPath = (Get-Location).Path
    if ($currentPath -match "stacklens-ai") {
        # Extract path up to and including stacklens-ai
        if ($currentPath -match "^(.+stacklens-ai)") {
            $testPath = $matches[1]
            if (Test-Path "$testPath\package.json") {
                $ROOT_DIR = $testPath
            }
        }
    }
}

if (-not $ROOT_DIR) {
    Write-Host ""
    Write-Host "ERROR: Could not find project root directory." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run this script from the stacklens-ai project folder:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\Administrator\Downloads\stacklens-ai" -ForegroundColor White
    Write-Host "  .\scripts\start-stack-windows.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Ensure we're in the right directory
Set-Location $ROOT_DIR

# Colors for output
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host $msg -ForegroundColor Red }

# Store PIDs for cleanup
$global:ProcessIds = @()

# Cleanup function
function Stop-AllServices {
    Write-Host ""
    Write-Warn "Stopping all services..."
    
    foreach ($pid in $global:ProcessIds) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {}
    }
    
    # Also kill by port
    $ports = @(4000, 5173, 5174, 3000, 3001)
    foreach ($port in $ports) {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            } catch {}
        }
    }
    
    Write-Success "All services stopped."
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Stop-AllServices } | Out-Null

# Function to kill process on port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        try {
            Write-Warn "  Killing process on port $Port (PID: $($conn.OwningProcess))"
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        } catch {}
    }
}

# Function to wait for port
function Wait-ForPort {
    param(
        [int]$Port,
        [int]$Timeout = 60,
        [string]$ServiceName = "Service"
    )
    
    $elapsed = 0
    while ($elapsed -lt $Timeout) {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conn) {
            Write-Success "  $ServiceName is ready on port $Port"
            return $true
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    Write-Err "  Timeout waiting for $ServiceName on port $Port"
    return $false
}

# Header
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens AI Platform Startup" -ForegroundColor Cyan
Write-Host "  Windows Edition" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Root Directory: $ROOT_DIR"
Write-Host ""

# Navigate to root
Set-Location $ROOT_DIR

# ============================================
# STEP 1: Install Dependencies
# ============================================
if (-not $SkipInstall) {
    Write-Info "=== Step 1: Installing Dependencies ==="
    
    # Check for pnpm
    $pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue
    if (-not $pnpmExists) {
        Write-Warn "pnpm not found. Installing..."
        npm install -g pnpm
    }
    
    # Root dependencies
    Write-Info "Installing root dependencies..."
    pnpm install
    
    # POS Demo Backend
    Write-Info "Installing pos-demo/backend dependencies..."
    Set-Location "$ROOT_DIR\pos-demo\backend"
    if (Test-Path "package.json") {
        pnpm install
    }
    
    # POS Demo Frontend
    Write-Info "Installing pos-demo/frontend dependencies..."
    Set-Location "$ROOT_DIR\pos-demo\frontend"
    if (Test-Path "package.json") {
        pnpm install
    }
    
    # Legacy Stacklens Backend
    Write-Info "Installing stacklens/backend dependencies..."
    Set-Location "$ROOT_DIR\stacklens\backend"
    if (Test-Path "package.json") {
        pnpm install
    }
    
    # Demo POS App
    Write-Info "Installing demo-pos-app dependencies..."
    Set-Location "$ROOT_DIR\demo-pos-app"
    if (Test-Path "package.json") {
        pnpm install
    }
    
    Set-Location $ROOT_DIR
    Write-Success "All dependencies installed!"
    Write-Host ""
}

# ============================================
# STEP 2: Build Projects
# ============================================
if (-not $SkipBuild -and -not $DevMode) {
    Write-Info "=== Step 2: Building Projects ==="
    
    # Build main project
    Write-Info "Building main StackLens project..."
    Set-Location $ROOT_DIR
    pnpm run build
    
    # Build stacklens backend
    Write-Info "Building stacklens/backend..."
    Set-Location "$ROOT_DIR\stacklens\backend"
    if (Test-Path "package.json") {
        $pkgJson = Get-Content "package.json" | ConvertFrom-Json
        if ($pkgJson.scripts.build) {
            pnpm run build
        }
    }
    
    # Build demo-pos-app
    Write-Info "Building demo-pos-app..."
    Set-Location "$ROOT_DIR\demo-pos-app"
    if (Test-Path "package.json") {
        pnpm run build
    }
    
    Set-Location $ROOT_DIR
    Write-Success "All projects built!"
    Write-Host ""
}

# ============================================
# STEP 3: Check Infrastructure
# ============================================
if (-not $SkipInfra) {
    Write-Info "=== Step 3: Checking Infrastructure ==="
    
    # Check Kafka
    $kafkaPort = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
    if ($kafkaPort) {
        Write-Success "  Kafka is running on port 9092"
    } else {
        Write-Warn "  Kafka is NOT running on port 9092"
        Write-Warn "  Run infrastructure\start-services.ps1 first, or start Kafka manually"
    }
    
    # Check OTEL
    $otelPort = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue
    if ($otelPort) {
        Write-Success "  OTEL Collector is running on port 4317"
    } else {
        Write-Warn "  OTEL Collector is NOT running on port 4317"
    }
    
    Write-Host ""
}

# ============================================
# STEP 4: Start Services
# ============================================
Write-Info "=== Step 4: Starting Services ==="

# Load environment variables from .env if it exists
if (Test-Path "$ROOT_DIR\.env") {
    Write-Info "Loading environment variables from .env..."
    Get-Content "$ROOT_DIR\.env" | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Set Kafka broker for services
$env:KAFKA_BROKERS = "localhost:9092"
$env:ANALYTICS_URL = "http://localhost:4000/api/analytics/events"

# Create log files directory
$logsDir = "$ROOT_DIR\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
}

# ----- 4.1: Start StackLens API (Port 4000) -----
Write-Info "Starting StackLens API (Port 4000)..."
Stop-ProcessOnPort -Port 4000

Set-Location $ROOT_DIR
if ($DevMode) {
    $apiCmd = "pnpm run dev:server"
} else {
    $apiCmd = "pnpm run start"
}
# Create batch file for proper log redirection
$apiBatch = "$logsDir\start-api.bat"
"@echo off`r`ncd /d `"$ROOT_DIR`"`r`n$apiCmd > `"$logsDir\server.log`" 2>&1" | Out-File -FilePath $apiBatch -Encoding ASCII
$apiProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$apiBatch`"" -PassThru -WindowStyle Hidden
if ($apiProcess) {
    $global:ProcessIds += $apiProcess.Id
    Write-Success "  API process started (PID: $($apiProcess.Id))"
}

# Wait for API to be ready
Start-Sleep -Seconds 3
Wait-ForPort -Port 4000 -ServiceName "StackLens API" -Timeout 60

# ----- 4.2: Start StackLens Frontend (Port 5173) -----
Write-Info "Starting StackLens Frontend (Port 5173)..."
Stop-ProcessOnPort -Port 5173

Set-Location $ROOT_DIR
$frontendBatch = "$logsDir\start-frontend.bat"
"@echo off`r`ncd /d `"$ROOT_DIR`"`r`npnpm run dev:client > `"$logsDir\client.log`" 2>&1" | Out-File -FilePath $frontendBatch -Encoding ASCII
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$frontendBatch`"" -PassThru -WindowStyle Hidden
if ($frontendProcess) {
    $global:ProcessIds += $frontendProcess.Id
    Write-Success "  Frontend process started (PID: $($frontendProcess.Id))"
}

# Wait for Frontend
Start-Sleep -Seconds 3
Wait-ForPort -Port 5173 -ServiceName "StackLens Frontend" -Timeout 30

# ----- 4.3: Start Legacy Backend (Port 3001) -----
Write-Info "Starting Legacy Backend (Port 3001)..."
Stop-ProcessOnPort -Port 3001

$legacyDir = "$ROOT_DIR\stacklens\backend"
if (Test-Path "$legacyDir\package.json") {
    $legacyBatch = "$logsDir\start-legacy.bat"
    "@echo off`r`ncd /d `"$legacyDir`"`r`nset PORT=3001`r`npnpm run start > `"$logsDir\legacy_backend.log`" 2>&1" | Out-File -FilePath $legacyBatch -Encoding ASCII
    $legacyProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$legacyBatch`"" -PassThru -WindowStyle Hidden
    if ($legacyProcess) {
        $global:ProcessIds += $legacyProcess.Id
        Write-Success "  Legacy Backend process started (PID: $($legacyProcess.Id))"
    }
} else {
    Write-Warn "  Skipping Legacy Backend (directory not found: $legacyDir)"
}

# ----- 4.4: Start POS Demo Backend (Port 3000) -----
Write-Info "Starting POS Demo Backend (Port 3000)..."
Stop-ProcessOnPort -Port 3000

$posBackendDir = "$ROOT_DIR\pos-demo\backend"
if (Test-Path "$posBackendDir\package.json") {
    $posBackendBatch = "$logsDir\start-pos-backend.bat"
    "@echo off`r`ncd /d `"$posBackendDir`"`r`nset PORT=3000`r`npnpm run start > `"$logsDir\pos_backend.log`" 2>&1" | Out-File -FilePath $posBackendBatch -Encoding ASCII
    $posBackendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$posBackendBatch`"" -PassThru -WindowStyle Hidden
    if ($posBackendProcess) {
        $global:ProcessIds += $posBackendProcess.Id
        Write-Success "  POS Backend process started (PID: $($posBackendProcess.Id))"
    }
    Start-Sleep -Seconds 2
    Wait-ForPort -Port 3000 -ServiceName "POS Demo Backend" -Timeout 30
} else {
    Write-Warn "  Skipping POS Demo Backend (directory not found: $posBackendDir)"
}

# ----- 4.5: Start POS Demo Frontend (Port 5174) -----
Write-Info "Starting POS Demo Frontend (Port 5174)..."
Stop-ProcessOnPort -Port 5174

$posFrontendDir = "$ROOT_DIR\pos-demo\frontend"
if (Test-Path "$posFrontendDir\package.json") {
    $posFrontendBatch = "$logsDir\start-pos-frontend.bat"
    "@echo off`r`ncd /d `"$posFrontendDir`"`r`npnpm run dev -- --port 5174 > `"$logsDir\pos_frontend.log`" 2>&1" | Out-File -FilePath $posFrontendBatch -Encoding ASCII
    $posFrontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "`"$posFrontendBatch`"" -PassThru -WindowStyle Hidden
    if ($posFrontendProcess) {
        $global:ProcessIds += $posFrontendProcess.Id
        Write-Success "  POS Frontend process started (PID: $($posFrontendProcess.Id))"
    }
    Start-Sleep -Seconds 2
    Wait-ForPort -Port 5174 -ServiceName "POS Demo Frontend" -Timeout 30
} else {
    Write-Warn "  Skipping POS Demo Frontend (directory not found: $posFrontendDir)"
}

Set-Location $ROOT_DIR

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service Endpoints:" -ForegroundColor Cyan
Write-Host "  StackLens UI:   http://localhost:5173" -ForegroundColor White
Write-Host "  StackLens API:  http://localhost:4000" -ForegroundColor White
Write-Host "  POS Demo Shop:  http://localhost:5174" -ForegroundColor White
Write-Host "  POS Demo API:   http://localhost:3000" -ForegroundColor White
Write-Host "  Legacy Backend: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Infrastructure:" -ForegroundColor Cyan
Write-Host "  Kafka:          localhost:9092" -ForegroundColor White
Write-Host "  OTEL gRPC:      localhost:4317" -ForegroundColor White
Write-Host "  OTEL HTTP:      localhost:4318" -ForegroundColor White
Write-Host ""
Write-Host "Logs Directory: $logsDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Process IDs: $($global:ProcessIds -join ', ')" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all services, run:" -ForegroundColor Yellow
Write-Host "  .\scripts\stop-stack-windows.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Or close this PowerShell window to stop all services." -ForegroundColor Yellow
Write-Host ""

# Keep script running and tail logs
Write-Info "Tailing logs (Ctrl+C to stop all services)..."
Write-Host ""

try {
    # Create a combined log file
    $logFiles = Get-ChildItem -Path $logsDir -Filter "*.log" -ErrorAction SilentlyContinue
    
    while ($true) {
        foreach ($logFile in $logFiles) {
            $content = Get-Content $logFile.FullName -Tail 1 -ErrorAction SilentlyContinue
            if ($content) {
                Write-Host "[$($logFile.BaseName)] $content"
            }
        }
        Start-Sleep -Seconds 2
        
        # Refresh log file list
        $logFiles = Get-ChildItem -Path $logsDir -Filter "*.log" -ErrorAction SilentlyContinue
    }
} finally {
    Stop-AllServices
}
