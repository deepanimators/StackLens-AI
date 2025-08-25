# Python 3.12 Build Tools Setup
Write-Host "Setting up Python 3.12 build environment..." -ForegroundColor Yellow

# Get Python command
$pythonCmd = $env:PYTHON312_CMD
if (-not $pythonCmd) {
    $pythonCmd = "python"
}

Write-Host "Using Python: $pythonCmd" -ForegroundColor Green

# Step 1: Upgrade pip
Write-Host "Upgrading pip..." -ForegroundColor Yellow
& $pythonCmd -m pip install --upgrade pip

# Step 2: Install build tools
Write-Host "Installing build tools..." -ForegroundColor Yellow
& $pythonCmd -m pip install --upgrade setuptools wheel build

# Step 3: Install setuptools-scm (for distutils replacement)
Write-Host "Installing setuptools-scm..." -ForegroundColor Yellow
& $pythonCmd -m pip install setuptools-scm

# Step 4: Install Microsoft Visual C++ Build Tools dependencies
Write-Host "Installing build dependencies..." -ForegroundColor Yellow
& $pythonCmd -m pip install distlib

Write-Host "✓ Build environment setup complete" -ForegroundColor Green
