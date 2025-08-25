# SETUP PYTHON - Python 3.12 Detection and Configuration
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    PYTHON 3.12 SETUP" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Function to test Python version
function Test-PythonVersion {
    param($pythonCommand)
    try {
        $version = & $pythonCommand --version 2>&1
        if ($version -match "Python (\d+\.\d+)") {
            return $matches[1]
        }
    }
    catch {
        return $null
    }
    return $null
}

# Try different Python commands to find 3.12
$pythonCommands = @("python3.12", "python3", "python", "py -3.12", "py -3")
$python312Found = $false
$pythonCommand = ""

Write-Host "Scanning for Python installations..." -ForegroundColor Green
Write-Host ""

foreach ($cmd in $pythonCommands) {
    $version = Test-PythonVersion $cmd
    if ($version -eq "3.12") {
        $python312Found = $true
        $pythonCommand = $cmd
        Write-Host "✓ Found Python 3.12 using command: $cmd" -ForegroundColor Green
        break
    }
    elseif ($version) {
        Write-Host "Found Python $version using command: $cmd" -ForegroundColor Yellow
    }
}

if (-not $python312Found) {
    Write-Host "⚠ Python 3.12 not found. Checking available versions..." -ForegroundColor Yellow
    
    # Try to find any Python 3.x
    foreach ($cmd in $pythonCommands) {
        $version = Test-PythonVersion $cmd
        if ($version -and $version.StartsWith("3.")) {
            $pythonCommand = $cmd
            Write-Host "Using Python $version (command: $cmd) as fallback" -ForegroundColor Yellow
            break
        }
    }
    
    if (-not $pythonCommand) {
        Write-Host "✗ No suitable Python version found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Python 3.12:" -ForegroundColor Cyan
        Write-Host "1. Download from: https://python.org/downloads/release/python-3120/" -ForegroundColor White
        Write-Host "2. Install with 'Add Python to PATH' option checked" -ForegroundColor White
        Write-Host "3. Restart PowerShell and run this script again" -ForegroundColor White
        pause
        exit 1
    }
}

# Create Python alias environment variables
Write-Host ""
Write-Host "Setting up Python environment..." -ForegroundColor Green
$env:PYTHON312_CMD = $pythonCommand
$env:PIP312_CMD = "$pythonCommand -m pip"

Write-Host "✓ Python environment configured:" -ForegroundColor Green
Write-Host "   Python command: $pythonCommand" -ForegroundColor White
Write-Host "   Pip command: $($env:PIP312_CMD)" -ForegroundColor White

# Verify pip and upgrade if needed
Write-Host ""
Write-Host "Setting up pip..." -ForegroundColor Green
& $pythonCommand -m pip install --upgrade pip setuptools wheel

Write-Host ""
Write-Host "✓ Python setup completed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
