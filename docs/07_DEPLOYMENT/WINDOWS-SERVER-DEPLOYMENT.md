# StackLens-AI - Windows Server Deployment Guide

## 🚀 Quick Start (One Command)

Open PowerShell as Administrator and run:

```powershell
.\QUICK-DEPLOY.ps1 -ServerIP "0.0.0.0" -Port 4000
```

This will:
1. ✅ Check and install prerequisites (Node.js, Python)
2. ✅ Install all dependencies
3. ✅ Build the application
4. ✅ Start the server

---

## 📋 Prerequisites

### Required Software:
- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **Git** (optional, for updates)

### System Requirements:
- Windows Server 2016 or higher
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space

---

## 🔧 Step-by-Step Manual Installation

### Step 1: Install Prerequisites

Open PowerShell as Administrator:

```powershell
# Navigate to project directory
cd C:\path\to\StackLens-AI-Deploy

# Run prerequisite installer
.\01-INSTALL.ps1
```

### Step 2: Setup Application

```powershell
# Install dependencies and build
.\02-SETUP.ps1 -ServerIP "0.0.0.0" -Port 4000
```

This will:
- Install Node.js dependencies
- Install Python dependencies
- Build the frontend
- Initialize the database
- Create necessary folders

### Step 3: Start the Application

```powershell
# Start the server
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000
```

---

## 🌐 Network Configuration

### Running on Localhost Only (Development)
```powershell
.\03-START-APP.ps1 -ServerIP "localhost" -Port 4000
```
Access: `http://localhost:4000`

### Running on All Network Interfaces (Production)
```powershell
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000
```
Access: `http://your-server-ip:4000`

### Running on Specific IP
```powershell
.\03-START-APP.ps1 -ServerIP "192.168.1.100" -Port 4000
```
Access: `http://192.168.1.100:4000`

---

## 🔒 Firewall Configuration

### Open Port in Windows Firewall

```powershell
# Open port 4000 for inbound connections
New-NetFirewallRule -DisplayName "StackLens-AI" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow

# Verify the rule
Get-NetFirewallRule -DisplayName "StackLens-AI"
```

---

## 🏃 Running the Application

### Option 1: Manual Start (For Testing)

```powershell
cd C:\path\to\StackLens-AI-Deploy
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000
```

**Note:** The PowerShell window must stay open. Closing it will stop the server.

### Option 2: Background Process (Keep Running)

```powershell
# Start in a new PowerShell window that stays open
Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -NoExit -File .\03-START-APP.ps1 -ServerIP '0.0.0.0' -Port 4000"
```

### Option 3: Install as Windows Service (Production - Recommended)

See the **Windows Service Installation** section below.

---

## 🔄 Windows Service Installation (Production)

### Install Service

```powershell
# Install as Windows Service
.\INSTALL-WINDOWS-SERVICE.ps1 -Port 4000
```

### Service Management

```powershell
# Start the service
Start-Service StackLensAI

# Stop the service
Stop-Service StackLensAI

# Restart the service
Restart-Service StackLensAI

# Check service status
Get-Service StackLensAI

# View service details
Get-Service StackLensAI | Select-Object *
```

### Auto-Start on Boot

The service is configured to start automatically on server boot by default.

To change this:
```powershell
# Set to automatic start
Set-Service -Name StackLensAI -StartupType Automatic

# Set to manual start
Set-Service -Name StackLensAI -StartupType Manual

# Disable auto-start
Set-Service -Name StackLensAI -StartupType Disabled
```

---

## 📊 Monitoring and Logs

### View Application Logs

```powershell
# View real-time logs
Get-Content -Path ".\server.log" -Tail 50 -Wait

# View all logs
Get-Content -Path ".\server.log"

# View errors only
Get-Content -Path ".\server.log" | Select-String "ERROR"
```

### Check if Server is Running

```powershell
# Check if port 4000 is listening
netstat -ano | findstr :4000

# Check Node.js processes
Get-Process -Name node

# Check specific port with PID
Get-NetTCPConnection -LocalPort 4000
```

### Kill Hung Processes

```powershell
# Find process on port 4000
$port = 4000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($process) {
    $pid = $process.OwningProcess
    Stop-Process -Id $pid -Force
    Write-Host "Killed process $pid on port $port"
}
```

---

## 🔧 Troubleshooting

### Issue: "Scripts are disabled on this system"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Port Already in Use

**Solution:**
```powershell
# Find what's using port 4000
netstat -ano | findstr :4000

# Kill the process (replace PID)
Stop-Process -Id <PID> -Force

# Or use a different port
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 8080
```

### Issue: Cannot Access from Other Computers

**Solutions:**
1. Make sure you're using `0.0.0.0` as ServerIP
2. Check Windows Firewall (see Firewall Configuration section)
3. Verify the server is listening:
   ```powershell
   netstat -ano | findstr :4000
   ```

### Issue: Database Locked

**Solution:**
```powershell
# Stop all Node processes
Get-Process -Name node | Stop-Process -Force

# Restart the application
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000
```

### Issue: Build Fails

**Solution:**
```powershell
# Clean install
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run build
```

---

## 🔄 Updates and Maintenance

### Update Application

```powershell
# Pull latest changes (if using Git)
git pull

# Reinstall dependencies and rebuild
.\02-SETUP.ps1 -ServerIP "0.0.0.0" -Port 4000

# Restart service
Restart-Service StackLensAI
```

### Backup Database

```powershell
# Create backup folder
New-Item -ItemType Directory -Path ".\backups" -Force

# Backup database
$date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
Copy-Item ".\db\stacklens.db" ".\backups\stacklens_$date.db"
```

### Restore Database

```powershell
# Stop the service first
Stop-Service StackLensAI

# Restore from backup
Copy-Item ".\backups\stacklens_YYYY-MM-DD_HH-mm-ss.db" ".\db\stacklens.db" -Force

# Start the service
Start-Service StackLensAI
```

---

## 🌍 Production Deployment Checklist

- [ ] Set ServerIP to `0.0.0.0` for network access
- [ ] Configure Windows Firewall to allow traffic
- [ ] Install as Windows Service for auto-start
- [ ] Set up regular database backups
- [ ] Configure reverse proxy (IIS/Nginx) if needed
- [ ] Set up SSL/TLS certificate for HTTPS
- [ ] Create admin user account
- [ ] Test from multiple client machines
- [ ] Set up monitoring and alerts
- [ ] Document access URLs for staff

---

## 🔐 Security Best Practices

1. **Change Default Admin Credentials** immediately after first login
2. **Use HTTPS** in production (configure reverse proxy with SSL)
3. **Restrict Admin Access** by IP if possible
4. **Regular Backups** - automate database backups
5. **Keep Updated** - apply security updates regularly
6. **Firewall Rules** - only open necessary ports
7. **Strong Passwords** - enforce password policies
8. **Audit Logs** - monitor system access logs

---

## 📞 Support

For issues or questions:
- Check logs in `.\server.log`
- Review error messages in PowerShell output
- Check the troubleshooting section above

---

## 🚀 Quick Reference Commands

```powershell
# Full deployment
.\QUICK-DEPLOY.ps1 -ServerIP "0.0.0.0" -Port 4000

# Start server manually
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000

# Check if running
netstat -ano | findstr :4000

# View logs
Get-Content .\server.log -Tail 50 -Wait

# Restart service
Restart-Service StackLensAI

# Backup database
Copy-Item ".\db\stacklens.db" ".\backups\stacklens_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').db"
```

---

**Access URL:** `http://your-server-ip:4000`

**Default Admin:** Check `README.md` for default credentials
