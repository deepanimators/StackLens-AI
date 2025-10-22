# 🚀 StackLens AI v0.9.5 - Phase-by-Phase Windows Deployment & Implementation

## 📋 Overview

This deployment strategy ensures **ZERO DOWNTIME** and **NO BREAKING** of existing applications through a systematic phase-by-phase approach for both deployment and v0.9.5 feature implementation.

## 🚀 Quick Windows Deployment Commands

### For Development (Recommended during v0.9.5 development)
```powershell
# Quick start for development
git checkout v-0-9-5
npm install
npm run dev
```

### For Production Deployment
```powershell
# Use automated deployment script
.\infrastructure\deployment\windows\scripts\QUICK-DEPLOY.ps1
```

## 🎯 Deployment Phases

### Phase 1: Pre-Deployment Assessment & Backup
**Duration: 5-10 minutes**
**Risk Level: ZERO**

#### 1.1 System Assessment
```powershell
# Check current system state
Get-Process | Where-Object { $_.ProcessName -eq "node" -or $_.ProcessName -eq "python" }
netstat -an | findstr ":4000\|:5173\|:8001"
```

#### 1.2 Create System Backup
```powershell
# Backup existing applications (if any)
$BackupDate = Get-Date -Format "yyyyMMdd_HHmmss"
if (Test-Path "C:\StackLensAI") {
    Copy-Item "C:\StackLensAI" "C:\StackLensAI_Backup_$BackupDate" -Recurse -Force
}
```

#### 1.3 Environment Validation
```powershell
# Validate prerequisites
node --version
npm --version
python --version
```

### Phase 2: Infrastructure Setup (Non-Disruptive)
**Duration: 10-15 minutes**
**Risk Level: ZERO**

#### 2.1 Install Prerequisites (If Missing)
```powershell
# Run prerequisite installer
.\infrastructure\deployment\windows\scripts\01-install-prerequisites.ps1
```

#### 2.2 Setup Directory Structure
```powershell
# Create deployment directories
New-Item -ItemType Directory -Path "C:\StackLensAI" -Force
New-Item -ItemType Directory -Path "C:\StackLensAI\logs" -Force
New-Item -ItemType Directory -Path "C:\StackLensAI\db" -Force
```

#### 2.3 Configure Windows Firewall (Non-Disruptive)
```powershell
# Open required ports
New-NetFirewallRule -DisplayName "StackLens AI Server" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow
New-NetFirewallRule -DisplayName "StackLens AI Vector DB" -Direction Inbound -Protocol TCP -LocalPort 8001 -Action Allow
```

### Phase 3: Application Deployment (Staged)
**Duration: 15-20 minutes**
**Risk Level: LOW**

#### 3.1 Deploy Application Files
```powershell
# Copy application files to deployment directory
Copy-Item "apps\*" "C:\StackLensAI\" -Recurse -Force
Copy-Item "packages\*" "C:\StackLensAI\packages\" -Recurse -Force
Copy-Item "python-services\*" "C:\StackLensAI\python-services\" -Recurse -Force
```

#### 3.2 Install Dependencies (Isolated)
```powershell
cd C:\StackLensAI
npm install --production --no-optional
```

#### 3.3 Build Application (Offline)
```powershell
npm run build
```

### Phase 4: Database Setup (Safe)
**Duration: 5 minutes**
**Risk Level: ZERO**

#### 4.1 Initialize Database
```powershell
# Setup SQLite database
npm run db:push
```

#### 4.2 Seed Initial Data (If Required)
```powershell
# Run any required database migrations
npm run db:migrate
```

### Phase 5: Python Services Setup (Parallel)
**Duration: 10 minutes**
**Risk Level: LOW**

