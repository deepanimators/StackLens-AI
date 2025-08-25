# Python Version Detection and Aliasing Script
Write-Host "Detecting Python installations..." -ForegroundColor Yellow

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
        return $null
    }
}

# Create Python alias functions
Write-Host "Creating Python 3.12 alias..." -ForegroundColor Green

# Export the Python command for use in other scripts
$env:PYTHON312_CMD = $pythonCommand
$env:PIP312_CMD = $pythonCommand + " -m pip"

Write-Host "✓ Python 3.12 alias created:" -ForegroundColor Green
Write-Host "   Python command: $pythonCommand" -ForegroundColor White
Write-Host "   Pip command: $($env:PIP312_CMD)" -ForegroundColor White

return $pythonCommand
