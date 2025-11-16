# Prerequisites - StackLens AI Installation

**Version:** 1.0  
**Updated:** November 16, 2025  
**Difficulty:** Beginner

---

## 📋 System Requirements

### Minimum Requirements
Your computer must meet these minimum specs:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 2GB | 4GB+ |
| **Disk Space** | 500MB | 2GB |
| **OS** | macOS 10.12+ / Windows 10+ / Ubuntu 18.04+ | Latest LTS |

### Operating System Support
- ✅ macOS 10.12 or later
- ✅ Windows 10 or later
- ✅ Ubuntu 18.04 LTS or later
- ✅ Other Linux distributions (CentOS, Debian, etc.)

---

## 🛠️ Required Software

### Node.js & npm

#### What You Need
- **Node.js:** Version 18.0 or higher
- **npm:** Version 8.0 or higher

#### Check Your Versions
```bash
# Check Node.js version
node --version
# Output should be: v18.0.0 or higher

# Check npm version
npm --version
# Output should be: 8.0.0 or higher
```

#### Installation

**Option 1: Official Node.js Website (Easiest)**
1. Go to https://nodejs.org/
2. Download **LTS version** (recommended)
3. Run installer
4. Follow setup wizard
5. Restart terminal

**Option 2: Homebrew (macOS)**
```bash
# Install Homebrew if needed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify installation
node --version
npm --version
```

**Option 3: apt (Ubuntu/Debian)**
```bash
# Update package list
sudo apt update

# Install Node.js and npm
sudo apt install nodejs npm

# Verify installation
node --version
npm --version
```

**Option 4: Windows Package Manager**
```powershell
# Using Chocolatey
choco install nodejs

# Or using Winget (Windows 11)
winget install OpenJS.NodeJS
```

---

### Git

#### What You Need
- **Git:** Any recent version (2.0+)

#### Check Installation
```bash
git --version
# Output: git version 2.x.x or higher
```

#### Installation

**macOS**
```bash
brew install git
```

**Ubuntu/Debian**
```bash
sudo apt install git
```

**Windows**
- Download from https://git-scm.com/
- Run installer and follow setup

**Verify**
```bash
git --version
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

---

## 🔑 Required Accounts

### GitHub Account
**Required for:** Cloning the repository

1. Go to https://github.com
2. Click "Sign up"
3. Create account with email
4. Verify email
5. Set up SSH keys (optional but recommended)

**SSH Setup (Optional but Recommended)**
```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Add public key to GitHub
# Go to GitHub Settings → SSH Keys → New SSH Key
# Paste contents of ~/.ssh/id_ed25519.pub
```

### Jira Account (Optional but Recommended)
**Required for:** Full error automation and ticket creation

1. Create Jira Cloud account at https://www.atlassian.com/
2. Create a project
3. Get API token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Create new token
   - Save securely (needed in `.env` file)

### Firebase Account (Optional)
**Required for:** Authentication features

1. Go to https://firebase.google.com
2. Click "Get Started"
3. Create new project
4. Get credentials from project settings

---

## 🧠 Knowledge Requirements

### Helpful But Not Required
- Basic command-line/terminal usage
- General programming concepts
- Web application understanding

### You Should Know How To
- Open terminal/command prompt
- Navigate directories with `cd` command
- Run npm commands
- Basic file editing

### Don't Need To Know (Yet)
- React or TypeScript (you'll learn!)
- Express.js details
- Jira API details
- Advanced database concepts

---

## 📋 Pre-Installation Checklist

Before starting installation, verify you have:

- [ ] Node.js v18+ installed
- [ ] npm v8+ installed
- [ ] Git installed and configured
- [ ] GitHub account (free is fine)
- [ ] Text editor (VSCode recommended)
- [ ] 500MB free disk space
- [ ] Terminal/Command Prompt access
- [ ] Internet connection

---

## 🖥️ Recommended Development Setup

### Text Editor (Pick One)
1. **Visual Studio Code** (Recommended) ⭐
   - Download: https://code.visualstudio.com
   - Recommended extensions:
     - ESLint
     - Prettier
     - TypeScript Vue Plugin
     - Thunder Client (for API testing)

2. **WebStorm**
   - Download: https://www.jetbrains.com/webstorm/
   - Professional IDE with built-in tools

3. **Sublime Text**
   - Download: https://www.sublimetext.com/
   - Lightweight and fast

### Terminal (Pick One)
**macOS**
- Default Terminal ✅
- iTerm2 (better features)
- Alacritty (fast)

**Windows**
- PowerShell ✅
- Windows Terminal (modern)
- Git Bash (Unix-like)

**Linux**
- GNOME Terminal ✅
- Konsole
- Alacritty

### Additional Tools (Optional)
- **Postman** - API testing: https://www.postman.com
- **Thunder Client** - VSCode extension for API testing
- **Docker Desktop** - Containerization: https://www.docker.com
- **Homebrew (macOS)** - Package manager: https://brew.sh

---

## 🌐 Network Requirements

### Connectivity
- ✅ Active internet connection (for dependencies)
- ✅ Access to npm registry
- ✅ Access to GitHub
- ✅ Access to Jira Cloud (if using Jira)

### Firewalls/Proxies
If behind corporate firewall:
```bash
# Configure npm proxy
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# For SSH (add to ~/.ssh/config)
Host github.com
    ProxyCommand nc -x proxy.company.com:8080 github.com %h %p
