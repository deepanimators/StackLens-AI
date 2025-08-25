# StackLens AI - Complete Automated Deployment
# Run this script on your Windows server as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [string]$Port = "4000",
    [string]$InstallPath = "C:\StackLensAI",
    [switch]$SkipPrerequisites = $false,
    [switch]$UpdateOnly = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 StackLens AI - Automated Windows Deployment" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "Server IP: $ServerIP" -ForegroundColor Yellow
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host "Install Path: $InstallPath" -ForegroundColor Yellow
Write-Host ""

function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal $user).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Step 1: Install Prerequisites
if (-not $SkipPrerequisites -and -not $UpdateOnly) {
    Write-Host "🔧 Step 1: Installing Prerequisites..." -ForegroundColor Cyan
    
    # Check if Chocolatey is installed
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
    
    # Install required software
    Write-Host "Installing Node.js, Git, and Python..." -ForegroundColor Yellow
    choco install nodejs-lts git python -y
    
    # Install PM2
    Write-Host "Installing PM2 Process Manager..." -ForegroundColor Yellow
    npm install -g pm2 pm2-windows-service
    
    # Configure Windows Firewall
    Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "StackLens AI - Port $Port" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "StackLens AI - Port 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "StackLens AI - Vector DB Port 8001" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow -ErrorAction SilentlyContinue
    
    Write-Host "✅ Prerequisites installed!" -ForegroundColor Green
}

# Step 2: Setup Application Directory
if (-not $UpdateOnly) {
    Write-Host "📁 Step 2: Setting up application directory..." -ForegroundColor Cyan
    
    if (Test-Path $InstallPath) {
        Write-Host "Directory $InstallPath already exists. Backing up..." -ForegroundColor Yellow
        $backupPath = "$InstallPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Move-Item $InstallPath $backupPath
    }
    
    New-Item -ItemType Directory -Force -Path $InstallPath
}

# Step 3: Copy Application Files from current directory to install directory
if (-not $UpdateOnly) {
    Write-Host "📋 Step 3: Copying application files to $InstallPath..." -ForegroundColor Cyan
    
    $currentDir = Get-Location
    Write-Host "Copying from: $currentDir" -ForegroundColor Gray
    Write-Host "Copying to: $InstallPath" -ForegroundColor Gray
    
    # Copy all files and folders except PowerShell scripts
    $filesToCopy = @("client", "server", "shared", "python-services", "db", "package.json", "requirements.txt", "tsconfig.json", "vite.config.ts", "tailwind.config.ts", "postcss.config.js")
    
    foreach ($item in $filesToCopy) {
        if (Test-Path $item) {
            Write-Host "Copying $item..." -ForegroundColor Gray
            if (Test-Path $item -PathType Container) {
                Copy-Item $item $InstallPath -Recurse -Force
            } else {
                Copy-Item $item $InstallPath -Force
            }
        } else {
            Write-Host "⚠️ $item not found, skipping..." -ForegroundColor Yellow
        }
    }
    
    Write-Host "✅ Application files copied successfully!" -ForegroundColor Green
}

Set-Location $InstallPath

# Step 4: Install Dependencies
Write-Host "📦 Step 4: Installing dependencies..." -ForegroundColor Cyan

if (-not (Test-Path "package.json")) {
    Write-Host "❌ package.json not found in $InstallPath" -ForegroundColor Red
    Write-Host "Please ensure the application files are in the correct directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Node.js dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Some Python dependencies may have failed to install" -ForegroundColor Yellow
    }
}

# Step 5: Configure Environment
Write-Host "⚙️ Step 5: Configuring environment..." -ForegroundColor Cyan

# Create environment file from template
if (Test-Path ".env.template") {
    $envContent = Get-Content ".env.template" -Raw
    $envContent = $envContent -replace "YOUR_SERVER_IP", $ServerIP
    $envContent = $envContent -replace "PORT=4000", "PORT=$Port"
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "Created .env.production with your server settings" -ForegroundColor Green
} else {
    # Fallback environment creation
    $envContent = @"
NODE_ENV=production
PORT=$Port
HOST=0.0.0.0
DATABASE_URL=./db/stacklens.db
VITE_API_URL=http://$ServerIP`:$Port
GEMINI_API_KEY=AIzaSyAOu2YCkjimtYsva-dOhe_Y0caISyrRgMI
"@
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
}

