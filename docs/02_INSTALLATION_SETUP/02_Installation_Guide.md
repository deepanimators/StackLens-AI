# Installation Guide - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**Difficulty:** Beginner  
**Time Required:** 15-20 minutes

---

## 📋 Prerequisites Check

Before starting, verify you have:
- ✅ Node.js 18+ installed
- ✅ npm 8+ installed
- ✅ Git installed
- ✅ GitHub account
- ✅ 500MB free disk space

**Not ready?** → [Prerequisites Guide](./01_Prerequisites.md)

---

## 🚀 Installation Steps

### Step 1: Clone the Repository

```bash
# Navigate to where you want to store the project
cd ~/projects  # or your preferred directory

# Clone the repository
git clone https://github.com/deepanimators/StackLens-AI.git

# Enter the project directory
cd StackLens-AI-Deploy
```

**What's happening:**
- `git clone` downloads the entire project from GitHub
- Creates a `StackLens-AI-Deploy` folder with all files
- Sets up Git tracking for version control

**Expected output:**
```
Cloning into 'StackLens-AI-Deploy'...
remote: Counting objects: 1000, done.
Unpacking objects: 100%, done.
```

---

### Step 2: Install Dependencies

```bash
# Install all project dependencies
npm install

# This may take 2-5 minutes on first run
# Watch for the completion message
```

**What's happening:**
- `npm install` reads `package.json`
- Downloads all required packages from npm registry
- Creates `node_modules` folder
- Generates `package-lock.json` (locks versions)

**Expected output:**
```
added 500+ packages in 2m

up to date, audited 512 packages in 2s
```

