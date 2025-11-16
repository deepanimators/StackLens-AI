# 🚀 StackLens-AI Windows GPU Server Deployment Guide

## 📋 Overview

This guide will help you deploy StackLens-AI on a Windows GPU server directly from the project root directory. All PowerShell scripts are designed to work seamlessly with the existing folder structure.

## 🔧 What's Included in Root Directory

### Essential Files & Folders:

- ✅ **`client/`** - Complete React frontend application
- ✅ **`server/`** - Complete Node.js backend with all APIs
- ✅ **`python-services/`** - RAG/ML microservices (vector database)
- ✅ **`db/stacklens.db`** - SQLite database with your data
- ✅ **`shared/`** - TypeScript schemas and shared code
- ✅ **Configuration files**: `package.json`, `requirements.txt`, `tsconfig.json`, etc.

### Deployment Scripts:

- 🎯 **`START-DEPLOYMENT.bat`** - Super easy deployment (double-click)
- ⚡ **`QUICK-DEPLOY.ps1`** - PowerShell quick deployment
- 🏗️ **`deploy-to-windows.ps1`** - Complete automation script
- 🧹 **`CLEAN-REPLIT-DEPS.ps1`** - Fixes Replit dependency issues
- 🔧 **Manual scripts**: `01-install-prerequisites.ps1`, `02-setup-application.ps1`, `03-start-application.ps1`

## 🚀 Deployment Options

### Option 1: Super Easy (Recommended) 🎯

```
1. Copy this entire folder to your Windows GPU server
2. Right-click START-DEPLOYMENT.bat → "Run as administrator"
3. Enter your server IP address when prompted
4. Share http://YOUR_SERVER_IP:4000 with your staff!
```

### Option 2: PowerShell Quick Deploy ⚡

```powershell
# Open PowerShell as Administrator in this folder
.\QUICK-DEPLOY.ps1 -ServerIP "YOUR_SERVER_IP"
```

### Option 3: Manual Control 🔧

```powershell
# Step by step deployment
.\01-install-prerequisites.ps1
.\02-setup-application.ps1 -ServerIP "YOUR_SERVER_IP"
.\03-start-application.ps1
```

### Option 4: Full Automation 🏗️

```powershell
# Complete automation with all options
.\deploy-to-windows.ps1 -ServerIP "YOUR_SERVER_IP" -Port 4000
```

## 🧹 Fixing Replit Dependency Issues

If you see "No matching version found for @replit/vite-plugin-cartographer" error:

```powershell
# Run this first to clean up Replit dependencies
.\CLEAN-REPLIT-DEPS.ps1

# Then run deployment
.\QUICK-DEPLOY.ps1 -ServerIP "YOUR_SERVER_IP"
```

## 📦 What the Deployment Does

### 1. Prerequisites Installation:

- ✅ Chocolatey (Windows package manager)
- ✅ Node.js LTS
- ✅ Python 3.10+
- ✅ Git
- ✅ PM2 (Process manager)

### 2. System Configuration:

- ✅ Windows Firewall rules (ports 4000, 5173, 8001)
- ✅ Application directory setup (`C:\StackLensAI`)
- ✅ File copying from source to deployment location

### 3. Dependency Management:

- ✅ Removes problematic Replit dependencies
- ✅ Installs npm packages
- ✅ Installs Python packages
- ✅ Configures environment variables

### 4. Service Management:

- ✅ PM2 configuration for production
- ✅ Auto-restart on crashes
- ✅ Auto-start on Windows reboot
- ✅ Logging and monitoring

## 🌐 Services That Run

1. **Node.js Backend** (Port 4000)

   - Main API server
   - Serves frontend
   - Handles authentication
   - Database operations

2. **Python Vector Database** (Port 8001)

   - RAG functionality
   - AI-powered suggestions
   - Vector similarity search

3. **React Frontend**
   - Served by Vite/backend
   - User interface
   - Real-time updates

## 🔄 Future Updates

### Git-based Updates:

```powershell
# On your Windows server
git pull

# Re-run deployment with update flag
.\deploy-to-windows.ps1 -ServerIP "YOUR_SERVER_IP" -UpdateOnly
```

## 📊 Management Commands

After deployment, manage your application:

```powershell
# Check status
pm2 status

# View logs
pm2 logs stacklens-ai-server --lines 50

# Restart application
pm2 restart stacklens-ai-server

# Stop application
pm2 stop stacklens-ai-server

# Real-time monitoring
pm2 monit
```

## 🎯 Access Your Application

After successful deployment:

- **Main Application**: `http://YOUR_SERVER_IP:4000`
- **Share this URL with your staff**
- **Vector DB API**: `http://YOUR_SERVER_IP:8001` (internal use only)

## 🐛 Troubleshooting

### Common Issues:

| Problem                     | Solution                                   |
| --------------------------- | ------------------------------------------ |
| ❌ "Access Denied"          | Run PowerShell as Administrator            |
| ❌ Replit dependency errors | Run `.\CLEAN-REPLIT-DEPS.ps1` first        |
| ❌ Port conflicts           | Scripts automatically configure firewall   |
| ❌ App not accessible       | Check Windows Firewall settings            |
| ❌ Services won't start     | Check logs: `pm2 logs stacklens-ai-server` |

### View Detailed Logs:

```powershell
# Application logs
pm2 logs stacklens-ai-server --lines 100

# Python service logs
pm2 logs stacklens-python-vector

# System logs
Get-EventLog -LogName Application -Source "PM2*" -Newest 10
```

## ✅ Success Indicators

You know deployment worked when:

- ✅ No red error messages during deployment
- ✅ `pm2 status` shows services as "online"
- ✅ You can access `http://YOUR_SERVER_IP:4000`
- ✅ Your staff can access the application
- ✅ RAG/AI features work properly

## 🎉 Final Result

Your StackLens-AI platform will be running with:

- 🔒 **Production-grade security** and process management
- 🔄 **Automatic restarts** on crashes or reboots
- 🧠 **Full AI/RAG capabilities** with GPU acceleration
- 🔧 **Easy maintenance** and updates
- 👥 **Multi-user access** for your staff

**Share `http://YOUR_SERVER_IP:4000` with your team and you're done!** 🚀

---

## 📞 Quick Help

Need help? Check these files:

- `HELP.ps1` - Shows all deployment options
- `DEPLOYMENT-CHECKLIST.md` - Step-by-step verification
- Or run `pm2 logs stacklens-ai-server` for error details
