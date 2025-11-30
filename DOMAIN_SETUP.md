# StackLens AI - Domain Setup Guide for stacklens.app
# Windows EC2 Deployment with Custom Domain

This guide walks you through setting up `stacklens.app` for your StackLens AI application on Windows EC2.

## 📋 Overview

| Component | Purpose |
|-----------|---------|
| Domain | stacklens.app |
| SSL/TLS | Let's Encrypt (free certificates) |
| Reverse Proxy | Nginx (handles SSL, routing) |
| Backend API | Port 4000 |
| Frontend | Port 5173 |

---

## Step 1: DNS Configuration

### Option A: Using Route 53 (Recommended for AWS)

1. **Open AWS Route 53 Console**
   - Go to: https://console.aws.amazon.com/route53/

2. **Create Hosted Zone** (if not already created)
   ```
   Domain name: stacklens.app
   Type: Public Hosted Zone
   ```

3. **Update Domain Registrar NS Records**
   - Copy the 4 NS (Name Server) records from Route 53
   - Update them at your domain registrar (where you bought stacklens.app)

4. **Create DNS Records**

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | stacklens.app | YOUR_EC2_PUBLIC_IP | 300 |
   | A | www | YOUR_EC2_PUBLIC_IP | 300 |
   | A | api | YOUR_EC2_PUBLIC_IP | 300 |
   | CNAME | www | stacklens.app | 300 |

### Option B: Using Other DNS Providers (Cloudflare, GoDaddy, etc.)

Add these DNS records at your domain registrar:

```
Type: A
Name: @ (or stacklens.app)
Value: YOUR_EC2_PUBLIC_IP
TTL: 300 (5 minutes) or Auto

Type: A  
Name: www
Value: YOUR_EC2_PUBLIC_IP
TTL: 300

Type: A
Name: api
Value: YOUR_EC2_PUBLIC_IP
TTL: 300
```

### Get Your EC2 Public IP

```powershell
# Run on your Windows EC2 instance
Invoke-RestMethod -Uri http://169.254.169.254/latest/meta-data/public-ipv4
```

Or find it in AWS EC2 Console → Instances → Your Instance → Public IPv4 address

---

## Step 2: EC2 Security Group Configuration

Open these ports in your EC2 Security Group:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 80 | TCP | 0.0.0.0/0 | HTTP (redirect to HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS |
| 22 | TCP | Your IP | SSH/RDP Access |
| 3389 | TCP | Your IP | Windows RDP |

### AWS Console Steps:

1. Go to EC2 Console → Security Groups
2. Select your instance's Security Group
3. Edit Inbound Rules → Add Rules:

```
Type: HTTP
Port: 80
Source: 0.0.0.0/0, ::/0

Type: HTTPS  
Port: 443
Source: 0.0.0.0/0, ::/0
```

---

## Step 3: Install Nginx on Windows EC2

### Option A: Using Docker (Recommended)

```powershell
# Navigate to project directory
cd C:\StackLens-AI

# Start Nginx container
docker run -d `
    --name nginx-proxy `
    --restart unless-stopped `
    -p 80:80 `
    -p 443:443 `
    -v C:\StackLens-AI\infrastructure\nginx\nginx.conf:/etc/nginx/conf.d/default.conf:ro `
    -v C:\StackLens-AI\certbot\conf:/etc/letsencrypt:ro `
    -v C:\StackLens-AI\certbot\www:/var/www/certbot:ro `
    nginx:alpine
```

### Option B: Native Windows Installation

1. Download Nginx for Windows: http://nginx.org/en/download.html
2. Extract to `C:\nginx`
3. Copy configuration:
   ```powershell
   Copy-Item "C:\StackLens-AI\infrastructure\nginx\nginx.conf" "C:\nginx\conf\nginx.conf"
   ```
4. Start Nginx:
   ```powershell
   cd C:\nginx
   .\nginx.exe
   ```

---

## Step 4: SSL Certificate Setup with Let's Encrypt

### Method 1: Using Certbot Docker (Recommended)

```powershell
# Create directories
mkdir -p C:\StackLens-AI\certbot\conf
mkdir -p C:\StackLens-AI\certbot\www

# First, start nginx without SSL for initial cert request
# Create temporary nginx config without SSL

# Request certificate
docker run -it --rm `
    -v C:\StackLens-AI\certbot\conf:/etc/letsencrypt `
    -v C:\StackLens-AI\certbot\www:/var/www/certbot `
    -p 80:80 `
    certbot/certbot certonly `
    --standalone `
    --email your-email@example.com `
    --agree-tos `
    --no-eff-email `
    -d stacklens.app `
    -d www.stacklens.app `
    -d api.stacklens.app
```

### Method 2: Using win-acme (Windows Native)

1. **Download win-acme**
   - Go to: https://www.win-acme.com/
   - Download latest release

2. **Run Certificate Request**
   ```powershell
   cd C:\win-acme
   .\wacs.exe --target manual --host stacklens.app,www.stacklens.app,api.stacklens.app --store pemfiles --pemfilespath C:\StackLens-AI\certs
   ```

3. **Configure Auto-Renewal**
   ```powershell
   # win-acme automatically creates a scheduled task for renewal
   ```

---

## Step 5: Update Application Configuration

### Update Environment Variables

Edit your `.env` file:

```bash
# Application URL
APP_URL=https://stacklens.app
API_URL=https://stacklens.app/api
# Or if using API subdomain:
# API_URL=https://api.stacklens.app

# CORS configuration
CORS_ORIGIN=https://stacklens.app,https://www.stacklens.app

# Cookie settings for HTTPS
COOKIE_SECURE=true
COOKIE_DOMAIN=.stacklens.app
```

### Update Vite Configuration

The frontend needs to know about the production URL. Edit `vite.config.ts`:

```typescript
export default defineConfig({
  // ... existing config
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'https://stacklens.app/api' 
        : 'http://localhost:4000/api'
    ),
  },
});
```

---

## Step 6: Complete Deployment Script

Create this PowerShell script for easy deployment:

```powershell
# Save as: deploy-with-domain.ps1

