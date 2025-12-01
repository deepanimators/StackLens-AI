# StackLens AI - Domain Setup Guide for stacklens.app
# Windows EC2 Deployment with Cloudflare (No IIS, No ports 80/443)

This guide sets up `stacklens.app` using **Cloudflare** to connect directly to your Node.js application ports. No IIS, no ports 80/443 needed.

## 📋 Overview

| Subdomain | Application Port | Purpose |
|-----------|------------------|---------|
| stacklens.app | 5173 | Main Web Frontend |
| www.stacklens.app | 5173 | Main Web Frontend |
| api.stacklens.app | 4000 | Main Backend API |
| pos.stacklens.app | 5174 | POS Frontend |
| posapi.stacklens.app | 3000 | POS Backend API |

**Ports Used:** 3000, 4000, 5173, 5174 (direct access via Cloudflare)
**Ports NOT Used:** 80, 443 (reserved for other apps on your server)

---

## Step 1: Cloudflare DNS Configuration

### 1.1 Add Your Domain to Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click "Add a Site" → Enter `stacklens.app`
3. Select a plan (Free works fine)
4. Update your domain's nameservers at your registrar to Cloudflare's nameservers

### 1.2 Get Your EC2 Public IP

```powershell
# Run on your Windows EC2 instance
Invoke-RestMethod -Uri http://169.254.169.254/latest/meta-data/public-ipv4
```

### 1.3 Add DNS Records in Cloudflare (with custom ports via Origin Rules)

Go to Cloudflare Dashboard → DNS → Records:

| Type | Name | Content (IPv4) | Proxy Status | TTL |
|------|------|----------------|--------------|-----|
| A | @ | YOUR_EC2_PUBLIC_IP | ☁️ Proxied | Auto |
| A | www | YOUR_EC2_PUBLIC_IP | ☁️ Proxied | Auto |
| A | api | YOUR_EC2_PUBLIC_IP | ☁️ Proxied | Auto |
| A | pos | YOUR_EC2_PUBLIC_IP | ☁️ Proxied | Auto |
| A | posapi | YOUR_EC2_PUBLIC_IP | ☁️ Proxied | Auto |

### 1.4 Configure Cloudflare Origin Rules (REQUIRED - Routes to custom ports)

⚠️ **This is the key step!** Cloudflare normally connects to port 80/443, but Origin Rules let you route to custom ports.

Go to **Rules → Origin Rules → Create Rule**:

**Rule 1: Main Frontend (stacklens.app)**
- Rule name: `StackLens Main Frontend`
- When: `(http.host eq "stacklens.app") or (http.host eq "www.stacklens.app")`
- Then: Destination Port → Rewrite to `5173`
- Deploy

**Rule 2: Main API (api.stacklens.app)**
- Rule name: `StackLens Main API`
- When: `(http.host eq "api.stacklens.app")`
- Then: Destination Port → Rewrite to `4000`
- Deploy

**Rule 3: POS Frontend (pos.stacklens.app)**
- Rule name: `StackLens POS Frontend`
- When: `(http.host eq "pos.stacklens.app")`
- Then: Destination Port → Rewrite to `5174`
- Deploy

**Rule 4: POS API (posapi.stacklens.app)**
- Rule name: `StackLens POS API`
- When: `(http.host eq "posapi.stacklens.app")`
- Then: Destination Port → Rewrite to `3000`
- Deploy

### 1.5 Configure Cloudflare SSL/TLS Settings

Go to Cloudflare Dashboard → SSL/TLS:

1. **Overview Tab:**
   - Set encryption mode to **"Flexible"** (Cloudflare HTTPS → HTTP to your server)

2. **Edge Certificates Tab:**
   - Enable **"Always Use HTTPS"** ✅
   - Enable **"Automatic HTTPS Rewrites"** ✅

---

## Step 2: EC2 Security Group Configuration

Open these ports in your EC2 Security Group:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 5173 | TCP | 0.0.0.0/0 | Main Frontend |
| 4000 | TCP | 0.0.0.0/0 | Main API |
| 5174 | TCP | 0.0.0.0/0 | POS Frontend |
| 3000 | TCP | 0.0.0.0/0 | POS API |
| 3389 | TCP | Your IP only | Windows RDP |

