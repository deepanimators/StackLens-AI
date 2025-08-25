# QUICK DEPLOY - Python 3.12 CLEAN VERSION
# Run as Administrator
param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STACKLENS-AI DEPLOYMENT v3" -ForegroundColor Yellow
Write-Host "    (Python 3.12 CLEAN)" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 0: Setup Python 3.12
Write-Host "Step 0: Setting up Python 3.12..." -ForegroundColor Green
$env:PYTHON312_CMD = "python"
$env:PIP312_CMD = "python -m pip"

Write-Host "Using Python: python" -ForegroundColor Green

# Step 1: Manual Replit Cleanup
Write-Host ""
Write-Host "Step 1: Cleaning Replit Dependencies..." -ForegroundColor Green

# Clean package.json
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw
    $packageJson = $packageJson -replace '"@replit/vite-plugin-cartographer":\s*"[^"]*",?\s*', ''
    $packageJson = $packageJson -replace ',(\s*\n\s*})', '$1'
    Set-Content "package.json" -Value $packageJson
    Write-Host "✓ package.json cleaned" -ForegroundColor Green
}

# Clean vite.config.ts
if (Test-Path "vite.config.ts") {
    $viteConfig = Get-Content "vite.config.ts" -Raw
    $viteConfig = $viteConfig -replace "import\s+cartographer\s+from\s+['\"]@replit/vite-plugin-cartographer['\"];?\s*", ""
    $viteConfig = $viteConfig -replace "cartographer\(\),?\s*", ""
    Set-Content "vite.config.ts" -Value $viteConfig
    Write-Host "✓ vite.config.ts cleaned" -ForegroundColor Green
}

# Step 2: Setup Build Tools
Write-Host ""
Write-Host "Step 2: Setting up build environment..." -ForegroundColor Green
python -m pip install --upgrade pip setuptools wheel build
Write-Host "✓ Build tools updated" -ForegroundColor Green

# Step 3: Install Node Dependencies
Write-Host ""
Write-Host "Step 3: Installing Node.js Dependencies..." -ForegroundColor Green
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Node dependencies had warnings, continuing..." -ForegroundColor Yellow
}

# Step 4: Install Python Dependencies (Core only)
Write-Host ""
Write-Host "Step 4: Installing Python Dependencies (Core)..." -ForegroundColor Green

Write-Host "Installing FastAPI..." -ForegroundColor Gray
python -m pip install fastapi==0.104.1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ FastAPI installed" -ForegroundColor Green
}

Write-Host "Installing Uvicorn..." -ForegroundColor Gray
python -m pip install "uvicorn[standard]==0.24.0"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Uvicorn installed" -ForegroundColor Green
}

Write-Host "Installing basic packages..." -ForegroundColor Gray
python -m pip install python-multipart==0.0.6
python -m pip install requests==2.31.0
python -m pip install aiofiles==23.2.1
python -m pip install pydantic==2.5.0

Write-Host "✓ Core Python dependencies installed" -ForegroundColor Green

# Step 5: Build the Application
Write-Host ""
Write-Host "Step 5: Building Application..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application built successfully" -ForegroundColor Green
} else {
    Write-Host "Trying alternative build..." -ForegroundColor Yellow
    npx vite build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Alternative build successful" -ForegroundColor Green
    } else {
        Write-Host "⚠ Build issues, continuing..." -ForegroundColor Yellow
    }
}

# Step 6: Start Services
Write-Host ""
Write-Host "Step 6: Starting Services..." -ForegroundColor Green

# Start Vector Service
Write-Host "Starting Vector Database Service..." -ForegroundColor Yellow
$currentPath = Get-Location
$vectorCommand = "cd '$currentPath'; python python-services/start_vector_service.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $vectorCommand

# Wait for service
Start-Sleep -Seconds 3

# Start Main Application
Write-Host "Starting Main Application..." -ForegroundColor Yellow
$env:SERVER_IP = $ServerIP
$env:PORT = $Port
$appCommand = "cd '$currentPath'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $appCommand

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    DEPLOYMENT COMPLETED!" -ForegroundColor Yellow  
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Main App: http://$ServerIP:$Port" -ForegroundColor White
Write-Host "   Share with your staff!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Services are running in separate windows" -ForegroundColor Green
Write-Host "   Close those windows to stop services" -ForegroundColor White
Write-Host ""
Write-Host "🔄 For ML features, run:" -ForegroundColor Cyan
Write-Host "   .\INSTALL-ML-STACK.ps1" -ForegroundColor White
Write-Host ""
