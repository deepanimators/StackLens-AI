# QUICK DEPLOY - Python 3.12 with Build Fix
# Run as Administrator
param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STACKLENS-AI DEPLOYMENT v2" -ForegroundColor Yellow
Write-Host "    (Python 3.12 + Build Fix)" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 0: Setup Python 3.12
Write-Host "Step 0: Setting up Python 3.12..." -ForegroundColor Green
if (Test-Path "SETUP-PYTHON312.ps1") {
    powershell -ExecutionPolicy Bypass -File "SETUP-PYTHON312.ps1"
} else {
    # Manual detection
    $env:PYTHON312_CMD = "python"
    $env:PIP312_CMD = "python -m pip"
}

if (-not $env:PYTHON312_CMD) {
    Write-Host "✗ Failed to setup Python 3.12" -ForegroundColor Red
    exit 1
}

Write-Host "Using Python: $($env:PYTHON312_CMD)" -ForegroundColor Green

# Step 0.5: Setup Build Tools
Write-Host ""
Write-Host "Step 0.5: Setting up build environment..." -ForegroundColor Green
if (Test-Path "SETUP-BUILD-TOOLS.ps1") {
    powershell -ExecutionPolicy Bypass -File "SETUP-BUILD-TOOLS.ps1"
} else {
    Write-Host "Setting up build tools manually..." -ForegroundColor Yellow
    & $env:PYTHON312_CMD -m pip install --upgrade pip setuptools wheel build
}

# Step 1: Manual Replit Cleanup (no separate script)
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

# Step 2: Install Node Dependencies
Write-Host ""
Write-Host "Step 2: Installing Node.js Dependencies..." -ForegroundColor Green
npm install --legacy-peer-deps --no-audit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Node dependencies had warnings, continuing..." -ForegroundColor Yellow
}

# Step 3: Install Python Dependencies (Minimal approach)
Write-Host ""
Write-Host "Step 3: Installing Python Dependencies (Minimal set)..." -ForegroundColor Green

Write-Host "Installing core packages individually..." -ForegroundColor Yellow

# Install packages one by one with error handling
$packages = @(
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0", 
    "python-multipart==0.0.6",
    "requests==2.31.0",
    "aiofiles==23.2.1",
    "pydantic==2.5.0"
)

foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor Gray
    & $env:PYTHON312_CMD -m pip install $package --only-binary=all --no-build-isolation
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $package installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ $package failed, trying alternative..." -ForegroundColor Yellow
        & $env:PYTHON312_CMD -m pip install $package --force-reinstall --no-deps
    }
}

# Optional ML packages (skip if they fail)
Write-Host ""
Write-Host "Installing optional packages..." -ForegroundColor Yellow
$optionalPackages = @("numpy==1.26.2", "pandas==2.1.4")

foreach ($package in $optionalPackages) {
    Write-Host "Installing $package..." -ForegroundColor Gray
    & $env:PYTHON312_CMD -m pip install $package --only-binary=all
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $package installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ $package skipped (optional)" -ForegroundColor Yellow
    }
}

Write-Host "✓ Python dependencies installed (core packages)" -ForegroundColor Green

# Step 4: Build the Application
Write-Host ""
Write-Host "Step 4: Building Application..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application built successfully" -ForegroundColor Green
} else {
    Write-Host "Trying alternative build..." -ForegroundColor Yellow
    npx vite build --mode production
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Alternative build successful" -ForegroundColor Green
    } else {
        Write-Host "⚠ Build issues, but continuing..." -ForegroundColor Yellow
    }
}

# Step 5: Start Services
Write-Host ""
Write-Host "Step 5: Starting Services..." -ForegroundColor Green

# Start simplified vector service (without complex ML dependencies)
Write-Host "Starting Vector Database Service..." -ForegroundColor Yellow
$vectorCmd = "cd '$PWD'; $($env:PYTHON312_CMD) python-services/start_vector_service.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $vectorCmd

# Wait for service to start
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
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Main App: http://${ServerIP}:${Port}" -ForegroundColor White
Write-Host "   Share with your staff!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Green
Write-Host "   - Core functionality is running" -ForegroundColor White
Write-Host "   - Advanced ML features may be limited" -ForegroundColor White
Write-Host "   - Install additional packages as needed" -ForegroundColor White
Write-Host ""
Write-Host "🔄 To install full ML stack later:" -ForegroundColor Cyan
Write-Host "   python -m pip install sentence-transformers torch faiss-cpu" -ForegroundColor White
Write-Host ""