> 💡 **Pro Tip:** For extra security, restrict ports 5173/4000/5174/3000 to [Cloudflare IP ranges](https://www.cloudflare.com/ips/) only.

---

## Step 3: Configure Windows Firewall

Run PowerShell as Administrator:

```powershell
cd C:\StackLens-AI

# Option A: Use the setup script (recommended)
.\infrastructure\windows\Setup-Firewall.ps1

# Option B: Manual commands
New-NetFirewallRule -DisplayName "StackLens Main Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "StackLens Main API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "StackLens POS Frontend" -Direction Inbound -LocalPort 5174 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "StackLens POS API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## Step 4: Start Applications

```powershell
cd C:\StackLens-AI
.\infrastructure\windows\Start-StackLens.ps1
```

Or for auto-start on boot:
```powershell
.\infrastructure\windows\Install-Services.ps1
```

---

## Step 5: Verify Setup

### Test via Cloudflare (HTTPS)

Open in browser:
- https://stacklens.app
- https://api.stacklens.app/health
- https://pos.stacklens.app
- https://posapi.stacklens.app/health

### Test Direct Access (HTTP on custom ports)

```bash
curl http://YOUR_EC2_IP:5173   # Main Frontend
curl http://YOUR_EC2_IP:4000   # Main API
curl http://YOUR_EC2_IP:5174   # POS Frontend
curl http://YOUR_EC2_IP:3000   # POS API
```

---

## Architecture (Cloudflare Direct to App Ports)

```
Internet Users (HTTPS)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                       CLOUDFLARE                             │
│  • SSL/TLS Termination (Users connect via HTTPS)            │
│  • Origin Rules (Routes to custom ports)                     │
│  • DDoS Protection                                           │
│                                                              │
│  stacklens.app     → Origin Port 5173                       │
│  api.stacklens.app → Origin Port 4000                       │
│  pos.stacklens.app → Origin Port 5174                       │
│  posapi.stacklens.app → Origin Port 3000                    │
└─────────────────────────────────────────────────────────────┘
    │ (HTTP to custom ports)
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Windows EC2 Instance                      │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │Main Frontend│  │  Main API   │  │    Databases        │  │
│  │  :5173      │  │   :4000     │  │    (SQLite, etc.)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │POS Frontend │  │   POS API   │                           │
│  │  :5174      │  │   :3000     │                           │
│  └─────────────┘  └─────────────┘                           │
│                                                              │
│  Ports 80/443: NOT USED (available for other apps)          │
└─────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Cloudflare 520/521/522 Errors

These errors mean Cloudflare can't reach your server:

1. **520 - Web Server Error:** App not responding correctly
2. **521 - Web Server Down:** App not running on expected port
3. **522 - Connection Timed Out:** Security group/firewall blocking traffic

**Fix:**
```powershell
# Check if apps are running
Get-NetTCPConnection -LocalPort 5173
Get-NetTCPConnection -LocalPort 4000
Get-NetTCPConnection -LocalPort 5174
Get-NetTCPConnection -LocalPort 3000

# Start applications
.\Start-StackLens.ps1
```

### Apps Not Starting

```powershell
# Check logs
Get-Content C:\StackLens-AI\logs\main-api.log -Tail 50
Get-Content C:\StackLens-AI\logs\pos-api.log -Tail 50
```

### Verify Firewall Rules

```powershell
Get-NetFirewallRule -DisplayName "*StackLens*" | Format-Table Name, Enabled, Direction, Action
```

---

## Management Commands

| Command | Purpose |
|---------|---------|
| `.\infrastructure\windows\Start-StackLens.ps1` | Start all applications |
| `.\infrastructure\windows\Stop-StackLens.ps1` | Stop all applications |
| `Get-NetTCPConnection -LocalPort 5173,4000,5174,3000` | Check running ports |

---

## Security Checklist

- [x] Ports 80/443 NOT used (available for other apps)
- [x] Only app ports (5173, 4000, 5174, 3000) exposed
- [x] SSL/TLS via Cloudflare (free)
- [x] Cloudflare Origin Rules route to custom ports
- [x] DDoS protection via Cloudflare
- [ ] Consider restricting app ports to Cloudflare IPs only
- [ ] Windows Updates enabled
- [ ] RDP restricted to your IP only

---

## Quick Reference

**Your domains after setup:**
- 🌐 Main App: https://stacklens.app
- 🔌 Main API: https://api.stacklens.app
- 🛒 POS App: https://pos.stacklens.app
- 🔌 POS API: https://posapi.stacklens.app
