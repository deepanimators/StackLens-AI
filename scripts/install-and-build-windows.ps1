# install-and-build-windows.ps1
# Installs all dependencies and builds all projects for StackLens
# Run this ONCE after cloning or when dependencies change

$ErrorActionPreference = "Stop"

# Get root directory
$ROOT_DIR = Split-Path -Parent $PSScriptRoot
if (-not $ROOT_DIR -or $ROOT_DIR -eq "") {
    $ROOT_DIR = (Get-Location).Path
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens AI Platform" -ForegroundColor Cyan
Write-Host "  Install & Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Root Directory: $ROOT_DIR" -ForegroundColor Yellow
Write-Host ""

# Check for Node.js
$nodeExists = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeExists) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "Node.js: $(node --version)" -ForegroundColor Green

# Check for pnpm
$pnpmExists = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpmExists) {
    Write-Host "pnpm not found. Installing..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "pnpm installed!" -ForegroundColor Green
}
Write-Host "pnpm: $(pnpm --version)" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 1: Install All Dependencies
# ============================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  STEP 1: Installing Dependencies" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# 1.1 Root project
Write-Host "[1/5] Installing root project dependencies..." -ForegroundColor Cyan
Set-Location $ROOT_DIR
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Host "WARNING: Root install had issues" -ForegroundColor Yellow }
Write-Host "  Done!" -ForegroundColor Green

# 1.2 POS Demo Backend
Write-Host "[2/5] Installing pos-demo/backend dependencies..." -ForegroundColor Cyan
$posBackendPath = "$ROOT_DIR\pos-demo\backend"
if (Test-Path "$posBackendPath\package.json") {
    Set-Location $posBackendPath
    pnpm install
    Write-Host "  Done!" -ForegroundColor Green
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

# 1.3 POS Demo Frontend
Write-Host "[3/5] Installing pos-demo/frontend dependencies..." -ForegroundColor Cyan
$posFrontendPath = "$ROOT_DIR\pos-demo\frontend"
if (Test-Path "$posFrontendPath\package.json") {
    Set-Location $posFrontendPath
    pnpm install
    Write-Host "  Done!" -ForegroundColor Green
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

# 1.4 Stacklens Backend
Write-Host "[4/5] Installing stacklens/backend dependencies..." -ForegroundColor Cyan
$stacklensBackendPath = "$ROOT_DIR\stacklens\backend"
if (Test-Path "$stacklensBackendPath\package.json") {
    Set-Location $stacklensBackendPath
    pnpm install
    Write-Host "  Done!" -ForegroundColor Green
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

# 1.5 Demo POS App
Write-Host "[5/5] Installing demo-pos-app dependencies..." -ForegroundColor Cyan
$demoPosPath = "$ROOT_DIR\demo-pos-app"
if (Test-Path "$demoPosPath\package.json") {
    Set-Location $demoPosPath
    pnpm install
    Write-Host "  Done!" -ForegroundColor Green
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

Set-Location $ROOT_DIR
Write-Host ""
Write-Host "All dependencies installed!" -ForegroundColor Green
Write-Host ""

# ============================================
# STEP 2: Build All Projects
# ============================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  STEP 2: Building Projects" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# 2.1 Build main project (client + server)
Write-Host "[1/4] Building main StackLens project..." -ForegroundColor Cyan
Set-Location $ROOT_DIR
pnpm run build
if ($LASTEXITCODE -ne 0) { 
    Write-Host "WARNING: Main build had issues, continuing..." -ForegroundColor Yellow 
} else {
    Write-Host "  Done!" -ForegroundColor Green
}

# 2.2 Build stacklens backend
Write-Host "[2/4] Building stacklens/backend..." -ForegroundColor Cyan
if (Test-Path "$stacklensBackendPath\package.json") {
    Set-Location $stacklensBackendPath
    $pkgJson = Get-Content "package.json" | ConvertFrom-Json
    if ($pkgJson.scripts.build) {
        pnpm run build
        Write-Host "  Done!" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (no build script)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

# 2.3 Build demo-pos-app
Write-Host "[3/4] Building demo-pos-app..." -ForegroundColor Cyan
if (Test-Path "$demoPosPath\package.json") {
    Set-Location $demoPosPath
    $pkgJson = Get-Content "package.json" | ConvertFrom-Json
    if ($pkgJson.scripts.build) {
        pnpm run build
        Write-Host "  Done!" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (no build script)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

# 2.4 Build pos-demo frontend
Write-Host "[4/4] Building pos-demo/frontend..." -ForegroundColor Cyan
if (Test-Path "$posFrontendPath\package.json") {
    Set-Location $posFrontendPath
    $pkgJson = Get-Content "package.json" | ConvertFrom-Json
    if ($pkgJson.scripts.build) {
        pnpm run build
        Write-Host "  Done!" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (no build script)" -ForegroundColor Gray
    }
} else {
    Write-Host "  Skipped (no package.json)" -ForegroundColor Gray
}

Set-Location $ROOT_DIR

# ============================================
# SUMMARY
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation & Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start infrastructure (Kafka, OTEL):" -ForegroundColor White
Write-Host "   .\infrastructure\start-services.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. Start all application services:" -ForegroundColor White
Write-Host "   .\scripts\start-stack-windows.ps1 -SkipInstall -SkipBuild" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Or for development mode (with hot reload):" -ForegroundColor White
Write-Host "   .\scripts\start-stack-windows.ps1 -SkipInstall -DevMode" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Check service status:" -ForegroundColor White
Write-Host "   .\scripts\status-stack-windows.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Stop all services:" -ForegroundColor White
Write-Host "   .\scripts\stop-stack-windows.ps1" -ForegroundColor Yellow
Write-Host ""
