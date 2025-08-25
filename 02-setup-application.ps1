# StackLens AI - Application Setup Script
# Run this in PowerShell from C:\StackLensAI directory

param(
    [string]$ServerIP = "localhost",
    [string]$Port = "4000"
)

Write-Host "🔧 Setting up StackLens AI Application..." -ForegroundColor Green
Write-Host "Server IP: $ServerIP" -ForegroundColor Yellow
Write-Host "Port: $Port" -ForegroundColor Yellow

# 0. Clean up Replit dependencies (for Windows deployment)
Write-Host "🧹 Cleaning up development dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    
    # Remove Replit dependencies if they exist
    $cleaned = $false
    if ($packageJson.devDependencies -and $packageJson.devDependencies.'@replit/vite-plugin-cartographer') {
        $packageJson.devDependencies.PSObject.Properties.Remove('@replit/vite-plugin-cartographer')
        Write-Host "   Removed @replit/vite-plugin-cartographer" -ForegroundColor Gray
        $cleaned = $true
    }
    if ($packageJson.devDependencies -and $packageJson.devDependencies.'@replit/vite-plugin-runtime-error-modal') {
        $packageJson.devDependencies.PSObject.Properties.Remove('@replit/vite-plugin-runtime-error-modal')
        Write-Host "   Removed @replit/vite-plugin-runtime-error-modal" -ForegroundColor Gray
        $cleaned = $true
    }
    
    if ($cleaned) {
        # Save cleaned package.json
        $packageJson | ConvertTo-Json -Depth 100 | Out-File "package.json" -Encoding UTF8
        Write-Host "✅ Package.json cleaned for Windows deployment" -ForegroundColor Green
    }
}

# 1. Install Node.js dependencies
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ package.json not found. Please ensure you're in the correct directory." -ForegroundColor Red
    exit 1
}

# 2. Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
if (Test-Path "requirements.txt") {
    pip install -r requirements.txt
} else {
    # Install common dependencies
    pip install fastapi uvicorn sentence-transformers torch numpy pandas scikit-learn
}

# 3. Create production environment file
Write-Host "Creating production environment file..." -ForegroundColor Yellow
$envContent = @"
# Production Environment Configuration
NODE_ENV=production
PORT=$Port
DATABASE_URL=./db/stacklens.db

# Server Configuration
HOST=0.0.0.0
VITE_API_URL=http://$ServerIP`:$Port

# Firebase Configuration (for authentication)
VITE_FIREBASE_API_KEY=AIzaSyCNq08Tzd1y8R8QbfGJ_7KmwMY3HEe3bUU
VITE_FIREBASE_PROJECT_ID=error-analysis-f46c6
VITE_FIREBASE_APP_ID=1:619626851108:web:12ce0834c163c3a23421b1
VITE_FIREBASE_MESSAGING_SENDER_ID=619626851108
VITE_FIREBASE_AUTH_DOMAIN=error-analysis-f46c6.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=error-analysis-f46c6.firebasestorage.app
VITE_FIREBASE_MEASUREMENT_ID=G-7CN6THR8DP

# AI Configuration
GEMINI_API_KEY=AIzaSyAOu2YCkjimtYsva-dOhe_Y0caISyrRgMI
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8

# 4. Build the application
Write-Host "Building the application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# 5. Create database directory
Write-Host "Setting up database..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "db"
if (Test-Path "stacklens.db") {
    Copy-Item "stacklens.db" "db/stacklens.db" -Force
}

# 6. Create PM2 ecosystem file
Write-Host "Creating PM2 configuration..." -ForegroundColor Yellow
$pm2Config = @"
{
  "apps": [
    {
      "name": "stacklens-ai-server",
      "script": "server/index.ts",
      "cwd": "C:\\StackLensAI",
      "interpreter": "node",
      "interpreter_args": "--import tsx --no-warnings",
      "env": {
        "NODE_ENV": "production",
        "PORT": "$Port",
        "HOST": "0.0.0.0"
      },
      "env_file": ".env.production",
      "instances": 1,
      "exec_mode": "cluster",
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

# 7. Create logs directory
New-Item -ItemType Directory -Force -Path "logs"

# 8. Create Windows Service setup
Write-Host "Setting up Windows Service..." -ForegroundColor Yellow
pm2 save
pm2 startup

Write-Host "✅ Application setup completed!" -ForegroundColor Green
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run start-application.ps1 to start the server" -ForegroundColor White
Write-Host "2. Access the application at http://$ServerIP`:$Port" -ForegroundColor White
