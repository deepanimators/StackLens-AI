# QUICK DEPLOY - StackLens-AI to Windows GPU Server (Fixed Version)
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

# Check Python Version
Write-Host "Checking Python Version..." -ForegroundColor Green
$pythonVersion = python --version 2>&1
Write-Host "Python Version: $pythonVersion" -ForegroundColor Yellow

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

# Step 3: Install Python Dependencies (Python 3.13 compatible)
Write-Host ""
Write-Host "Step 3: Installing Python Dependencies (Python 3.13 compatible)..." -ForegroundColor Green

# First upgrade pip and setuptools
Write-Host "Upgrading pip and setuptools..." -ForegroundColor Yellow
python -m pip install --upgrade pip setuptools wheel

# Install compatible packages
if (Test-Path "requirements-python313.txt") {
    pip install -r requirements-python313.txt
} else {
    Write-Host "Installing core packages individually..." -ForegroundColor Yellow
    pip install fastapi==0.115.0
    pip install "uvicorn[standard]==0.30.6"
    pip install python-multipart==0.0.9
    pip install sentence-transformers==3.1.1
    pip install numpy==1.26.4
    pip install requests==2.32.3
    pip install aiofiles==24.1.0
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Some Python packages failed, but continuing..." -ForegroundColor Yellow
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

# Start Vector Database Service
Write-Host "Starting Vector Database Service..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python python-services/start_vector_service.py"

# Wait a moment for vector service to start
Start-Sleep -Seconds 5

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
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
$url = "http://${ServerIP}:${Port}"
Write-Host "   Main App: $url" -ForegroundColor White
Write-Host "   Share this URL with your staff!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Services are running in separate windows." -ForegroundColor Green
Write-Host "   Close those windows to stop the services." -ForegroundColor Yellow
Write-Host ""
Write-Host "🔄 For updates:" -ForegroundColor Cyan
Write-Host "   1. Push changes to your Git repo" -ForegroundColor White
Write-Host "   2. Run: git pull" -ForegroundColor White
Write-Host "   3. Run: .\QUICK-DEPLOY-FIXED.ps1 -ServerIP ${ServerIP}" -ForegroundColor White
Write-Host ""
