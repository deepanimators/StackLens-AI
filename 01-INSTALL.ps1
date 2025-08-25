# 01 - INSTALL PREREQUISITES
# Run as Administrator

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    STEP 1: INSTALL PREREQUISITES" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠ Please run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

# Install Chocolatey if not present
Write-Host "Checking Chocolatey..." -ForegroundColor Green
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "✓ Chocolatey installed" -ForegroundColor Green
} else {
    Write-Host "✓ Chocolatey already installed" -ForegroundColor Green
}

# Install Node.js
Write-Host ""
Write-Host "Installing Node.js..." -ForegroundColor Green
choco install nodejs -y
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Node.js installation had issues" -ForegroundColor Yellow
}

# Install Python 3.12
Write-Host ""
Write-Host "Installing Python 3.12..." -ForegroundColor Green
choco install python312 -y
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python 3.12 installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Python 3.12 installation had issues" -ForegroundColor Yellow
}

# Install Git
Write-Host ""
Write-Host "Installing Git..." -ForegroundColor Green
choco install git -y
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Git installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Git installation had issues" -ForegroundColor Yellow
}

# Install PM2 globally
Write-Host ""
Write-Host "Installing PM2 Process Manager..." -ForegroundColor Green
npm install -g pm2
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PM2 installed" -ForegroundColor Green
} else {
    Write-Host "⚠ PM2 installation had issues" -ForegroundColor Yellow
}

# Refresh environment variables
Write-Host ""
Write-Host "Refreshing environment variables..." -ForegroundColor Green
refreshenv

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    PREREQUISITES INSTALLED!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: Run 02-SETUP.ps1" -ForegroundColor Cyan
Write-Host ""
pause