**If you see warnings:**
- These are usually safe to ignore
- Focus on errors (npm will stop if there's a real error)

---

### Step 3: Environment Configuration

#### Copy Example Environment File
```bash
# Copy the example environment file
cp .env.example .env

# Open the file in your editor
code .env  # VSCode
# or use your preferred editor: nano, vim, etc.
```

#### Configure Environment Variables

Edit `.env` file with your settings:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=sqlite:./data/database.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/stacklens

# Jira Configuration (Optional but Recommended)
JIRA_API_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=STACK

# Firebase Configuration (Optional)
FIREBASE_API_KEY=your-firebase-key
FIREBASE_PROJECT_ID=your-project-id

# Frontend Configuration
VITE_API_URL=http://localhost:4000/api

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./data/logs/app.log
```

**Important Settings:**

| Setting | Required | Example | Notes |
|---------|----------|---------|-------|
| `PORT` | Yes | 4000 | API server port |
| `NODE_ENV` | Yes | development | Set to production for prod |
| `DATABASE_URL` | Yes | sqlite:./data/database.db | SQLite for dev, PostgreSQL for prod |
| `JIRA_*` | No | (see values) | For Jira integration - optional |
| `VITE_API_URL` | Yes | http://localhost:4000/api | Frontend API endpoint |

---

### Step 4: Create Data Directory

```bash
# Create data directory for logs and database
mkdir -p data/logs
mkdir -p data/uploads
mkdir -p data/cache

# Verify directories created
ls -la data/
```

**What's created:**
- `data/logs/` - Application and error logs
- `data/uploads/` - User uploads
- `data/cache/` - Cache files

---

### Step 5: Initialize Database

```bash
# Run database migrations
npm run db:migrate

# Or if migrations are automatic:
npm run build

# Verify database created
ls -la data/database.db  # Should exist
```

**What's happening:**
- Creates database tables
- Sets up initial schema
- Creates any required indexes

**Expected output:**
```
✅ Database migrations complete
✅ Schema created successfully
```

---

### Step 6: Verify Installation

```bash
# Check if everything is working
npm run type-check  # TypeScript check

# Expected output:
# ✅ No TypeScript errors found
```

---

## ▶️ Starting the Application

### Option 1: Development Mode (Both Servers)

```bash
# Start API and web servers together
npm run dev

# This starts:
# - API Server: http://localhost:4000
# - Web App: http://localhost:5173
```

**Expected output:**
```
✨  Vite v5.x.x build 0.00s

➜  Local:   http://localhost:5173/
➜  press h + enter to show help

[5000] Server listening on port 4000
[5000] ✅ LogWatcher service started successfully
```

### Option 2: Separate Terminals (Recommended for Development)

**Terminal 1 - API Server:**
```bash
npm run dev:api

# Expected:
# Server listening on port 4000
# ✅ Routes registered successfully
```

**Terminal 2 - Web App:**
```bash
npm run dev:web

# Expected:
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### Option 3: Production Mode

```bash
# Build for production
npm run build

# Start production server
npm run start

# The app runs on http://localhost:4000
```

---

## 🌐 Access the Application

### Web Interface
Open in your browser:
```
http://localhost:5173
```

### API Endpoint
```
http://localhost:4000/api
```

### Health Check
```bash
# Verify API is running
curl http://localhost:4000/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-16T10:30:45Z"}
```

---

## ✅ Verification Checklist

### Initial Setup
- [ ] Repository cloned
- [ ] npm install completed
- [ ] .env file created and configured
- [ ] data/ directories created
- [ ] Database initialized

### Application Running
- [ ] API server starts on port 4000
- [ ] Web app loads on port 5173
- [ ] No console errors
- [ ] Services initialized (LogWatcher, etc.)

### Test Functionality
- [ ] Can log in to dashboard
- [ ] Dashboard displays correctly
- [ ] API endpoints responding
- [ ] No network errors

---

## 🐛 Troubleshooting Installation

### npm install Fails

**Problem:** "EACCES: permission denied"
```bash
# Solution: Use sudo carefully or fix npm permissions
sudo chown -R $(whoami) ~/.npm
npm install
```

**Problem:** "npm ERR! code ERESOLVE"
```bash
# Try with --legacy-peer-deps
npm install --legacy-peer-deps
```

### Port Already in Use

```bash
# Check what's using the port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or use different port
PORT=4001 npm run dev:api
```

### Database Error

```bash
# Reset database
rm -rf data/database.db

# Reinitialize
npm run db:migrate
```

### TypeScript Errors

```bash
# Check TypeScript
npm run type-check

# If errors exist, they'll be shown
# Fix errors or suppress with // @ts-ignore
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Next Steps

### Immediate
1. ✅ Verify application is running
2. → Explore the dashboard
3. → Check [Quick Start Guide](../01_OVERVIEW/00_QUICK_START.md)

### Short Term
- [ ] Configure Jira integration
- [ ] Set up error rules
- [ ] Test error detection
- [ ] Configure admin settings

### Long Term
- [ ] Deploy to production
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Plan scaling strategy

---

## 🔧 Useful Commands

### Development
```bash
# Start all servers
npm run dev

# Format code
npm run format

# Check code quality
npm run lint

# Run tests
npm run test

# Build for production
npm run build
```

### Debugging
```bash
# View logs
npm run logs

# Check TypeScript
npm run type-check

# Reset everything
npm run clean

# Full rebuild
npm run clean && npm install && npm run build
```

### Database
```bash
# Run migrations
npm run db:migrate

# Seed database (if available)
npm run db:seed

# Reset database
npm run db:reset
```

---

## 📖 Documentation Links

- [Quick Start Guide](../01_OVERVIEW/00_QUICK_START.md)
- [Project Overview](../01_OVERVIEW/01_Project_Overview.md)
- [System Architecture](../01_OVERVIEW/04_System_Architecture.md)
- [Configuration Guide](./03_Configuration.md)
- [Troubleshooting](../08_TROUBLESHOOTING/01_Common_Issues.md)

---

## 🎓 Learning Resources

### First-Time Setup
- This guide covers basic setup
- For advanced setup → [Configuration Guide](./03_Configuration.md)
- For environment variables → [Environment Setup](./04_Environment_Setup.md)

### Stuck?
- Check [Common Issues](../08_TROUBLESHOOTING/01_Common_Issues.md)
- See [FAQ](../08_TROUBLESHOOTING/04_FAQ.md)
- Review [Debug Guide](../08_TROUBLESHOOTING/02_Debug_Guide.md)

---

## 🎉 Success!

If you see:
- ✅ API server running on port 4000
- ✅ Web app on port 5173
- ✅ Dashboard loads in browser
- ✅ No console errors

**Congratulations!** StackLens AI is installed and running! 🚀

**What's next?**
1. [Explore the Quick Start Guide](../01_OVERVIEW/00_QUICK_START.md)
2. [Learn the System Architecture](../01_OVERVIEW/04_System_Architecture.md)
3. [Read the API Reference](../04_API_REFERENCE/00_API_INDEX.md)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete  
**Next:** [Configuration Guide](./03_Configuration.md)