# Create database directory
Write-Host "Setting up database..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "db"
if (Test-Path "stacklens.db") {
    Copy-Item "stacklens.db" "db/stacklens.db" -Force
}

# Create logs directory
New-Item -ItemType Directory -Force -Path "logs"

# Step 6: Build Application
Write-Host "🔨 Step 6: Building application..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Step 7: Create PM2 Configuration
Write-Host "⚡ Step 7: Setting up process manager..." -ForegroundColor Cyan

$pm2Config = @"
{
  "apps": [
    {
      "name": "stacklens-ai-server",
      "script": "server/index.ts",
      "cwd": "$InstallPath",
      "interpreter": "node",
      "interpreter_args": "--import tsx --no-warnings",
      "env": {
        "NODE_ENV": "production",
        "PORT": "$Port",
        "HOST": "0.0.0.0"
      },
      "env_file": ".env.production",
      "instances": 1,
      "exec_mode": "fork",
      "watch": false,
      "max_memory_restart": "1G",
      "log_file": "./logs/stacklens.log",
      "error_file": "./logs/stacklens-error.log",
      "out_file": "./logs/stacklens-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "restart_delay": 4000,
      "autorestart": true,
      "max_restarts": 10,
      "min_uptime": "10s"
    }
  ]
}
"@

$pm2Config | Out-File -FilePath "ecosystem.config.json" -Encoding UTF8

# Step 8: Start Application
Write-Host "🚀 Step 8: Starting application..." -ForegroundColor Cyan

# Stop any existing instances
pm2 delete stacklens-ai-server 2>$null

# Start the application
pm2 start ecosystem.config.json

# Save PM2 configuration
pm2 save

# Setup PM2 to start on Windows startup
pm2 startup

Start-Sleep -Seconds 10

# Step 9: Start Python Vector Service
Write-Host "🐍 Step 9: Starting Python Vector Database service..." -ForegroundColor Cyan
if (Test-Path "python-services\start-vector-service.ps1") {
    Write-Host "Starting Vector Database service for RAG functionality..." -ForegroundColor Yellow
    try {
        Set-Location "python-services"
        Start-Process powershell -ArgumentList "-File start-vector-service.ps1 -Action start" -WindowStyle Hidden -PassThru
        Set-Location ".."
        Start-Sleep -Seconds 3
        Write-Host "✅ Vector Database service started on port 8001" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Vector service may not have started correctly" -ForegroundColor Yellow
        Write-Host "You can start it manually: .\python-services\start-vector-service.ps1" -ForegroundColor White
    }
} else {
    Write-Host "⚠️ Vector service not found, RAG features may be limited" -ForegroundColor Yellow
}

# Check if application started successfully
$status = pm2 jlist | ConvertFrom-Json
$app = $status | Where-Object { $_.name -eq "stacklens-ai-server" }

if ($app -and $app.pm2_env.status -eq "online") {
    Write-Host "✅ StackLens AI deployed successfully!" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    
    Write-Host "🌐 Application Access:" -ForegroundColor Cyan
    Write-Host "   URL: http://$ServerIP`:$Port" -ForegroundColor White
    Write-Host "   Local: http://localhost:$Port" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    
    Write-Host "🤖 Vector Database Service:" -ForegroundColor Cyan
    Write-Host "   Vector Database: http://localhost:8001" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    
    Write-Host "📊 Application Status:" -ForegroundColor Cyan
    pm2 status
    
    Write-Host "" -ForegroundColor White
    Write-Host "📝 Management Commands:" -ForegroundColor Cyan
    Write-Host "   View logs:    pm2 logs stacklens-ai-server" -ForegroundColor White
    Write-Host "   Restart:      pm2 restart stacklens-ai-server" -ForegroundColor White
    Write-Host "   Stop:         pm2 stop stacklens-ai-server" -ForegroundColor White
    Write-Host "   Monitor:      pm2 monit" -ForegroundColor White
    
    Write-Host "" -ForegroundColor White
    Write-Host "🎉 Deployment Complete! Share this URL with your staff:" -ForegroundColor Green
    Write-Host "   http://$ServerIP`:$Port" -ForegroundColor Yellow
    
} else {
    Write-Host "❌ Failed to start StackLens AI" -ForegroundColor Red
    Write-Host "Check logs with: pm2 logs stacklens-ai-server" -ForegroundColor Yellow
    pm2 logs stacklens-ai-server --lines 20
    exit 1
}
