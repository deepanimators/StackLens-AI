# QUICK DEPLOY - StackLens-AI with Python 3.12
# Run as Administrator
param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STACKLENS-AI QUICK DEPLOYMENT" -ForegroundColor Yellow
Write-Host "    (Python 3.12 Optimized)" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 0: Setup Python 3.12
Write-Host "Step 0: Setting up Python 3.12..." -ForegroundColor Green
$pythonCmd = powershell -ExecutionPolicy Bypass -File "SETUP-PYTHON312.ps1"
if (-not $env:PYTHON312_CMD) {
    Write-Host "✗ Failed to setup Python 3.12" -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: $($env:PYTHON312_CMD)" -ForegroundColor Green

# Step 1: Clean Replit Dependencies
Write-Host ""
Write-Host "Step 1: Cleaning Replit Dependencies..." -ForegroundColor Green
if (Test-Path "CLEAN-REPLIT-DEPS-NEW.ps1") {
    powershell -ExecutionPolicy Bypass -File "CLEAN-REPLIT-DEPS-NEW.ps1"
} else {
    Write-Host "Manually cleaning Replit dependencies..." -ForegroundColor Yellow
    
    # Clean package.json
    if (Test-Path "package.json") {
        $packageJson = Get-Content "package.json" -Raw
        $packageJson = $packageJson -replace '"@replit/vite-plugin-cartographer":\s*"[^"]*",?\s*', ''
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
}

# Step 2: Install Node Dependencies
Write-Host ""
Write-Host "Step 2: Installing Node.js Dependencies..." -ForegroundColor Green
npm install --legacy-peer-deps
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Node dependencies had warnings, continuing..." -ForegroundColor Yellow
}

# Step 3: Install Python 3.12 Dependencies
Write-Host ""
Write-Host "Step 3: Installing Python 3.12 Dependencies..." -ForegroundColor Green

# Upgrade pip, setuptools, and wheel using Python 3.12
Write-Host "Upgrading pip and setuptools..." -ForegroundColor Yellow
& $env:PYTHON312_CMD -m pip install --upgrade pip setuptools wheel

# Install Python 3.12 compatible packages
if (Test-Path "requirements-python312.txt") {
    Write-Host "Installing from requirements-python312.txt..." -ForegroundColor Yellow
    & $env:PYTHON312_CMD -m pip install -r requirements-python312.txt
} else {
    Write-Host "Installing core packages individually..." -ForegroundColor Yellow
    & $env:PYTHON312_CMD -m pip install fastapi==0.104.1
    & $env:PYTHON312_CMD -m pip install "uvicorn[standard]==0.24.0"
    & $env:PYTHON312_CMD -m pip install python-multipart==0.0.6
    & $env:PYTHON312_CMD -m pip install sentence-transformers==2.2.2
    & $env:PYTHON312_CMD -m pip install numpy==1.24.3
    & $env:PYTHON312_CMD -m pip install requests==2.31.0
    & $env:PYTHON312_CMD -m pip install aiofiles==23.2.1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python 3.12 dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Some Python packages had issues, but continuing..." -ForegroundColor Yellow
}

# Step 4: Build the Application
Write-Host ""
Write-Host "Step 4: Building Application..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application built successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    Write-Host "Trying alternative build..." -ForegroundColor Yellow
    npx vite build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Alternative build successful" -ForegroundColor Green
    } else {
        Write-Host "Build failed, but continuing with existing files..." -ForegroundColor Yellow
    }
}

# Step 5: Start Services
Write-Host ""
Write-Host "Step 5: Starting Services..." -ForegroundColor Green

# Create startup commands that use Python 3.12
$vectorServiceCmd = "cd '$PWD'; $($env:PYTHON312_CMD) python-services/start_vector_service.py"
$mainAppCmd = "cd '$PWD'; `$env:SERVER_IP='$ServerIP'; `$env:PORT='$Port'; npm start"

# Start Vector Database Service with Python 3.12
Write-Host "Starting Vector Database Service with Python 3.12..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", $vectorServiceCmd

# Wait a moment for vector service to start
Start-Sleep -Seconds 5

# Start Main Application
Write-Host "Starting Main Application..." -ForegroundColor Yellow
$env:SERVER_IP = $ServerIP
$env:PORT = $Port
Start-Process powershell -ArgumentList "-NoExit", "-Command", $mainAppCmd

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    DEPLOYMENT COMPLETED!" -ForegroundColor Yellow
Write-Host "    (Running on Python 3.12)" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
$url = "http://${ServerIP}:${Port}"
Write-Host "   Main App: $url" -ForegroundColor White
Write-Host "   Share this URL with your staff!" -ForegroundColor Yellow
Write-Host ""
Write-Host "🐍 Python Info:" -ForegroundColor Green
Write-Host "   Command: $($env:PYTHON312_CMD)" -ForegroundColor White
Write-Host "   Version: Python 3.12" -ForegroundColor White
Write-Host ""
Write-Host "📝 Services are running in separate windows." -ForegroundColor Green
Write-Host "   Close those windows to stop the services." -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 For updates:" -ForegroundColor Cyan
Write-Host "   1. Push changes to your Git repo" -ForegroundColor White
Write-Host "   2. Run: git pull" -ForegroundColor White
Write-Host "   3. Run: .\QUICK-DEPLOY-PYTHON312.ps1 -ServerIP ${ServerIP}" -ForegroundColor White
Write-Host ""
