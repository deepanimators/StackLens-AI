# 🚀 StackLens-AI Windows GPU Server Deployment Checklist

## ✅ Pre-Deployment Checklist (Your Local Machine)

- [ ] Copy this `deployment/windows-server/` folder to your Windows GPU server
- [ ] Ensure you have Administrator access on the Windows server
- [ ] Note your Windows server's IP address (you'll need this)

## ✅ Deployment Steps (On Windows Server)

### Method 1: Super Easy (Recommended) 🎯

1. [ ] Right-click `START-DEPLOYMENT.bat` → "Run as administrator"
2. [ ] Enter your server IP when prompted
3. [ ] Wait for automatic setup to complete
4. [ ] Share `http://YOUR_SERVER_IP:4000` with your staff!

### Method 2: PowerShell (For Power Users) ⚡

1. [ ] Open PowerShell as Administrator
2. [ ] Run: `.\QUICK-DEPLOY.ps1 -ServerIP "YOUR_SERVER_IP"`
3. [ ] Wait for deployment to complete

### Method 3: Manual Step-by-Step 🔧

1. [ ] Run: `.\scripts\01-install-prerequisites.ps1`
2. [ ] Run: `.\scripts\02-setup-application.ps1`
3. [ ] Run: `.\scripts\03-start-application.ps1`

## ✅ What Gets Installed/Configured

- [ ] **Chocolatey** - Windows package manager
- [ ] **Node.js LTS** - JavaScript runtime for backend
- [ ] **Python 3.10+** - For RAG/ML microservices
- [ ] **Git** - For future updates
- [ ] **PM2** - Process manager for production
- [ ] **Windows Firewall Rules** - Ports 4000, 5173, 8001
- [ ] **All Dependencies** - npm and pip packages
- [ ] **Database** - SQLite with your data
- [ ] **Services** - Backend, Frontend, Python Vector DB

## ✅ Post-Deployment Verification

After deployment, verify these work:

- [ ] **Main App**: Open `http://YOUR_SERVER_IP:4000` in browser
- [ ] **Service Status**: Run `pm2 status` - should show "online"
- [ ] **Logs**: Run `pm2 logs stacklens-ai-server` - should show no errors
- [ ] **Vector DB**: Should be accessible at port 8001 (internal use)
- [ ] **Staff Access**: Share the main URL with your team

## ✅ Future Updates (Git-Based)

When you make changes to your code:

1. [ ] Push changes to your GitHub repository
2. [ ] On server, navigate to `C:\StackLensAI`
3. [ ] Run: `git pull`
4. [ ] Run: `.\scripts\deploy-to-windows.ps1 -ServerIP "YOUR_IP" -UpdateOnly`
5. [ ] Services will restart automatically with new code

## ✅ Management Commands

Use these commands to manage your application:

```powershell
# Check status
pm2 status

# View logs (last 50 lines)
pm2 logs stacklens-ai-server --lines 50

# Restart application
pm2 restart stacklens-ai-server

# Stop application
pm2 stop stacklens-ai-server

# Start application
pm2 start stacklens-ai-server

# Monitor real-time
pm2 monit
```

## ✅ Troubleshooting

| Problem                   | Solution                                         |
| ------------------------- | ------------------------------------------------ |
| ❌ "Access Denied" errors | Run PowerShell as Administrator                  |
| ❌ Port conflicts         | Scripts handle firewall automatically            |
| ❌ Python package errors  | GPU packages may need manual CUDA setup          |
| ❌ App not accessible     | Check Windows Firewall, ensure port 4000 is open |
| ❌ Services won't start   | Check logs: `pm2 logs stacklens-ai-server`       |

## ✅ Success Indicators

You know deployment worked when:

- [ ] ✅ No red error messages during deployment
- [ ] ✅ `pm2 status` shows services as "online"
- [ ] ✅ You can access `http://YOUR_SERVER_IP:4000`
- [ ] ✅ Your staff can access the application
- [ ] ✅ RAG/AI features work (vector search, suggestions)

## 🎉 You're Done!

Your StackLens-AI platform is now running on a Windows GPU server with:

- **Production-grade process management** (PM2)
- **Automatic service restart** on crashes/reboots
- **Full RAG/ML capabilities** with GPU acceleration
- **Easy update workflow** for future changes
- **Multi-user access** for your staff

**Share this URL with your team**: `http://YOUR_SERVER_IP:4000`

---

💡 **Need Help?** Check the logs with `pm2 logs stacklens-ai-server` for any issues.
