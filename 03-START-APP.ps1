# 03 - START APPLICATION (FIXED)
# Run after 02-SETUP.ps1

param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STEP 3: START APPLICATION" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Setup Python environment
Write-Host "Setting up Python environment..." -ForegroundColor Green
powershell -ExecutionPolicy Bypass -File "SETUP-PYTHON.ps1"

# Set environment variables
$env:SERVER_IP = $ServerIP
$env:PORT = $Port

Write-Host "Starting services..." -ForegroundColor Green
Write-Host "Server IP: $ServerIP" -ForegroundColor White
Write-Host "Port: $Port" -ForegroundColor White
Write-Host ""

# Start Vector Database Service
Write-Host "Starting Vector Database Service..." -ForegroundColor Yellow
$currentPath = Get-Location
$vectorCommand = "cd '$currentPath'; python python-services/start_vector_service.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $vectorCommand -WindowStyle Normal

# Wait for vector service to initialize
Write-Host "Waiting for vector service to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start Main Application
Write-Host "Starting Main Application..." -ForegroundColor Yellow
$appCommand = "cd '$currentPath'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $appCommand -WindowStyle Normal

# Wait a moment for app to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    APPLICATION STARTED!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
$mainUrl = "http://" + $ServerIP + ":" + $Port
Write-Host "   Main App: $mainUrl" -ForegroundColor White
Write-Host "   Vector DB: http://localhost:8001" -ForegroundColor White
Write-Host ""
Write-Host "Services Status:" -ForegroundColor Green
Write-Host "   Vector Database Service (Port 8001)" -ForegroundColor White
$portText = "Main Application (Port " + $Port + ")"
Write-Host "   $portText" -ForegroundColor White
Write-Host ""
Write-Host "Share this URL with your staff:" -ForegroundColor Cyan
Write-Host "   $mainUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Red
Write-Host "   Close the PowerShell windows that opened" -ForegroundColor White
Write-Host ""
Write-Host "To restart later:" -ForegroundColor Cyan
$restartCmd = ".\03-START-APP.ps1 -ServerIP " + $ServerIP
Write-Host "   Run: $restartCmd" -ForegroundColor White
Write-Host ""

# Optional: Open browser
$response = Read-Host "Open browser to test? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Start-Process $mainUrl
}

pause
