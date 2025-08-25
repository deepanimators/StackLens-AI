# QUICK DEPLOY - All-in-One Deployment
# Run as Administrator

param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STACKLENS-AI QUICK DEPLOY" -ForegroundColor Yellow
Write-Host "    (All-in-One Solution)" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Server IP: $ServerIP" -ForegroundColor White
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host ""

$response = Read-Host "Continue with deployment? (y/n)"
if ($response -ne 'y' -and $response -ne 'Y') {
    exit 0
}

# Step 1: Install Prerequisites (if needed)
Write-Host ""
Write-Host "STEP 1: Installing Prerequisites..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray

# Check if tools are installed
$needsInstall = $false

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $needsInstall = $true
    Write-Host "Node.js not found, will install..." -ForegroundColor Yellow
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    $needsInstall = $true
    Write-Host "Python not found, will install..." -ForegroundColor Yellow
}

if ($needsInstall) {
    Write-Host "Running prerequisite installation..." -ForegroundColor Yellow
    powershell -ExecutionPolicy Bypass -File "01-INSTALL.ps1"
    Write-Host "Prerequisites installed, please restart this script." -ForegroundColor Green
    pause
    exit 0
} else {
    Write-Host "All prerequisites found" -ForegroundColor Green
}

# Step 2: Setup Application
Write-Host ""
Write-Host "STEP 2: Setting up Application..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
powershell -ExecutionPolicy Bypass -File "02-SETUP.ps1" -ServerIP $ServerIP -Port $Port

# Step 3: Start Application
Write-Host ""
Write-Host "STEP 3: Starting Application..." -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
powershell -ExecutionPolicy Bypass -File "03-START-APP.ps1" -ServerIP $ServerIP -Port $Port

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    QUICK DEPLOY COMPLETED!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your StackLens-AI is now running!" -ForegroundColor Green
Write-Host ""
$accessUrl = "http://" + $ServerIP + ":" + $Port
Write-Host "Access URL: $accessUrl" -ForegroundColor Cyan
Write-Host "Share this URL with your staff!" -ForegroundColor Yellow
Write-Host ""
