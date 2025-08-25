# Fix Deployment Issues - Clean Slate Setup
Write-Host "=====================================" -ForegroundColor Red
Write-Host "    FIXING DEPLOYMENT ISSUES" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Red
Write-Host ""

Write-Host "1. Removing problematic old scripts..." -ForegroundColor Yellow
if (Test-Path "CLEAN-REPLIT-DEPS.ps1") {
    Remove-Item "CLEAN-REPLIT-DEPS.ps1" -Force
    Write-Host "✓ Removed broken CLEAN-REPLIT-DEPS.ps1" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Manual Replit cleanup (safe method)..." -ForegroundColor Yellow

# Clean package.json manually
if (Test-Path "package.json") {
    Write-Host "Cleaning package.json..." -ForegroundColor Green
    $content = Get-Content "package.json" -Raw
    
    # Remove the problematic line
    $content = $content -replace '.*"@replit/vite-plugin-cartographer".*\n?', ''
    $content = $content -replace ',(\s*\n\s*})', '$1'
    
    Set-Content "package.json" -Value $content -Encoding UTF8
    Write-Host "✓ package.json cleaned" -ForegroundColor Green
}

# Clean vite.config.ts manually  
if (Test-Path "vite.config.ts") {
    Write-Host "Cleaning vite.config.ts..." -ForegroundColor Green
    $content = Get-Content "vite.config.ts" -Raw
    
    # Remove import and usage
    $content = $content -replace "import.*cartographer.*\n", ""
    $content = $content -replace ".*cartographer\(\).*\n?", ""
    $content = $content -replace ",(\s*\n\s*\])", '$1'
    
    Set-Content "vite.config.ts" -Value $content -Encoding UTF8
    Write-Host "✓ vite.config.ts cleaned" -ForegroundColor Green
}

# Clean client/index.html manually
if (Test-Path "client/index.html") {
    Write-Host "Cleaning client/index.html..." -ForegroundColor Green
    $content = Get-Content "client/index.html" -Raw
    
    # Remove replit references
    $content = $content -replace '<!--.*replit.*-->\s*\n?', ''
    $content = $content -replace '<script.*replit.*</script>\s*\n?', ''
    
    Set-Content "client/index.html" -Value $content -Encoding UTF8
    Write-Host "✓ client/index.html cleaned" -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "    CLEANUP COMPLETED!" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: git pull" -ForegroundColor White
Write-Host "2. Run: .\CHECK-PYTHON.ps1" -ForegroundColor White  
Write-Host "3. Run: .\QUICK-DEPLOY-PYTHON312.ps1 -ServerIP 13.235.73.106" -ForegroundColor White
Write-Host ""
