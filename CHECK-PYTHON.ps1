# Python Installation Checker
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    PYTHON INSTALLATION CHECKER" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Function to test Python version
function Test-PythonVersion {
    param($pythonCommand)
    try {
        $version = & $pythonCommand --version 2>&1
        $path = & $pythonCommand -c "import sys; print(sys.executable)" 2>&1
        if ($version -match "Python (\d+\.\d+\.\d+)") {
            return @{
                Version = $matches[1]
                Path = $path
                Command = $pythonCommand
            }
        }
    }
    catch {
        return $null
    }
    return $null
}

# Test various Python commands
$pythonCommands = @(
    "python3.12",
    "python3.11", 
    "python3.10",
    "python3",
    "python",
    "py -3.12",
    "py -3.11",
    "py -3.10",
    "py -3"
)

Write-Host "Scanning for Python installations..." -ForegroundColor Green
Write-Host ""

$foundVersions = @()
foreach ($cmd in $pythonCommands) {
    $result = Test-PythonVersion $cmd
    if ($result) {
        $foundVersions += $result
        $color = if ($result.Version.StartsWith("3.12")) { "Green" } else { "Yellow" }
        Write-Host "✓ $($result.Command): Python $($result.Version)" -ForegroundColor $color
        Write-Host "  Path: $($result.Path)" -ForegroundColor Gray
        Write-Host ""
    }
}

if ($foundVersions.Count -eq 0) {
    Write-Host "✗ No Python installations found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.12 from https://python.org" -ForegroundColor Yellow
} else {
    $python312 = $foundVersions | Where-Object { $_.Version.StartsWith("3.12") } | Select-Object -First 1
    
    if ($python312) {
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "✓ PYTHON 3.12 FOUND!" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "Command: $($python312.Command)" -ForegroundColor White
        Write-Host "Version: Python $($python312.Version)" -ForegroundColor White
        Write-Host "Path: $($python312.Path)" -ForegroundColor White
        Write-Host ""
        Write-Host "You can now run:" -ForegroundColor Cyan
        Write-Host ".\QUICK-DEPLOY-PYTHON312.ps1 -ServerIP 13.235.73.106" -ForegroundColor White
    } else {
        Write-Host "=====================================" -ForegroundColor Yellow
        Write-Host "⚠ PYTHON 3.12 NOT FOUND" -ForegroundColor Yellow
        Write-Host "=====================================" -ForegroundColor Yellow
        Write-Host "Available versions:" -ForegroundColor White
        foreach ($version in $foundVersions) {
            Write-Host "  - Python $($version.Version) ($($version.Command))" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "To install Python 3.12:" -ForegroundColor Cyan
        Write-Host "1. Download from: https://python.org/downloads/release/python-3120/" -ForegroundColor White
        Write-Host "2. Install with 'Add Python to PATH' option checked" -ForegroundColor White
        Write-Host "3. Run this checker again" -ForegroundColor White
    }
}

Write-Host ""