$ErrorActionPreference = "Stop"

Write-Host "═════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   StackLens AI Domain Deployment" -ForegroundColor Cyan
Write-Host "   Domain: stacklens.app" -ForegroundColor Cyan
Write-Host "═════════════════════════════════════════" -ForegroundColor Cyan

# Stop existing services
Write-Host "`n[1/6] Stopping existing services..." -ForegroundColor Yellow
docker stop nginx-proxy 2>$null
docker rm nginx-proxy 2>$null

# Start infrastructure
Write-Host "`n[2/6] Starting infrastructure..." -ForegroundColor Yellow
cd C:\StackLens-AI\infra
docker-compose up -d

# Wait for services
Write-Host "`n[3/6] Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Start application
Write-Host "`n[4/6] Starting StackLens application..." -ForegroundColor Yellow
cd C:\StackLens-AI
.\deploy-production.sh

# Start Nginx with SSL
Write-Host "`n[5/6] Starting Nginx reverse proxy..." -ForegroundColor Yellow
docker run -d `
    --name nginx-proxy `
    --restart unless-stopped `
    --network host `
    -v C:\StackLens-AI\infrastructure\nginx\nginx.conf:/etc/nginx/conf.d/default.conf:ro `
    -v C:\StackLens-AI\certbot\conf:/etc/letsencrypt:ro `
    -v C:\StackLens-AI\certbot\www:/var/www/certbot:ro `
    nginx:alpine

# Verify
Write-Host "`n[6/6] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$response = Invoke-WebRequest -Uri "https://stacklens.app/health" -UseBasicParsing -SkipCertificateCheck
if ($response.StatusCode -eq 200) {
    Write-Host "`n✓ Deployment successful!" -ForegroundColor Green
    Write-Host "  Application: https://stacklens.app" -ForegroundColor Green
    Write-Host "  API: https://stacklens.app/api" -ForegroundColor Green
} else {
    Write-Host "`n✗ Health check failed" -ForegroundColor Red
}
```

---

## Step 7: Verify Setup

### Test DNS Resolution

```powershell
# Test DNS
nslookup stacklens.app
nslookup www.stacklens.app
nslookup api.stacklens.app

# Expected: Should return your EC2 public IP
```

### Test HTTPS

```powershell
# Test main site
curl https://stacklens.app

# Test API
curl https://stacklens.app/api/health

