# StackLens-AI Deployment Helper (Root Directory)
# This script shows you all available deployment options from project root

Write-Host "🚀 StackLens-AI Windows GPU Server Deployment" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Current Directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Available Deployment Methods:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🎯 SUPER EASY (Recommended for beginners)" -ForegroundColor Yellow
Write-Host "   Double-click: START-DEPLOYMENT.bat" -ForegroundColor White
Write-Host "   → Right-click and 'Run as administrator'" -ForegroundColor Gray
Write-Host "   → Enter your server IP when prompted" -ForegroundColor Gray
Write-Host ""
Write-Host "2. ⚡ QUICK DEPLOY (PowerShell)" -ForegroundColor Yellow
Write-Host "   .\QUICK-DEPLOY.ps1 -ServerIP 'YOUR_SERVER_IP'" -ForegroundColor White
Write-Host ""
Write-Host "3. 🔧 MANUAL CONTROL (Step by step)" -ForegroundColor Yellow
Write-Host "   .\01-install-prerequisites.ps1" -ForegroundColor White
Write-Host "   .\02-setup-application.ps1 -ServerIP 'YOUR_IP'" -ForegroundColor White
Write-Host "   .\03-start-application.ps1" -ForegroundColor White
Write-Host ""
Write-Host "4. 🏗️ COMPLETE AUTOMATION (Advanced)" -ForegroundColor Yellow
Write-Host "   .\deploy-to-windows.ps1 -ServerIP 'YOUR_SERVER_IP' -Port 4000" -ForegroundColor White
Write-Host ""
Write-Host "🧹 Fix Replit Dependencies (if needed):" -ForegroundColor Cyan
Write-Host "   .\CLEAN-REPLIT-DEPS.ps1" -ForegroundColor White
Write-Host "   → Run this if you see '@replit/vite-plugin-cartographer' errors" -ForegroundColor Gray
Write-Host ""
Write-Host "📁 What's Included:" -ForegroundColor Cyan
Write-Host "   ✅ Complete backend (server/)" -ForegroundColor Green
Write-Host "   ✅ Complete frontend (client/)" -ForegroundColor Green
Write-Host "   ✅ Python RAG services (python-services/)" -ForegroundColor Green
Write-Host "   ✅ SQLite database (db/stacklens.db)" -ForegroundColor Green
Write-Host "   ✅ All configuration files" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 For Future Updates:" -ForegroundColor Cyan
Write-Host "   git pull" -ForegroundColor White
Write-Host "   .\deploy-to-windows.ps1 -ServerIP 'YOUR_IP' -UpdateOnly" -ForegroundColor White
Write-Host ""
Write-Host "📊 After Deployment:" -ForegroundColor Cyan
Write-Host "   Main App: http://YOUR_SERVER_IP:4000" -ForegroundColor White
Write-Host "   Management: pm2 status | pm2 logs | pm2 restart stacklens-ai-server" -ForegroundColor White
Write-Host ""
Write-Host "❓ Need Help?" -ForegroundColor Cyan
Write-Host "   Check: README.md and DEPLOYMENT-CHECKLIST.md" -ForegroundColor White
Write-Host ""