#### 5.1 Setup Python Environment
```powershell
cd C:\StackLensAI\python-services
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

#### 5.2 Test Python Services (Isolated)
```powershell
# Test vector service without starting
python -c "import vector_db_service; print('Python services ready')"
```

### Phase 6: Service Configuration (Pre-Start)
**Duration: 5 minutes**
**Risk Level: ZERO**

#### 6.1 Create Production Environment
```powershell
# Create .env.production file
@"
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=./db/stacklens.db
VITE_API_URL=http://$env:COMPUTERNAME:4000
GEMINI_API_KEY=AIzaSyAOu2YCkjimtYsva-dOhe_Y0caISyrRgMI
"@ | Out-File -FilePath "C:\StackLensAI\.env.production" -Encoding UTF8
```

#### 6.2 Configure PM2 (Process Manager)
```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Configure PM2 startup
pm2-startup install
```

### Phase 7: Staged Service Startup
**Duration: 5-10 minutes**
**Risk Level: CONTROLLED**

#### 7.1 Start Python Vector Service (Background)
```powershell
cd C:\StackLensAI\python-services
Start-Process -FilePath "python" -ArgumentList "start_vector_service.py" -WindowStyle Hidden
```

#### 7.2 Start Main Application (Monitored)
```powershell
cd C:\StackLensAI
pm2 start dist/index.js --name "stacklens-ai-server" --env production
```

#### 7.3 Verify Services
```powershell
# Check service status
pm2 status
Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing
```

### Phase 8: Network Access Configuration
**Duration: 2-3 minutes**
**Risk Level: ZERO**

#### 8.1 Configure Network Binding
```powershell
# Verify application is binding to all interfaces
netstat -an | findstr ":4000"
```

#### 8.2 Test External Access
```powershell
# Get server IP for team access
$ServerIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" }).IPAddress
Write-Host "Team Access URL: http://$ServerIP:4000"
```

### Phase 9: Validation & Testing
**Duration: 5-10 minutes**
**Risk Level: ZERO**

#### 9.1 Functional Testing
```powershell
# Test key endpoints
Invoke-WebRequest -Uri "http://localhost:4000/api/health" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:4000/api/auth/status" -UseBasicParsing
```

#### 9.2 Performance Validation
```powershell
# Monitor resource usage
pm2 monit
```

#### 9.3 Log Verification
```powershell
# Check application logs
pm2 logs stacklens-ai-server --lines 50
```

### Phase 10: Team Access Enablement
**Duration: 2 minutes**
**Risk Level: ZERO**

#### 10.1 Generate Access Information
```powershell
$ServerIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" }).IPAddress
@"
🚀 StackLens AI Deployment Complete!

Team Access Information:
- URL: http://$ServerIP:4000
- Status: Online
- Authentication: Firebase Google Sign-in
- Features: AI Error Analysis, Dashboard, File Upload

Share this URL with your team members.
"@ | Out-File -FilePath "C:\StackLensAI\TEAM_ACCESS_INFO.txt" -Encoding UTF8

Get-Content "C:\StackLensAI\TEAM_ACCESS_INFO.txt"
```

## 🛡️ Rollback Strategy

### Immediate Rollback (If Issues Occur)
```powershell
# Stop services
pm2 stop stacklens-ai-server
Get-Process | Where-Object { $_.ProcessName -eq "python" } | Stop-Process -Force

# Restore from backup (if exists)
if (Test-Path "C:\StackLensAI_Backup_*") {
    $LatestBackup = Get-ChildItem "C:\StackLensAI_Backup_*" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Remove-Item "C:\StackLensAI" -Recurse -Force
    Copy-Item $LatestBackup.FullName "C:\StackLensAI" -Recurse -Force
}
```

## 📊 Success Indicators

### ✅ Deployment Successful When:
- PM2 shows "online" status for stacklens-ai-server
- HTTP 200 response from http://localhost:4000
- HTTP 200 response from http://localhost:8001/health
- Team can access via http://SERVER_IP:4000
- Firebase authentication working
- File upload functionality operational

### ⚠️ Warning Signs:
- PM2 shows "errored" or "stopped" status
- HTTP errors from health endpoints
- High CPU/memory usage (>80%)
- Network connectivity issues

## 🔧 Automated Deployment Script

### One-Command Deployment
```powershell
# Execute all phases automatically
.\infrastructure\deployment\windows\scripts\deploy-to-windows.ps1 -ServerIP "AUTO" -Port 4000 -PhaseByPhase
```

### Manual Phase Execution
```powershell
# Execute specific phases
.\infrastructure\deployment\windows\scripts\deploy-to-windows.ps1 -Phase 1
.\infrastructure\deployment\windows\scripts\deploy-to-windows.ps1 -Phase 2
# ... continue with each phase
```

## 📈 Monitoring & Maintenance

### Real-time Monitoring
```powershell
# Monitor application
pm2 monit

# Check logs
pm2 logs stacklens-ai-server --follow

# System resources
Get-Process | Where-Object { $_.ProcessName -eq "node" -or $_.ProcessName -eq "python" }
```

### Regular Maintenance
```powershell
# Weekly restart (optional)
pm2 restart stacklens-ai-server

# Log rotation
pm2 flush

# Update check
npm outdated
```

## 🎯 Key Benefits of This Approach

1. **Zero Downtime**: Each phase is isolated and non-disruptive
2. **Rollback Ready**: Complete backup and restore strategy
3. **Validation at Each Step**: Ensures each phase completes successfully
4. **Team Ready**: Immediate team access upon completion
5. **Production Hardened**: PM2 process management and monitoring
6. **Scalable**: Easy to add more services or update existing ones

---

**🚀 Ready to Deploy?**

Execute the phases in order, or use the automated script for hands-off deployment. Your StackLens AI platform will be ready for team access with zero disruption to existing systems.