# 🚀 Deploy to Your Windows Server (13.235.73.106)

## Server Information
- **Server IP**: 13.235.73.106
- **Port**: 4000
- **Access URL**: http://13.235.73.106:4000

---

## 🎯 Quick Deploy (Recommended)

### 1. Connect to Your Windows Server
```bash
# Use RDP (Remote Desktop Protocol)
# Open Remote Desktop Connection and connect to: 13.235.73.106
```

### 2. Upload Project Files
Transfer the entire `StackLens-AI-Deploy` folder to your Windows Server.

### 3. Run Quick Deploy
```powershell
# Open PowerShell as Administrator
cd C:\path\to\StackLens-AI-Deploy

# Set execution policy (first time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run quick deploy
.\QUICK-DEPLOY.ps1 -ServerIP "0.0.0.0" -Port 4000
```

**Why use 0.0.0.0?**
- `0.0.0.0` means the app will listen on ALL network interfaces
- This allows access from the public IP (13.235.73.106)
- If you use "localhost", only local connections will work

---

## 📋 Step-by-Step Manual Deployment

### Step 1: Install Prerequisites
```powershell
# Run as Administrator
.\01-INSTALL.ps1
```
This installs:
- Node.js v18+
- Python 3.9+
- Required build tools

### Step 2: Setup Application
```powershell
.\02-SETUP.ps1 -ServerIP "0.0.0.0" -Port 4000
```
This will:
- Install npm dependencies
- Build the React frontend
- Install Python packages
- Initialize the database

### Step 3: Start Application
```powershell
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000
```
This starts:
- Backend server on port 4000
- Frontend served from /dist

---

## 🔒 Configure Windows Firewall

### Option A: PowerShell Command
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "StackLens-AI" `
                    -Direction Inbound `
                    -LocalPort 4000 `
                    -Protocol TCP `
                    -Action Allow `
                    -Description "Allow access to StackLens-AI application"
```

### Option B: GUI Method
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. TCP, Specific local ports: 4000 → Next
6. Allow the connection → Next
7. Apply to all profiles → Next
8. Name: "StackLens-AI" → Finish

---

## 🌐 AWS Security Group Configuration

If your server is on AWS EC2, you need to configure the Security Group:

1. Go to **EC2 Dashboard** → **Security Groups**
2. Find your instance's security group
3. Click **Inbound rules** → **Edit inbound rules**
4. Click **Add rule**:
   - **Type**: Custom TCP
   - **Port**: 4000
   - **Source**: 
     - `0.0.0.0/0` (anywhere - for testing)
     - Or specific IP ranges (for production)
5. Click **Save rules**

---

## 🎯 Install as Windows Service (Production)

For production deployment that auto-starts on boot:

```powershell
# Run as Administrator
.\INSTALL-WINDOWS-SERVICE.ps1 -Port 4000
```

### Service Management
```powershell
# Start service
Start-Service StackLensAI

# Stop service
Stop-Service StackLensAI

# Restart service
Restart-Service StackLensAI

# Check status
Get-Service StackLensAI

# View service logs
Get-Content service-stdout.log -Tail 50
Get-Content service-stderr.log -Tail 50
```

---

## ✅ Verify Deployment

### 1. Check if Server is Running
```powershell
# Check if port 4000 is listening
netstat -ano | findstr :4000
```

### 2. Test Local Access
```powershell
# From the server itself
curl http://localhost:4000
```

### 3. Test Remote Access
From your local computer:
```bash
# Open browser and navigate to:
http://13.235.73.106:4000
```

### 4. Test API Endpoint
```powershell
# From the server
Invoke-WebRequest -Uri http://localhost:4000/api/health -Method GET
```

---

## 🔍 Troubleshooting

### Issue: Cannot Access from Public IP

**Check 1: Verify Server is Binding to 0.0.0.0**
```powershell
netstat -ano | findstr :4000
# Should show: 0.0.0.0:4000 (not 127.0.0.1:4000)
```

**Check 2: Test Windows Firewall**
```powershell
# List firewall rules
Get-NetFirewallRule -DisplayName "StackLens-AI"
```

**Check 3: Verify AWS Security Group**
- Ensure port 4000 is open in inbound rules
- Source should be 0.0.0.0/0 or your IP range

**Check 4: Check Application Logs**
```powershell
Get-Content server.log -Tail 100
```

### Issue: Port Already in Use
```powershell
# Find what's using port 4000
netstat -ano | findstr :4000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 5000
```

### Issue: "Execution Policy" Error
```powershell
# Run this first
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 Monitoring Commands

### Check Application Status
```powershell
# View running Node.js processes
Get-Process -Name node

# View application logs
Get-Content server.log -Tail 50 -Wait

# Check resource usage
Get-Process -Name node | Select-Object CPU, WorkingSet, ProcessName
```

### Performance Monitoring
```powershell
# Monitor in real-time
Get-Counter '\Process(node)\% Processor Time' -Continuous
Get-Counter '\Process(node)\Working Set' -Continuous
```

---

## 🔄 Update Deployment

When you push code updates:

```powershell
# Stop the application
Stop-Service StackLensAI  # If running as service
# OR press Ctrl+C if running manually

# Pull latest changes
git pull origin main

# Rebuild and restart
.\02-SETUP.ps1 -ServerIP "0.0.0.0" -Port 4000
.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000
# OR
Start-Service StackLensAI  # If using service
```

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| **Quick Deploy** | `.\QUICK-DEPLOY.ps1 -ServerIP "0.0.0.0" -Port 4000` |
| **Manual Start** | `.\03-START-APP.ps1 -ServerIP "0.0.0.0" -Port 4000` |
| **Install Service** | `.\INSTALL-WINDOWS-SERVICE.ps1 -Port 4000` |
| **Start Service** | `Start-Service StackLensAI` |
| **Stop Service** | `Stop-Service StackLensAI` |
| **View Logs** | `Get-Content server.log -Tail 50` |
| **Check Port** | `netstat -ano \| findstr :4000` |
| **Test Local** | `curl http://localhost:4000` |
| **Access URL** | `http://13.235.73.106:4000` |

---

## 📱 Access Your Application

Once deployed, your team can access the application at:

### 🌐 **http://13.235.73.106:4000**

### Default Admin Credentials
- **Email**: admin@stacklens.ai
- **Password**: admin123

> ⚠️ **IMPORTANT**: Change the default admin password immediately after first login!

---

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Configure HTTPS with SSL certificate
- [ ] Restrict AWS Security Group to specific IP ranges
- [ ] Enable audit logging
- [ ] Set up regular backups
- [ ] Configure rate limiting
- [ ] Enable CORS restrictions
- [ ] Set strong session secrets
- [ ] Keep Node.js and dependencies updated

---

## 📞 Support

If you encounter any issues:
1. Check the logs: `Get-Content server.log -Tail 100`
2. Verify firewall rules
3. Check AWS Security Group settings
4. Ensure port 4000 is not blocked by antivirus
5. Review the troubleshooting section above

---

**Deployment Date**: {{ date }}  
**Server**: 13.235.73.106:4000  
**Status**: Ready for deployment ✅
