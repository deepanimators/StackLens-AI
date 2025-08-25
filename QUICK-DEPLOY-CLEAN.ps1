# QUICK DEPLOY - StackLens-AI to Windows GPU Server
# Run as Administrator
param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STACKLENS-AI QUICK DEPLOYMENT" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean Replit Dependencies
Write-Host "Step 1: Cleaning Replit Dependencies..." -ForegroundColor Green
if (Test-Path "CLEAN-REPLIT-DEPS.ps1") {
    powershell -ExecutionPolicy Bypass -File "CLEAN-REPLIT-DEPS.ps1"
    Write-Host "✓ Replit dependencies cleaned" -ForegroundColor Green
} else {
    Write-Host "⚠ CLEAN-REPLIT-DEPS.ps1 not found, skipping..." -ForegroundColor Yellow
}

# Step 2: Install Node Dependencies
Write-Host ""
Write-Host "Step 2: Installing Node.js Dependencies..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node dependencies failed" -ForegroundColor Red
    exit 1
}

# Step 3: Install Python Dependencies
Write-Host ""
Write-Host "Step 3: Installing Python Dependencies..." -ForegroundColor Green
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Python dependencies failed" -ForegroundColor Red
    exit 1
}

# Step 4: Build the Application
Write-Host ""
Write-Host "Step 4: Building Application..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Step 5: Start Services
Write-Host ""
Write-Host "Step 5: Starting Services..." -ForegroundColor Green

# Start Vector Database Service
Write-Host "Starting Vector Database Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python python-services/start_vector_service.py"

# Wait a moment for vector service to start
Start-Sleep -Seconds 3

# Start Main Application
Write-Host "Starting Main Application..." -ForegroundColor Yellow
$env:SERVER_IP = $ServerIP
$env:PORT = $Port
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    DEPLOYMENT COMPLETED!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "   Main App: http://$ServerIP:$Port" -ForegroundColor White
Write-Host "   Share this URL with your staff!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Services are running in separate windows." -ForegroundColor Green
Write-Host "Close those windows to stop the services." -ForegroundColor Yellow
Write-Host ""
Write-Host "For updates, run:" -ForegroundColor Cyan
Write-Host "   1. Push changes to your Git repo" -ForegroundColor White
Write-Host "   2. Run: git pull" -ForegroundColor White
Write-Host "   3. Run: .\QUICK-DEPLOY-CLEAN.ps1 -ServerIP YOUR_SERVER_IP" -ForegroundColor White
Write-Host ""