```

---

## 🔐 Security Setup

### Important Before Starting
1. **Environment File** (.env)
   - Never commit to Git
   - Never share with others
   - Keep API keys secure

2. **SSH Keys**
   - Keep private key private (never share)
   - Use passphrase for protection
   - Store securely

3. **API Tokens**
   - Rotate regularly
   - Use least privilege
   - Store in environment variables only

---

## 🚀 Next Steps

Once you have all prerequisites:

1. **Verify Everything Works**
   ```bash
   node --version  # Should be v18+
   npm --version   # Should be v8+
   git --version   # Should be v2+
   ```

2. **Continue with Installation**
   → [Installation Guide](./02_Installation_Guide.md)

3. **Start Development**
   → [Quick Start Guide](../01_OVERVIEW/00_QUICK_START.md)

---

## 🆘 Troubleshooting Prerequisites

### npm not found
```bash
# Reinstall Node.js from https://nodejs.org
# Then verify:
npm --version
```

### Git not found
```bash
# macOS
brew install git

# Ubuntu
sudo apt install git

# Windows: Download from https://git-scm.com/
```

### Wrong Node.js version
```bash
# Upgrade Node.js
# macOS
brew upgrade node

# Ubuntu
sudo apt upgrade nodejs

# Windows: Download latest from nodejs.org
```

### Terminal not recognizing npm
- Restart terminal after installation
- On Windows: Restart entire computer
- Check PATH environment variable

---

## 📖 Additional Resources

### Official Documentation
- Node.js: https://nodejs.org/en/docs/
- npm: https://docs.npmjs.com/
- Git: https://git-scm.com/doc

### Learning Resources
- JavaScript Basics: https://javascript.info
- Node.js Guide: https://nodejs.org/en/docs/guides/
- npm Tutorial: https://docs.npmjs.com/

### Help & Support
- Node.js Community: https://nodejs.org/en/community
- npm Support: https://npm.community/
- GitHub Help: https://docs.github.com

---

## ✅ Verification Commands

Run these to verify everything is installed:

```bash
# Verify all prerequisites
echo "Checking Node.js..." && node --version
echo "Checking npm..." && npm --version
echo "Checking Git..." && git --version

# All should show version numbers like:
# v18.x.x
# 8.x.x
# git version 2.x.x
```

**All showing versions?** ✅ You're ready to install StackLens AI!

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete  
**Next:** [Installation Guide](./02_Installation_Guide.md)
