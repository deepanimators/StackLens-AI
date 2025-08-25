# StackLens AI - Windows Server Setup Script
# Run this as Administrator in PowerShell

Write-Host "🚀 Setting up StackLens AI on Windows Server..." -ForegroundColor Green

# 1. Install Chocolatey (Package Manager for Windows)
Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Install Node.js (Latest LTS)
Write-Host "Installing Node.js..." -ForegroundColor Yellow
choco install nodejs-lts -y

# 3. Install Git
Write-Host "Installing Git..." -ForegroundColor Yellow
choco install git -y

# 4. Install PM2 (Process Manager)
Write-Host "Installing PM2 Process Manager..." -ForegroundColor Yellow
npm install -g pm2
pm2 install pm2-windows-startup
pm2-startup install

# 5. Install Python (for ML components)
Write-Host "Installing Python..." -ForegroundColor Yellow
choco install python -y

# 6. Create application directory
Write-Host "Creating application directory..." -ForegroundColor Yellow
$appDir = "C:\StackLensAI"
New-Item -ItemType Directory -Force -Path $appDir
Set-Location $appDir

# 7. Configure Windows Firewall
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "StackLens AI - Port 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
New-NetFirewallRule -DisplayName "StackLens AI - Port 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
New-NetFirewallRule -DisplayName "StackLens AI - Port 8001" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow

Write-Host "✅ Prerequisites installed successfully!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy your application files to C:\StackLensAI" -ForegroundColor White
Write-Host "2. Run setup-application.ps1" -ForegroundColor White
Write-Host "3. Start the application with start-application.ps1" -ForegroundColor White

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
