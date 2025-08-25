# StackLens AI - Create Deployment Package
param(
    [string]### 1. Prerequisites (Run as Administrator)
```
.\01-install-prerequisites.ps1
```

### 2. Setup Application
```
.\02-setup-application.ps1 -ServerIP "YOUR_SERVER_IP" -Port "4000"
```

### 3. Start Application
```
.\03-start-application.ps1putPath = "../deployment/windows-server"
)

Write-Host "📦 Creating StackLens AI Deployment Package..." -ForegroundColor Green

$deploymentPath = $OutputPath
$sourcePath = "."

# Create deployment directory
New-Item -ItemType Directory -Force -Path $deploymentPath

Write-Host "Copying application files..." -ForegroundColor Yellow

# Copy essential files and directories
$filesToCopy = @(
    "client",
    "server", 
    "shared",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "components.json",
    "stacklens.db",
    ".env"
)

foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Write-Host "Copying $file..." -ForegroundColor Gray
        if (Test-Path $file -PathType Container) {
            Copy-Item $file $deploymentPath -Recurse -Force
        } else {
            Copy-Item $file $deploymentPath -Force
        }
    }
}

# Create requirements.txt for Python dependencies
$pythonRequirements = @"
fastapi==0.104.1
uvicorn==0.24.0
sentence-transformers==2.2.2
torch==2.1.0
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
transformers==4.35.0
"@

$pythonRequirements | Out-File -FilePath "$deploymentPath/requirements.txt" -Encoding UTF8

# Create deployment README
$readmeContent = @"
# StackLens AI - Windows Server Deployment

## Quick Start Guide

### 1. Prerequisites (Run as Administrator)
```powershell
.\scripts\01-install-prerequisites.ps1
```

### 2. Setup Application
```powershell
cd C:\StackLensAI
.\scripts\02-setup-application.ps1 -ServerIP "YOUR_SERVER_IP" -Port "4000"
```

### 3. Start Application
```powershell
.\scripts\03-start-application.ps1
```

## File Structure
```
C:\StackLensAI\
├── client/              # Frontend React application
├── server/              # Backend Node.js server
├── shared/              # Shared TypeScript definitions
├── scripts/             # Deployment scripts
├── db/                  # Database files
├── logs/                # Application logs
├── package.json         # Node.js dependencies
├── requirements.txt     # Python dependencies
└── ecosystem.config.json # PM2 configuration
```

## Management Commands

### Start/Stop/Restart
```powershell
# Start application
.\03-start-application.ps1

# Restart application
.\03-start-application.ps1 -Restart

# Stop application
.\03-start-application.ps1 -Stop

# Check status
.\03-start-application.ps1 -Status
```

### View Logs
```powershell
pm2 logs stacklens-ai-server
pm2 logs stacklens-ai-server --lines 100
```

### Update Application
1. Stop the application: `.\03-start-application.ps1 -Stop`
2. Replace application files
3. Run setup: `.\02-setup-application.ps1`
4. Start application: `.\03-start-application.ps1`

## Troubleshooting

### Port Issues
- Ensure Windows Firewall allows ports 4000, 5173, 8001
- Check if ports are in use: `netstat -an | findstr :4000`

### Database Issues
- Ensure stacklens.db exists in the db/ directory
- Check file permissions

### Node.js Issues
- Verify Node.js version: `node --version` (should be 18+)
- Clear npm cache: `npm cache clean --force`

### Python Issues
- Verify Python installation: `python --version`
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

## Network Access
Once running, staff can access the application at:
- `http://YOUR_SERVER_IP:4000`

## Security Notes
- Change default Firebase configuration for production
- Use HTTPS in production
- Configure proper Windows Firewall rules
- Regular database backups recommended
"@

$readmeContent | Out-File -FilePath "$deploymentPath/README.md" -Encoding UTF8

# Copy deployment scripts
Copy-Item "deployment/scripts" "$deploymentPath/" -Recurse -Force

Write-Host "✅ Deployment package created successfully!" -ForegroundColor Green
Write-Host "📁 Location: $deploymentPath" -ForegroundColor Yellow
Write-Host "" -ForegroundColor White
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the entire '$deploymentPath' folder to your Windows server" -ForegroundColor White
Write-Host "2. Place it at C:\StackLensAI" -ForegroundColor White  
Write-Host "3. Follow the README.md instructions" -ForegroundColor White
