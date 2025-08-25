# Replit Dependencies Cleanup Script
# This script removes Replit-specific dependencies that cause "No matching version found" errors
# Run this before deployment to Windows servers

Write-Host "🧹 StackLens AI - Replit Cleanup for Windows Deployment" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

$cleanedFiles = 0

# Clean package.json
if (Test-Path "package.json") {
    Write-Host "🔍 Checking package.json..." -ForegroundColor Cyan
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $needsSave = $false
    
    # Remove Replit dependencies
    if ($packageJson.devDependencies -and $packageJson.devDependencies.'@replit/vite-plugin-cartographer') {
        $packageJson.devDependencies.PSObject.Properties.Remove('@replit/vite-plugin-cartographer')
        Write-Host "   ✅ Removed @replit/vite-plugin-cartographer" -ForegroundColor Green
        $needsSave = $true
    }
    if ($packageJson.devDependencies -and $packageJson.devDependencies.'@replit/vite-plugin-runtime-error-modal') {
        $packageJson.devDependencies.PSObject.Properties.Remove('@replit/vite-plugin-runtime-error-modal')
        Write-Host "   ✅ Removed @replit/vite-plugin-runtime-error-modal" -ForegroundColor Green
        $needsSave = $true
    }
    
    if ($needsSave) {
        $packageJson | ConvertTo-Json -Depth 100 | Out-File "package.json" -Encoding UTF8
        Write-Host "   📝 Updated package.json" -ForegroundColor Yellow
        $cleanedFiles++
    } else {
        Write-Host "   ✨ Already clean" -ForegroundColor Gray
    }
}

# Clean vite.config.ts
if (Test-Path "vite.config.ts") {
    Write-Host "🔍 Checking vite.config.ts..." -ForegroundColor Cyan
    $viteConfig = Get-Content "vite.config.ts" -Raw
    $originalConfig = $viteConfig
    
    # Remove Replit import
    $viteConfig = $viteConfig -replace 'import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";\r?\n', ''
    
    # Remove runtime error overlay from plugins
    $viteConfig = $viteConfig -replace 'runtimeErrorOverlay\(\),\r?\n\s*', ''
    
    # Remove cartographer plugin block (multiline)
    $viteConfig = $viteConfig -replace '(?s)\.\.\.\(process\.env\.NODE_ENV[^)]*\),\r?\n\s*', ''
    
    if ($viteConfig -ne $originalConfig) {
        $viteConfig | Out-File "vite.config.ts" -Encoding UTF8
        Write-Host "   ✅ Removed Replit plugins from vite.config.ts" -ForegroundColor Green
        Write-Host "   📝 Updated vite.config.ts" -ForegroundColor Yellow
        $cleanedFiles++
    } else {
        Write-Host "   ✨ Already clean" -ForegroundColor Gray
    }
}

# Clean client/index.html
if (Test-Path "client/index.html") {
    Write-Host "🔍 Checking client/index.html..." -ForegroundColor Cyan
    $htmlContent = Get-Content "client/index.html" -Raw
    $originalHtml = $htmlContent
    
    # Remove Replit dev banner
    $htmlContent = $htmlContent -replace '(?s)\s*<!-- This is a script.*?replit-dev-banner\.js"></script>\r?\n', ''
    
    if ($htmlContent -ne $originalHtml) {
        $htmlContent | Out-File "client/index.html" -Encoding UTF8
        Write-Host "   ✅ Removed Replit dev banner" -ForegroundColor Green
        Write-Host "   📝 Updated client/index.html" -ForegroundColor Yellow
        $cleanedFiles++
    } else {
        Write-Host "   ✨ Already clean" -ForegroundColor Gray
    }
}

# Summary
Write-Host ""
if ($cleanedFiles -gt 0) {
    Write-Host "🎉 Cleanup completed successfully!" -ForegroundColor Green
    Write-Host "   Files cleaned: $cleanedFiles" -ForegroundColor White
    Write-Host "   Your project is now ready for Windows deployment!" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Run: npm install" -ForegroundColor White
    Write-Host "   2. Run deployment script for Windows server" -ForegroundColor White
} else {
    Write-Host "✨ Your project is already clean!" -ForegroundColor Green
    Write-Host "   No Replit dependencies found." -ForegroundColor White
}
Write-Host ""
