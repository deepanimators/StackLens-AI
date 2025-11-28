# StackLens AI Platform - Windows Deployment Guide

## Quick Start

### Prerequisites
1. **Node.js 20+** - Download from [nodejs.org](https://nodejs.org/)
2. **pnpm** - Will be installed automatically if not present
3. **Java 21** - Required for Kafka (installed by infrastructure script)

### Step 1: Install Dependencies & Build
```batch
# From the project root directory, run:
install-and-build.bat

# Or using PowerShell directly:
powershell -ExecutionPolicy Bypass -File scripts\install-and-build-windows.ps1
```

### Step 2: Start Infrastructure (Kafka + OpenTelemetry)
```powershell
# First, install infrastructure services (one-time):
.\scripts\install-services.bat

# Then start the services:
.\infrastructure\start-services.ps1
```

### Step 3: Start Application Services
```batch
# Start all services:
start-stack.bat

# Or with options:
powershell -ExecutionPolicy Bypass -File scripts\start-stack-windows.ps1 -SkipInstall -SkipBuild
```

---

## Scripts Overview

| Script | Description |
|--------|-------------|
| `install-and-build.bat` | Install all dependencies and build all projects |
| `start-stack.bat` | Start all application services |
| `scripts\start-stack-windows.ps1` | PowerShell startup script with options |
| `scripts\stop-stack-windows.ps1` | Stop all running services |
| `scripts\status-stack-windows.ps1` | Check status of all services |
| `scripts\install-services.bat` | Install Kafka & OTEL (infrastructure) |

---

## Service Endpoints

After starting all services:

| Service | URL | Description |
|---------|-----|-------------|
| StackLens UI | http://localhost:5173 | Main dashboard |
| StackLens API | http://localhost:4000 | Backend API |
| POS Demo Frontend | http://localhost:5174 | Demo POS application |
| POS Demo Backend | http://localhost:3000 | Demo POS API |
| Legacy Backend | http://localhost:3001 | Legacy microservice |

### Infrastructure

| Service | Port | Description |
|---------|------|-------------|
| Kafka Broker | 9092 | Message broker |
| Kafka Controller | 9093 | KRaft controller |
| OTEL gRPC | 4317 | OpenTelemetry gRPC |
| OTEL HTTP | 4318 | OpenTelemetry HTTP |
| OTEL Health | 13133 | Health check endpoint |

---

## PowerShell Script Options

### start-stack-windows.ps1

```powershell
# Full install, build, and start (first time)
.\scripts\start-stack-windows.ps1

# Skip install (dependencies already installed)
.\scripts\start-stack-windows.ps1 -SkipInstall

# Skip build (already built)
.\scripts\start-stack-windows.ps1 -SkipInstall -SkipBuild

# Development mode (hot reload, no build)
.\scripts\start-stack-windows.ps1 -DevMode

# Skip infrastructure check
.\scripts\start-stack-windows.ps1 -SkipInfra
```

---

## Troubleshooting

### Port Already in Use
```powershell
# Find and kill process on a specific port
Get-NetTCPConnection -LocalPort 4000 -State Listen | 
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Check Service Status
```powershell
.\scripts\status-stack-windows.ps1
```

### View Logs
Logs are stored in the `logs\` directory:
- `server.log` - StackLens API logs
- `client.log` - Frontend dev server logs
- `pos_backend.log` - POS Demo backend logs
- `pos_frontend.log` - POS Demo frontend logs
- `legacy_backend.log` - Legacy backend logs

### Reset Everything
```powershell
# Stop all services
.\scripts\stop-stack-windows.ps1

# Clean node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force pos-demo\backend\node_modules
Remove-Item -Recurse -Force pos-demo\frontend\node_modules
Remove-Item -Recurse -Force stacklens\backend\node_modules
Remove-Item -Recurse -Force demo-pos-app\node_modules

# Reinstall
.\install-and-build.bat
```

---

## Project Structure

```
StackLens-AI/
├── apps/
│   ├── api/              # Main API server (Port 4000)
│   └── web/              # Main frontend (Port 5173)
├── pos-demo/
│   ├── backend/          # POS demo API (Port 3000)
│   └── frontend/         # POS demo UI (Port 5174)
├── stacklens/
│   └── backend/          # Legacy backend (Port 3001)
├── demo-pos-app/         # Standalone demo app
├── python-services/      # ML/AI Python services
├── infrastructure/       # Kafka, OTEL installation
├── scripts/              # Windows scripts
│   ├── start-stack-windows.ps1
│   ├── stop-stack-windows.ps1
│   ├── status-stack-windows.ps1
│   ├── install-and-build-windows.ps1
│   └── install-services-windows.ps1
├── install-and-build.bat # Quick install script
└── start-stack.bat       # Quick start script
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=file:./data/database/stacklens.db

# Kafka
KAFKA_BROKERS=localhost:9092

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# API Settings
PORT=4000
NODE_ENV=production

# Optional: AI Services
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
```

---

## Running in Production

For production deployment on Windows Server:

1. Install as Windows Services using NSSM (included in infrastructure installer)
2. Configure automatic startup
3. Set up proper logging rotation
4. Configure Windows Firewall (done automatically by installer)

```powershell
# The infrastructure installer creates Windows Services:
# - StackLensKafka
# - StackLensOtel

# You can manage them with:
Start-Service StackLensKafka
Start-Service StackLensOtel
Stop-Service StackLensKafka
Stop-Service StackLensOtel
```
