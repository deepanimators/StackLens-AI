# StackLens AI - Start Application Script
param(
    [switch]$Restart = $false,
    [switch]$Stop = $false,
    [switch]$Status = $false
)

Write-Host "🚀 StackLens AI Application Manager" -ForegroundColor Green

if ($Stop) {
    Write-Host "Stopping StackLens AI..." -ForegroundColor Yellow
    pm2 stop ecosystem.config.json
    pm2 delete ecosystem.config.json
    Write-Host "✅ Application stopped" -ForegroundColor Green
    exit 0
}

if ($Status) {
    Write-Host "Application Status:" -ForegroundColor Yellow
    pm2 status
    pm2 logs stacklens-ai-server --lines 20
    exit 0
}

if ($Restart) {
    Write-Host "Restarting StackLens AI..." -ForegroundColor Yellow
    pm2 restart ecosystem.config.json
} else {
    Write-Host "Starting StackLens AI..." -ForegroundColor Yellow
    pm2 start ecosystem.config.json
}

# Wait for application to start
Start-Sleep -Seconds 5

# Check if application is running
$status = pm2 jlist | ConvertFrom-Json
$app = $status | Where-Object { $_.name -eq "stacklens-ai-server" }

if ($app -and $app.pm2_env.status -eq "online") {
    Write-Host "✅ StackLens AI started successfully!" -ForegroundColor Green
    Write-Host "" -ForegroundColor White
    
    # Get server IP
    $serverIP = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null }).IPv4Address.IPAddress
    $port = if ($env:PORT) { $env:PORT } else { "4000" }
    
    Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
    Write-Host "   Local:    http://localhost:$port" -ForegroundColor White
    Write-Host "   Network:  http://$serverIP`:$port" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    
    Write-Host "📊 Application Status:" -ForegroundColor Cyan
    pm2 status
    
    Write-Host "" -ForegroundColor White
    Write-Host "📝 Management Commands:" -ForegroundColor Cyan
    Write-Host "   View logs:    pm2 logs stacklens-ai-server" -ForegroundColor White
    Write-Host "   Restart:      .\start-application.ps1 -Restart" -ForegroundColor White
    Write-Host "   Stop:         .\start-application.ps1 -Stop" -ForegroundColor White
    Write-Host "   Status:       .\start-application.ps1 -Status" -ForegroundColor White
    
} else {
    Write-Host "❌ Failed to start StackLens AI" -ForegroundColor Red
    Write-Host "Check logs with: pm2 logs stacklens-ai-server" -ForegroundColor Yellow
}

# Save PM2 configuration
pm2 save
