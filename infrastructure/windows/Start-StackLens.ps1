<#
.SYNOPSIS
    Start StackLens Applications for Production
    All services bind to 0.0.0.0 (accessible via Cloudflare)

.DESCRIPTION
    Starts all StackLens applications:
    - Main Frontend on 0.0.0.0:5173
    - Main API on 0.0.0.0:4000
    - POS Frontend on 0.0.0.0:5174
    - POS API on 0.0.0.0:3000

    Cloudflare connects directly to these ports (no IIS/nginx needed)
    Ports 80/443 are NOT used.

.EXAMPLE
    .\Start-StackLens.ps1
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = "C:\StackLens-AI"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Starting StackLens Applications" -ForegroundColor Cyan
Write-Host "   (Cloudflare connects directly - no IIS/port 80)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:NODE_ENV = "production"
$env:HOST = "0.0.0.0"

# Create logs directory
$logsDir = "$ProjectPath\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Function to start a Node.js application
function Start-NodeApplication {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Command,
        [int]$Port,
        [string]$LogFile
    )
    
    Write-Host "  Starting $Name on 0.0.0.0:$Port..." -ForegroundColor White
    
    # Check if something is already running on this port
    $existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "    ⚠ Port $Port already in use, stopping existing process..." -ForegroundColor Yellow
        $existing | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }
    
    # Set port-specific environment
    $env:PORT = $Port
    
    # Start the process
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "cmd.exe"
    $processInfo.Arguments = "/c cd /d `"$WorkingDirectory`" && $Command >> `"$LogFile`" 2>&1"
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $processInfo.WorkingDirectory = $WorkingDirectory
    
    # Add environment variables
    $processInfo.EnvironmentVariables["NODE_ENV"] = "production"
    $processInfo.EnvironmentVariables["HOST"] = "0.0.0.0"
    $processInfo.EnvironmentVariables["PORT"] = $Port.ToString()
    
    $process = [System.Diagnostics.Process]::Start($processInfo)
    
    # Save PID
    $process.Id | Out-File "$logsDir\$Name.pid" -Force
    
    # Wait and check if it started
    Start-Sleep -Seconds 3
    
    $running = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($running) {
        Write-Host "    ✓ Started successfully (PID: $($process.Id))" -ForegroundColor Green
        return $true
    } else {
        Write-Host "    ⚠ May still be starting..." -ForegroundColor Yellow
        return $false
    }
}

# Navigate to project root
Set-Location $ProjectPath

# 1. Start Main API (port 4000)
Write-Host ""
Write-Host "[1/4] Main API Backend" -ForegroundColor Cyan
Start-NodeApplication `
    -Name "main-api" `
    -WorkingDirectory $ProjectPath `
    -Command "npm run start" `
    -Port 4000 `
    -LogFile "$logsDir\main-api.log"

# 2. Start Main Frontend (port 5173) - For production, serve built files
Write-Host ""
Write-Host "[2/4] Main Frontend" -ForegroundColor Cyan

# Check if we should run dev or serve built files
$distPath = "$ProjectPath\dist\public"
if (Test-Path $distPath) {
    # Serve static files using a simple server
    Start-NodeApplication `
        -Name "main-frontend" `
        -WorkingDirectory $ProjectPath `
        -Command "npx serve -s dist/public -l 5173" `
        -Port 5173 `
        -LogFile "$logsDir\main-frontend.log"
} else {
    Write-Host "    ⚠ Built files not found. Run 'npm run build' first or starting dev server..." -ForegroundColor Yellow
    Start-NodeApplication `
        -Name "main-frontend" `
        -WorkingDirectory $ProjectPath `
        -Command "npm run dev:client" `
        -Port 5173 `
        -LogFile "$logsDir\main-frontend.log"
}

# 3. Start POS Backend (port 3000)
Write-Host ""
Write-Host "[3/4] POS API Backend" -ForegroundColor Cyan
$posBackendPath = "$ProjectPath\pos-demo\backend"
if (Test-Path $posBackendPath) {
    Start-NodeApplication `
        -Name "pos-api" `
        -WorkingDirectory $posBackendPath `
        -Command "npm run start" `
        -Port 3000 `
        -LogFile "$logsDir\pos-api.log"
} else {
    Write-Host "    ⚠ POS backend not found at $posBackendPath" -ForegroundColor Yellow
}

# 4. Start POS Frontend (port 5174)
Write-Host ""
Write-Host "[4/4] POS Frontend" -ForegroundColor Cyan
$posFrontendPath = "$ProjectPath\pos-demo\frontend"
if (Test-Path $posFrontendPath) {
    $posDistPath = "$posFrontendPath\dist"
    if (Test-Path $posDistPath) {
        Start-NodeApplication `
            -Name "pos-frontend" `
            -WorkingDirectory $posFrontendPath `
            -Command "npx serve -s dist -l 5174" `
            -Port 5174 `
            -LogFile "$logsDir\pos-frontend.log"
    } else {
        Start-NodeApplication `
            -Name "pos-frontend" `
            -WorkingDirectory $posFrontendPath `
            -Command "npm run dev" `
            -Port 5174 `
            -LogFile "$logsDir\pos-frontend.log"
    }
} else {
    Write-Host "    ⚠ POS frontend not found at $posFrontendPath" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   All Applications Started!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "   Application Ports (Cloudflare connects here):" -ForegroundColor White
Write-Host "   ─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   Main Frontend:  http://0.0.0.0:5173" -ForegroundColor Cyan
Write-Host "   Main API:       http://0.0.0.0:4000" -ForegroundColor Cyan
Write-Host "   POS Frontend:   http://0.0.0.0:5174" -ForegroundColor Cyan
Write-Host "   POS API:        http://0.0.0.0:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Public URLs (via Cloudflare):" -ForegroundColor White
Write-Host "   ─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   🌐 https://stacklens.app" -ForegroundColor Green
Write-Host "   🔌 https://api.stacklens.app" -ForegroundColor Green
Write-Host "   🛒 https://pos.stacklens.app" -ForegroundColor Green
Write-Host "   🔌 https://posapi.stacklens.app" -ForegroundColor Green
Write-Host ""
Write-Host "   NOTE: Ports 80/443 are NOT used (available for other apps)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Logs: $logsDir" -ForegroundColor Gray
Write-Host ""
Write-Host "   To stop: .\Stop-StackLens.ps1" -ForegroundColor Yellow
Write-Host ""
