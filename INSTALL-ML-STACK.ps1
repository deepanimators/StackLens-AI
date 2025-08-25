# Install Full ML Stack for StackLens-AI
# Run this after basic deployment works
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "    INSTALLING FULL ML STACK" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get Python command
$pythonCmd = $env:PYTHON312_CMD
if (-not $pythonCmd) {
    $pythonCmd = "python"
}

Write-Host "Using Python: $pythonCmd" -ForegroundColor Green

# Install PyTorch CPU (lightweight)
Write-Host ""
Write-Host "Installing PyTorch (CPU)..." -ForegroundColor Yellow
& $pythonCmd -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PyTorch installed" -ForegroundColor Green
} else {
    Write-Host "⚠ PyTorch installation had issues" -ForegroundColor Yellow
}

# Install sentence transformers
Write-Host ""
Write-Host "Installing Sentence Transformers..." -ForegroundColor Yellow
& $pythonCmd -m pip install sentence-transformers

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Sentence Transformers installed" -ForegroundColor Green
} else {
    Write-Host "⚠ Sentence Transformers installation had issues" -ForegroundColor Yellow
}

# Install FAISS CPU
Write-Host ""
Write-Host "Installing FAISS (CPU)..." -ForegroundColor Yellow
& $pythonCmd -m pip install faiss-cpu

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ FAISS installed" -ForegroundColor Green
} else {
    Write-Host "⚠ FAISS installation had issues" -ForegroundColor Yellow
}

# Install additional ML packages
Write-Host ""
Write-Host "Installing additional ML packages..." -ForegroundColor Yellow
$mlPackages = @(
    "scikit-learn",
    "scipy", 
    "transformers",
    "nltk"
)

foreach ($package in $mlPackages) {
    Write-Host "Installing $package..." -ForegroundColor Gray
    & $pythonCmd -m pip install $package
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $package installed" -ForegroundColor Green
    } else {
        Write-Host "⚠ $package failed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    ML STACK INSTALLATION COMPLETE!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "The application now has full ML capabilities!" -ForegroundColor Green
Write-Host "Restart the services to use the new features." -ForegroundColor Yellow
Write-Host ""
