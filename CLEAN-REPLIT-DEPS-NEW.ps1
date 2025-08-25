# Clean Replit Dependencies Script
Write-Host "Cleaning Replit Dependencies..." -ForegroundColor Yellow

# Clean package.json
if (Test-Path "package.json") {
    Write-Host "Cleaning package.json..." -ForegroundColor Green
    $packageJson = Get-Content "package.json" -Raw
    $packageJson = $packageJson -replace '"@replit/vite-plugin-cartographer":\s*"[^"]*",?\s*\n?', ''
    $packageJson = $packageJson -replace ',(\s*\n\s*})', '$1'
    Set-Content "package.json" -Value $packageJson
    Write-Host "✓ package.json cleaned" -ForegroundColor Green
}

# Clean vite.config.ts
if (Test-Path "vite.config.ts") {
    Write-Host "Cleaning vite.config.ts..." -ForegroundColor Green
    $viteConfig = Get-Content "vite.config.ts" -Raw
    $viteConfig = $viteConfig -replace "import\s+cartographer\s+from\s+['\"]@replit/vite-plugin-cartographer['\"];\s*\n?", ""
    $viteConfig = $viteConfig -replace "cartographer\(\),?\s*\n?", ""
    $viteConfig = $viteConfig -replace ",(\s*\n\s*\])", '$1'
    Set-Content "vite.config.ts" -Value $viteConfig
    Write-Host "✓ vite.config.ts cleaned" -ForegroundColor Green
}

# Clean client/index.html
if (Test-Path "client/index.html") {
    Write-Host "Cleaning client/index.html..." -ForegroundColor Green
    $indexHtml = Get-Content "client/index.html" -Raw
    $indexHtml = $indexHtml -replace '<!--.*?replit.*?-->\s*\n?', '', 'IgnoreCase'
    $indexHtml = $indexHtml -replace '<script.*?replit.*?</script>\s*\n?', '', 'IgnoreCase'
    Set-Content "client/index.html" -Value $indexHtml
    Write-Host "✓ client/index.html cleaned" -ForegroundColor Green
}

Write-Host "✓ All Replit dependencies cleaned successfully!" -ForegroundColor Green
