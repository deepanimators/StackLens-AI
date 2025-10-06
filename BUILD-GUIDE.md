# StackLens AI - Build Guide

## 📦 How to Build This Application

This guide explains how to build the StackLens AI application for both development and production environments.

---

## 🔧 Prerequisites

Before building, ensure you have:

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18.x or higher
   ```

2. **npm** (v9 or higher)
   ```bash
   npm --version
   ```

3. **Git** (for cloning/pulling updates)
   ```bash
   git --version
   ```

---

## 📥 Step 1: Install Dependencies

First, install all required npm packages:

```bash
npm install
```

This will install:
- Frontend dependencies (React, Vite, shadcn/ui, etc.)
- Backend dependencies (Express, Drizzle ORM, etc.)
- Build tools (TypeScript, esbuild, etc.)

---

## 🏗️ Step 2: Build the Application

### Full Build (Client + Server)

Build both frontend and backend:

```bash
npm run build
```

This command runs:
1. `npm run build:client` - Builds the React frontend
2. `npm run build:server` - Builds the Node.js backend

### Build Client Only

Build just the frontend (React/Vite):

```bash
npm run build:client
```

**Output:** `dist/` folder containing static files (HTML, CSS, JS)

### Build Server Only

Build just the backend (Node.js/Express):

```bash
npm run build:server
```

**Output:** `dist/index.js` - Bundled server application

---

## 🚀 Step 3: Run the Application

### Development Mode (Recommended for Development)

Run both frontend and backend in development mode with hot reload:

```bash
npm run dev
```

This starts:
- Frontend dev server on `http://localhost:5173`
- Backend API server on `http://localhost:4000`

**Features:**
- ✅ Hot reload for code changes
- ✅ TypeScript type checking
- ✅ Source maps for debugging
- ✅ Fast refresh

### Production Mode (After Build)

After building, start the production server:

```bash
npm start
```

This runs the built application from the `dist/` folder.

**Access:** `http://localhost:4000`

---

## 🔍 Available Build Scripts

Here are all the build-related scripts from `package.json`:

| Script | Command | Description |
|--------|---------|-------------|
| **Development** |
| `npm run dev` | Runs both client & server in dev mode | Best for development |
| `npm run dev:client` | Vite dev server only | Frontend development only |
| `npm run dev:server` | Node server only | Backend development only |
| **Production Build** |
| `npm run build` | Builds client + server | **Main build command** |
| `npm run build:client` | Vite build | Builds React frontend |
| `npm run build:server` | esbuild bundle | Builds Node backend |
| **Production Run** |
| `npm start` | Runs production build | After `npm run build` |
| **Type Checking** |
| `npm run check` | TypeScript check (all) | Verify types |
| `npm run check:client` | TypeScript check (client) | Frontend types only |
| **Database** |
| `npm run db:push` | Push schema to DB | Update database |
| `npm run db:generate` | Generate migrations | Create migration files |
| `npm run db:migrate` | Run migrations | Apply migrations |
| **Utilities** |
| `npm run clean` | Remove dist & cache | Clean build artifacts |
| `npm run reset` | Clean + reinstall | Fresh start |

---

## 🌐 Production Deployment

### For Windows Server

Use the automated deployment scripts:

```powershell
# PowerShell as Administrator
.\QUICK-DEPLOY.ps1 -ServerIP "YOUR_SERVER_IP" -Port 4000
```

See `WINDOWS-SERVER-DEPLOYMENT.md` for details.

### For Linux/macOS

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export PORT=4000
   export SERVER_IP=0.0.0.0
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

### Using PM2 (Recommended for Production)

Install PM2 process manager:

```bash
npm install -g pm2
```

Start with PM2:

```bash
pm2 start dist/index.js --name "stacklens-ai"
pm2 save
pm2 startup
```

Monitor:

```bash
pm2 status
pm2 logs stacklens-ai
pm2 monit
```

---

## 📁 Build Output Structure

After running `npm run build`, you'll have:

```
dist/
├── index.js              # Bundled backend server
├── assets/               # Frontend assets
│   ├── index-[hash].js   # Frontend JavaScript
│   ├── index-[hash].css  # Frontend CSS
│   └── ...
├── index.html            # Frontend HTML entry point
└── ...
```

---

## 🔧 Build Configuration

### Frontend Build (Vite)

Configuration: `vite.config.ts`

Key settings:
- **Output:** `dist/` folder
- **Entry:** `client/index.html`
- **Plugins:** React, TailwindCSS
- **Optimizations:** Code splitting, minification

### Backend Build (esbuild)

Command in `package.json`:
```json
"build:server": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

Settings:
- **Entry:** `server/index.ts`
- **Platform:** Node.js
- **Format:** ESM (ES Modules)
- **Output:** `dist/index.js`
- **External:** All node_modules

---

## 🐛 Troubleshooting

### Build Fails with TypeScript Errors

```bash
# Check types without building
npm run check

# Fix TypeScript errors, then rebuild
npm run build
```

### Build Fails with Missing Dependencies

```bash
# Clean and reinstall
npm run reset

# Then rebuild
npm run build
```

### Build Success but Runtime Errors

1. Check environment variables in `.env`
2. Ensure database exists: `./db/stacklens.db`
3. Check logs for specific errors

### Port Already in Use

If port 4000 is busy:

```bash
# Change port in .env
PORT=5000

# Or set environment variable
export PORT=5000
npm start
```

---

## ⚡ Quick Reference

**Development:**
```bash
npm install          # Install dependencies
npm run dev          # Start development server
```

**Production:**
```bash
npm install          # Install dependencies
npm run build        # Build application
npm start            # Start production server
```

**Full Clean Build:**
```bash
npm run clean        # Remove old build
npm install          # Reinstall dependencies
npm run build        # Build fresh
npm start            # Run production
```

---

## 📝 Notes

1. **First time building?** Run `npm install` before `npm run build`

2. **Environment files:**
   - Development: `.env`
   - Production: `.env.production`

3. **Database migrations:**
   - Run `npm run db:push` after schema changes

4. **API URL configuration:**
   - Development: `http://localhost:4000`
   - Production: Set `VITE_API_URL` in `.env.production`

5. **Gemini API Key:**
   - Required for AI features
   - Set in `.env`: `GEMINI_API_KEY=your_key_here`

---

## 🎯 Summary

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| **Build for production** | `npm run build` |
| Start production server | `npm start` |
| Run in development | `npm run dev` |
| Type check | `npm run check` |
| Clean build | `npm run clean` |

**Main build command:** `npm run build`

**Main start command:** `npm start` (after building)

---

## 📞 Support

For build issues:
1. Check this guide
2. Review `package.json` scripts
3. Check terminal error messages
4. Ensure all prerequisites are installed

---

**Last Updated:** October 6, 2025
