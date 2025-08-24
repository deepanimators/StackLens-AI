# Simple Python Vector Service Startup Script
# Starts only the enhanced_vector_db_service.py that the application actually uses

param(
    [string]$Action = "start",
    [int]$Port = 8001
)

$ErrorActionPreference = "Continue"

Write-Host "🚀 StackLens Vector Database Service" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

$PythonServicesPath = $PSScriptRoot
Set-Location $PythonServicesPath

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "🐍 Python Found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python first." -ForegroundColor Red
    exit 1
}

# Check if required Python packages are installed
Write-Host "📦 Checking Python dependencies..." -ForegroundColor Cyan
$requiredPackages = @("fastapi", "uvicorn", "sentence-transformers", "faiss-cpu", "numpy")

foreach ($package in $requiredPackages) {
    $result = pip show $package 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   Installing $package..." -ForegroundColor Yellow
        pip install $package --quiet
    }
}

function Start-VectorService {
    Write-Host "🚀 Starting Vector Database Service on port $Port..." -ForegroundColor Cyan
    Write-Host "📡 Service URL: http://localhost:$Port" -ForegroundColor White
    Write-Host "⚡ Press Ctrl+C to stop the service" -ForegroundColor Yellow
    Write-Host ""
    
    # Start the service directly with uvicorn
    python -c "
import uvicorn
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from enhanced_vector_db_service import app
    uvicorn.run(app, host='0.0.0.0', port=$Port, log_level='info')
except ImportError as e:
    print(f'❌ Failed to import service: {e}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Service error: {e}')
    sys.exit(1)
"
}

function Stop-VectorService {
    Write-Host "🛑 Stopping Vector Database Service..." -ForegroundColor Red
    Get-Process | Where-Object { 
        $_.ProcessName -eq "python" -and 
        $_.CommandLine -match "enhanced_vector_db_service" 
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "✅ Vector service stopped" -ForegroundColor Green
}

function Test-ServiceRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Handle different actions
switch ($Action.ToLower()) {
    "start" {
        if (Test-ServiceRunning) {
            Write-Host "⚠️ Service is already running on port $Port" -ForegroundColor Yellow
        } else {
            Start-VectorService
        }
    }
    "stop" {
        Stop-VectorService
    }
    "restart" {
        Stop-VectorService
        Start-Sleep -Seconds 2
        Start-VectorService
    }
    "status" {
        if (Test-ServiceRunning) {
            Write-Host "✅ Vector Database Service is running on port $Port" -ForegroundColor Green
        } else {
            Write-Host "❌ Vector Database Service is not running" -ForegroundColor Red
        }
    }
    default {
        Write-Host "Usage: .\start-vector-service.ps1 -Action [start|stop|restart|status]" -ForegroundColor Yellow
        Write-Host "  start   - Start the vector database service (default)" -ForegroundColor White
        Write-Host "  stop    - Stop the vector database service" -ForegroundColor White
        Write-Host "  restart - Restart the vector database service" -ForegroundColor White
        Write-Host "  status  - Check if the service is running" -ForegroundColor White
    }
}