# Test SSL certificate
openssl s_client -connect stacklens.app:443 -servername stacklens.app
```

### Browser Test

1. Open: https://stacklens.app
2. Check for padlock icon (SSL)
3. Verify no mixed content warnings

---

## Step 8: Certificate Auto-Renewal

### Docker Certbot Renewal

Create a scheduled task:

```powershell
# Create renewal script: renew-certs.ps1
$script = @"
docker run --rm `
    -v C:\StackLens-AI\certbot\conf:/etc/letsencrypt `
    -v C:\StackLens-AI\certbot\www:/var/www/certbot `
    certbot/certbot renew --quiet

# Reload nginx to use new certs
docker exec nginx-proxy nginx -s reload
"@

$script | Out-File -FilePath "C:\StackLens-AI\renew-certs.ps1"

# Create scheduled task (runs twice daily)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\StackLens-AI\renew-certs.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At "3:00AM"
$trigger2 = New-ScheduledTaskTrigger -Daily -At "3:00PM"
Register-ScheduledTask -TaskName "StackLens-CertRenewal" -Action $action -Trigger $trigger,$trigger2 -Description "Renew Let's Encrypt certificates"
```

---

## Troubleshooting

### DNS Not Resolving

```powershell
# Check DNS propagation
nslookup stacklens.app 8.8.8.8

# If not propagated, wait 5-30 minutes
# Check propagation status: https://www.whatsmydns.net/#A/stacklens.app
```

### SSL Certificate Issues

```powershell
# Check certificate validity
openssl s_client -connect stacklens.app:443 2>/dev/null | openssl x509 -noout -dates

# Force renewal
docker run --rm -v C:\StackLens-AI\certbot\conf:/etc/letsencrypt certbot/certbot renew --force-renewal
```

### 502 Bad Gateway

```powershell
# Check if backend is running
Invoke-WebRequest -Uri http://localhost:4000/health

# Check nginx logs
docker logs nginx-proxy --tail 50

# Verify network connectivity
Test-NetConnection -ComputerName 127.0.0.1 -Port 4000
```

### Connection Refused

```powershell
# Check Windows Firewall
Get-NetFirewallRule | Where-Object { $_.LocalPort -in @(80, 443) }

# Add firewall rules if missing
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

---

## Architecture Summary

```
Internet
    │
    ▼
┌───────────────────────────────────────────────┐
│              stacklens.app (DNS)               │
│         Points to: EC2_PUBLIC_IP               │
└───────────────────────────────────────────────┘
    │
    ▼ (Port 443 - HTTPS)
┌───────────────────────────────────────────────┐
│                   NGINX                        │
│        (SSL Termination + Reverse Proxy)       │
│                                               │
│   /api/*  → localhost:4000 (API Backend)      │
│   /*      → localhost:5173 (Frontend)         │
│   /ws     → localhost:4000 (WebSocket)        │
└───────────────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌─────────────┐    ┌─────────────┐
│  API Server │    │   Frontend  │
│  Port 4000  │    │  Port 5173  │
└─────────────┘    └─────────────┘
    │
    ▼
┌───────────────────────────────────────────────┐
│            Infrastructure Services             │
│  PostgreSQL | Kafka | Elasticsearch | etc.    │
└───────────────────────────────────────────────┘
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker restart nginx-proxy` | Restart Nginx |
| `docker logs nginx-proxy -f` | View Nginx logs |
| `docker exec nginx-proxy nginx -t` | Test Nginx config |
| `docker exec nginx-proxy nginx -s reload` | Reload Nginx config |
| `nslookup stacklens.app` | Check DNS |
| `curl https://stacklens.app/health` | Test health |

---

## Security Checklist

- [ ] DNS records configured correctly
- [ ] SSL certificates installed
- [ ] HTTP redirects to HTTPS
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Firewall rules in place
- [ ] Certificate auto-renewal scheduled
- [ ] Monitoring configured

---

## Next Steps

1. ✅ Configure DNS (Step 1)
2. ✅ Open ports in Security Group (Step 2)
3. ✅ Install Nginx (Step 3)
4. ✅ Setup SSL certificates (Step 4)
5. ✅ Update application config (Step 5)
6. ✅ Deploy and test (Steps 6-7)
7. ✅ Setup cert renewal (Step 8)

**Your application will be live at: https://stacklens.app** 🚀
