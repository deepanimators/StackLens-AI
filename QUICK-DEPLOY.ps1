# StackLens-AI Quick Deployment Script
# This is the MAIN script to run on your Windows GPU server
# Run as Administrator in PowerShell

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    [string]$Port = "4000"
)

Write-Host "🚀 StackLens-AI Quick Deployment" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Server IP: $ServerIP" -ForegroundColor Yellow  
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host ""

# Check if running as Administrator
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal $user).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green

# Run the main deployment script
Write-Host "🎯 Starting automated deployment..." -ForegroundColor Cyan
try {
    .\deploy-to-windows.ps1 -ServerIP $ServerIP -Port $Port -InstallPath "C:\StackLensAI"
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "Your StackLens-AI application is now running!" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Main App: http://$ServerIP`:$Port" -ForegroundColor White
Write-Host "   Share this URL with your staff!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📊 Management Commands:" -ForegroundColor Cyan  
Write-Host "   Status:   pm2 status" -ForegroundColor White
Write-Host "   Logs:     pm2 logs stacklens-ai-server" -ForegroundColor White
Write-Host "   Restart:  pm2 restart stacklens-ai-server" -ForegroundColor White
Write-Host ""
Write-Host "🔄 For future updates:" -ForegroundColor Cyan
Write-Host "   1. Push changes to your Git repo" -ForegroundColor White  
Write-Host "   2. Run: git pull" -ForegroundColor White
Write-Host "   3. Run: .\deploy-to-windows.ps1 -ServerIP $ServerIP -UpdateOnly" -ForegroundColor White
