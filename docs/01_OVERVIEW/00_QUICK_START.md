# 🚀 Quick Start Guide - StackLens AI

**Estimated Time:** 5 minutes  
**Prerequisites:** Node.js 18+, npm/yarn, Git  
**Difficulty:** Beginner

---

## ⚡ TL;DR - Get Running in 5 Minutes

```bash
# 1. Clone the repository
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI-Deploy

# 2. Install dependencies
npm install

# 3. Configure environment (copy and adjust)
cp .env.example .env

# 4. Start both servers
npm run dev

# 5. Open browser
# API: http://localhost:4000
# App: http://localhost:5173
```

Done! 🎉

---

## 📋 What You Need

### Minimum Requirements
- **Node.js:** v18 or higher
- **npm:** v8 or higher  
- **Git:** Latest version
- **RAM:** 2GB minimum
- **Disk Space:** 500MB

### Recommended Setup
- **Node.js:** v20 or higher
- **npm:** v9 or higher
- **VSCode:** Latest version (for development)
- **RAM:** 4GB+ 
- **SSD:** Recommended

### Optional for Full Features
- **Docker:** For containerization
- **PostgreSQL:** For advanced database features
- **Jira Account:** For issue tracking integration
- **Firebase:** For authentication (optional)

---

## 🔧 Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI-Deploy
```

### Step 2: Install Dependencies
```bash
# Install root dependencies
npm install

# Install app dependencies (automatically done)
# Check if needed: npm install --workspaces
```

### Step 3: Environment Setup
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your editor
```

### Step 4: Start Development Servers
```bash
# Start both servers in development mode
npm run dev

# Or start individually:
# Terminal 1:
npm run dev:api

# Terminal 2:
npm run dev:web
```

---

## ✅ Verify Installation

### Check API Server
```bash
# Should return version info
curl http://localhost:4000/api/version

# Expected response:
# { "version": "1.0.0", "status": "running" }
```

### Check Web App
Open browser: `http://localhost:5173`

Should see:
- ✅ Login page or dashboard
- ✅ No console errors
- ✅ Network requests to API working

### Check Services
In browser console or API logs:
- ✅ LogWatcher service started
- ✅ Error detection working
- ✅ Dashboard connected

---

## 🎯 Your First Action

### 1. Log In
- **Default User:** Check `.env` or documentation
- **Password:** Set during setup

### 2. View Dashboard
- See all detected errors
- Real-time error metrics
- System status

### 3. Generate Test Error (Optional)
```bash
# In separate terminal
curl -X POST http://localhost:4000/api/demo/generate-error \
  -H "Content-Type: application/json" \
  -d '{"errorType": "CRITICAL"}'
```

Expected: Error appears on dashboard in seconds!

---

## 🚨 Troubleshooting Quick Fixes

### Port Already in Use
```bash
# Find process on port 4000
lsof -i :4000

# Kill process
kill -9 <PID>

# Or use different port
PORT=4001 npm run dev:api
```

### Dependencies Issue
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules
npm install
```

### Build Error
```bash
# Full rebuild
npm run clean
npm install
npm run build
npm run dev
```

### Still Not Working?
1. Check [Common Issues](../08_TROUBLESHOOTING/01_Common_Issues.md)
2. See [Debug Guide](../08_TROUBLESHOOTING/02_Debug_Guide.md)
3. Open [GitHub Issue](https://github.com/deepanimators/StackLens-AI/issues)

---

## 📚 Next Steps

### Learn About the System
- Read [Project Overview](./01_Project_Overview.md) (10 min)
- Explore [System Architecture](./04_System_Architecture.md) (15 min)

### Use the API
- Check [API Reference](../04_API_REFERENCE/00_API_INDEX.md)
- Try example endpoints

### Configure Integration
- Set up [Jira Integration](../03_CORE_COMPONENTS/05_Jira_Integration.md)
- Configure [Error Detection](../03_CORE_COMPONENTS/03_Error_Detection.md)

### Deploy to Production
- Follow [Production Deployment](../07_DEPLOYMENT/02_Production_Deployment.md)

---

## 🎓 Learn More

| Duration | Topic | Link |
|----------|-------|------|
| 10 min | What is StackLens? | [Overview](./01_Project_Overview.md) |
| 15 min | How it works | [Architecture](./04_System_Architecture.md) |
| 30 min | Complete setup | [Installation Guide](../02_INSTALLATION_SETUP/02_Installation_Guide.md) |
| 1 hour | API usage | [API Reference](../04_API_REFERENCE/00_API_INDEX.md) |

---

## 🆘 Quick Help

**Something not working?**
```bash
# See logs
npm run logs

# Check server health
curl http://localhost:4000/health

# Run tests
npm test
```

**Need more help?**
- [FAQ](../08_TROUBLESHOOTING/04_FAQ.md)
- [Common Issues](../08_TROUBLESHOOTING/01_Common_Issues.md)
- [Debug Guide](../08_TROUBLESHOOTING/02_Debug_Guide.md)

---

## 🎉 Success!

You now have StackLens AI running! 

**What's Next:**
1. Explore the dashboard
2. Review the architecture
3. Read the full documentation
4. Deploy to production

**Questions?** Check the [FAQ](../08_TROUBLESHOOTING/04_FAQ.md) or open an issue.

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete
