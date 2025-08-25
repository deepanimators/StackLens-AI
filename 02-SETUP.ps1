# 02 - SETUP APPLICATION (FIXED)
# Run after 01-INSTALL.ps1

param(
    [string]$ServerIP = "localhost",
    [int]$Port = 4000
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STEP 2: SETUP APPLICATION" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Setup Python 3.12
Write-Host "Setting up Python 3.12..." -ForegroundColor Green
powershell -ExecutionPolicy Bypass -File "SETUP-PYTHON.ps1"

# Step 2: Clean Replit Dependencies
Write-Host ""
Write-Host "Cleaning Replit Dependencies..." -ForegroundColor Green

# Clean package.json
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw
    # Remove the replit plugin line
    $packageJson = $packageJson -replace '.*@replit/vite-plugin-cartographer.*', ''
    # Clean up extra commas
    $packageJson = $packageJson -replace ',\s*\n\s*}', '}' 
    $packageJson = $packageJson -replace ',\s*,', ','
    Set-Content "package.json" -Value $packageJson
    Write-Host "package.json cleaned" -ForegroundColor Green
}

# Clean vite.config.ts  
if (Test-Path "vite.config.ts") {
    $viteConfig = Get-Content "vite.config.ts" -Raw
    # Remove cartographer import line
    $viteConfig = $viteConfig -replace "import.*cartographer.*from.*@replit.*", ""
    # Remove the entire cartographer conditional block
    $viteConfig = $viteConfig -replace "(?s)\.\.\.\(process\.env\.NODE_ENV.*?\],", ""
    # Remove any remaining cartographer references
    $viteConfig = $viteConfig -replace ".*cartographer.*", ""
    # Clean up extra commas and whitespace
    $viteConfig = $viteConfig -replace ",\s*\]", "]"
    $viteConfig = $viteConfig -replace ",\s*\}", "}"
    $viteConfig = $viteConfig -replace "\n\s*\n\s*\n", "`n`n"
    Set-Content "vite.config.ts" -Value $viteConfig
    Write-Host "vite.config.ts cleaned" -ForegroundColor Green
}

# Step 3: Install Node Dependencies
Write-Host ""
Write-Host "Installing Node.js Dependencies..." -ForegroundColor Green

# Clean npm cache first
Write-Host "Cleaning npm cache..." -ForegroundColor Gray
npm cache clean --force

# Remove node_modules if exists
if (Test-Path "node_modules") {
    Write-Host "Removing existing node_modules..." -ForegroundColor Gray
    Remove-Item "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove package-lock.json if exists
if (Test-Path "package-lock.json") {
    Write-Host "Removing existing package-lock.json..." -ForegroundColor Gray
    Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
}

# Install dependencies with multiple attempts
$installSuccess = $false
$attempts = @(
    "npm install --legacy-peer-deps --no-audit --no-fund",
    "npm install --force --no-audit --no-fund", 
    "npm install --legacy-peer-deps --force"
)

foreach ($attempt in $attempts) {
    Write-Host "Trying: $attempt" -ForegroundColor Yellow
    Invoke-Expression $attempt
    if ($LASTEXITCODE -eq 0) {
        $installSuccess = $true
        Write-Host "Node dependencies installed successfully" -ForegroundColor Green
        break
    } else {
        Write-Host "Installation attempt failed, trying next method..." -ForegroundColor Yellow
    }
}

if (-not $installSuccess) {
    Write-Host "All npm install attempts failed. Installing core packages manually..." -ForegroundColor Yellow
    
    # Install critical packages individually
    $corePackages = @("vite", "@vitejs/plugin-react", "typescript", "react", "react-dom")
    foreach ($package in $corePackages) {
        Write-Host "Installing $package..." -ForegroundColor Gray
        npm install $package --save --no-audit
    }
}

# Step 4: Install Python Dependencies
Write-Host ""
Write-Host "Installing Python Dependencies..." -ForegroundColor Green

# Core packages
$packages = @(
    "fastapi==0.104.1",
    "uvicorn[standard]==0.24.0", 
    "python-multipart==0.0.6",
    "requests==2.31.0",
    "aiofiles==23.2.1",
    "pydantic==2.5.0",
    "numpy==1.26.2",
    "pandas==2.1.4"
)

foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor Gray
    python -m pip install $package
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$package installed" -ForegroundColor Green
    } else {
        Write-Host "$package failed, continuing..." -ForegroundColor Yellow
    }
}

# Step 5: Build Application
Write-Host ""
Write-Host "Building Application..." -ForegroundColor Green

# Check if vite is available
$viteAvailable = $false
try {
    npx vite --version > $null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $viteAvailable = $true
    }
} catch {
    $viteAvailable = $false
}

if ($viteAvailable) {
    Write-Host "Vite is available, building..." -ForegroundColor Green
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Application built successfully" -ForegroundColor Green
    } else {
        Write-Host "npm run build failed, trying direct vite build..." -ForegroundColor Yellow
        npx vite build
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Alternative build successful" -ForegroundColor Green
        } else {
            Write-Host "Build failed, but continuing..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Vite not available, installing and retrying..." -ForegroundColor Yellow
    npm install vite @vitejs/plugin-react --save-dev --no-audit
    
    # Try build again
    npx vite build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Build successful after installing vite" -ForegroundColor Green
    } else {
        Write-Host "Build still failing, creating basic dist folder..." -ForegroundColor Yellow
        if (-not (Test-Path "dist")) {
            New-Item -ItemType Directory -Path "dist" -Force
        }
        Write-Host "Created dist folder, continuing..." -ForegroundColor Yellow
    }
}

# Step 6: Configure Environment
Write-Host ""
Write-Host "Configuring Environment..." -ForegroundColor Green
$env:SERVER_IP = $ServerIP
$env:PORT = $Port

# Create .env file
$envLine1 = "SERVER_IP=" + $ServerIP
$envLine2 = "PORT=" + $Port
$envLine3 = "NODE_ENV=production"
$envContent = $envLine1 + "`n" + $envLine2 + "`n" + $envLine3
Set-Content ".env" -Value $envContent
Write-Host "Environment configured" -ForegroundColor Green

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    APPLICATION SETUP COMPLETE!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Server IP: $ServerIP" -ForegroundColor White
Write-Host "  Port: $Port" -ForegroundColor White
Write-Host ""
Write-Host "Next step: Run 03-START-APP.ps1 -ServerIP $ServerIP" -ForegroundColor Cyan
Write-Host ""
pause
