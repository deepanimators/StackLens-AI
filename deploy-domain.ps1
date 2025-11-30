<# 
.SYNOPSIS
    StackLens AI - Domain Deployment Script for Windows EC2
    Configures stacklens.app with SSL/TLS

.DESCRIPTION
    This script:
    1. Checks prerequisites
    2. Sets up Nginx reverse proxy
    3. Obtains SSL certificates from Let's Encrypt
    4. Configures the application for HTTPS

.PARAMETER Email
    Email address for Let's Encrypt certificate notifications

.PARAMETER SkipCert
    Skip SSL certificate generation (use existing certs)

.EXAMPLE
    .\deploy-domain.ps1 -Email admin@stacklens.app
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Email = "admin@stacklens.app",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCert = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Staging = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

# Colors for output
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "→ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }

function Show-Banner {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   StackLens AI - Domain Deployment" -ForegroundColor Cyan
    Write-Host "   Domain: stacklens.app" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Get-EC2PublicIP {
    try {
        $ip = Invoke-RestMethod -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" -TimeoutSec 5
        return $ip
    } catch {
        Write-Warning "Could not get EC2 metadata. Using external service..."
        try {
            $ip = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5)
            return $ip
        } catch {
            return $null
        }
    }
}

function Test-Prerequisites {
    Write-Host "`n[1/7] Checking Prerequisites..." -ForegroundColor Yellow
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Success "Docker: $dockerVersion"
    } catch {
        Write-Error "Docker is not installed or not running"
        exit 1
    }
    
    # Check public IP
    $publicIP = Get-EC2PublicIP
    if ($publicIP) {
        Write-Success "Public IP: $publicIP"
        $script:EC2_PUBLIC_IP = $publicIP
    } else {
        Write-Error "Could not determine public IP"
        exit 1
    }
    
    # Check DNS
    Write-Info "Checking DNS resolution..."
    try {
        $dnsResult = Resolve-DnsName -Name "stacklens.app" -Type A -ErrorAction Stop
        $resolvedIP = $dnsResult.IPAddress
        if ($resolvedIP -eq $publicIP) {
            Write-Success "DNS correctly points to this server ($resolvedIP)"
        } else {
            Write-Warning "DNS points to $resolvedIP but server IP is $publicIP"
            Write-Warning "Please update DNS records before continuing"
        }
    } catch {
        Write-Warning "DNS not configured yet. Please add A record: stacklens.app → $publicIP"
    }
}

function Initialize-Directories {
    Write-Host "`n[2/7] Creating directories..." -ForegroundColor Yellow
    
    $dirs = @(
        "$ProjectRoot\certbot\conf",
        "$ProjectRoot\certbot\www",
        "$ProjectRoot\logs\nginx"
    )
    
    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Info "Created: $dir"
        }
    }
    Write-Success "Directories ready"
}

function Start-NginxInitial {
    Write-Host "`n[3/7] Starting Nginx (HTTP only for cert request)..." -ForegroundColor Yellow
    
    # Stop existing nginx
    docker stop nginx-proxy 2>$null
    docker rm nginx-proxy 2>$null
    
    # Start with initial config (HTTP only)
    docker run -d `
        --name nginx-proxy `
        --restart unless-stopped `
        -p 80:80 `
        -v "$ProjectRoot\infrastructure\nginx\nginx-initial.conf:/etc/nginx/conf.d/default.conf:ro" `
        -v "$ProjectRoot\certbot\www:/var/www/certbot:ro" `
        --add-host=host.docker.internal:host-gateway `
        nginx:alpine
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Nginx started (HTTP mode)"
    } else {
        Write-Error "Failed to start Nginx"
        exit 1
    }
    
    Start-Sleep -Seconds 3
}

function Get-SSLCertificates {
    if ($SkipCert) {
        Write-Host "`n[4/7] Skipping certificate generation..." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n[4/7] Obtaining SSL certificates from Let's Encrypt..." -ForegroundColor Yellow
    
    # Stop nginx temporarily for standalone mode
    docker stop nginx-proxy
    
    $stagingArg = ""
    if ($Staging) {
        $stagingArg = "--staging"
        Write-Warning "Using staging certificates (not valid for production)"
    }
    
    # Request certificates
    docker run -it --rm `
        -v "$ProjectRoot\certbot\conf:/etc/letsencrypt" `
        -v "$ProjectRoot\certbot\www:/var/www/certbot" `
        -p 80:80 `
        certbot/certbot certonly `
        --standalone `
        --email $Email `
        --agree-tos `
        --no-eff-email `
        $stagingArg `
        -d stacklens.app `
        -d www.stacklens.app `
        -d api.stacklens.app
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSL certificates obtained"
    } else {
        Write-Error "Failed to obtain SSL certificates"
        Write-Info "Make sure DNS is properly configured and port 80 is open"
        exit 1
    }
}

function Start-NginxSSL {
    Write-Host "`n[5/7] Starting Nginx with SSL..." -ForegroundColor Yellow
    
    # Stop existing nginx
    docker stop nginx-proxy 2>$null
    docker rm nginx-proxy 2>$null
    
    # Start with full SSL config
    docker run -d `
        --name nginx-proxy `
        --restart unless-stopped `
        -p 80:80 `
        -p 443:443 `
        -v "$ProjectRoot\infrastructure\nginx\nginx.conf:/etc/nginx/conf.d/default.conf:ro" `
        -v "$ProjectRoot\certbot\conf:/etc/letsencrypt:ro" `
        -v "$ProjectRoot\certbot\www:/var/www/certbot:ro" `
        --add-host=host.docker.internal:host-gateway `
        nginx:alpine
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Nginx started with SSL"
    } else {
        Write-Error "Failed to start Nginx with SSL"
        exit 1
    }
    
    Start-Sleep -Seconds 3
}

function Update-ApplicationConfig {
    Write-Host "`n[6/7] Updating application configuration..." -ForegroundColor Yellow
    
    $envFile = "$ProjectRoot\.env"
    
    # Read existing .env if exists
    $envContent = @{}
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^=]+)=(.*)$') {
                $envContent[$matches[1]] = $matches[2]
            }
        }
    }
    
    # Update domain-related settings
    $envContent['APP_URL'] = 'https://stacklens.app'
    $envContent['API_URL'] = 'https://stacklens.app/api'
    $envContent['CORS_ORIGIN'] = 'https://stacklens.app,https://www.stacklens.app'
    $envContent['COOKIE_SECURE'] = 'true'
    $envContent['COOKIE_DOMAIN'] = '.stacklens.app'
    $envContent['NODE_ENV'] = 'production'
    
    # Write updated .env
    $envContent.GetEnumerator() | ForEach-Object {
        "$($_.Key)=$($_.Value)"
    } | Set-Content $envFile
    
    Write-Success "Environment variables updated"
}

function Test-Deployment {
    Write-Host "`n[7/7] Verifying deployment..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 5
    
    # Test HTTP redirect
    Write-Info "Testing HTTP to HTTPS redirect..."
    try {
        $response = Invoke-WebRequest -Uri "http://stacklens.app" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    } catch {
        if ($_.Exception.Response.StatusCode -eq 301 -or $_.Exception.Response.StatusCode -eq 302) {
            Write-Success "HTTP redirects to HTTPS"
        }
    }
    
    # Test HTTPS
    Write-Info "Testing HTTPS..."
    try {
        $response = Invoke-WebRequest -Uri "https://stacklens.app" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "HTTPS is working"
        }
    } catch {
        Write-Warning "HTTPS test failed: $($_.Exception.Message)"
    }
    
    # Test health endpoint
    Write-Info "Testing health endpoint..."
    try {
        $response = Invoke-WebRequest -Uri "https://stacklens.app/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Health endpoint responding"
        }
    } catch {
        Write-Warning "Health check failed - make sure application is running"
    }
}

function Setup-CertRenewal {
    Write-Host "`nSetting up certificate auto-renewal..." -ForegroundColor Yellow
    
    $renewScript = @"
# Renew Let's Encrypt certificates
docker run --rm ``
    -v "$ProjectRoot\certbot\conf:/etc/letsencrypt" ``
    -v "$ProjectRoot\certbot\www:/var/www/certbot" ``
    certbot/certbot renew --quiet

# Reload nginx
docker exec nginx-proxy nginx -s reload
"@
    
    $renewScriptPath = "$ProjectRoot\renew-certs.ps1"
    $renewScript | Set-Content $renewScriptPath
    
    # Create scheduled task
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$renewScriptPath`""
    $trigger1 = New-ScheduledTaskTrigger -Daily -At "3:00AM"
    $trigger2 = New-ScheduledTaskTrigger -Daily -At "3:00PM"
    
    try {
        Unregister-ScheduledTask -TaskName "StackLens-CertRenewal" -Confirm:$false -ErrorAction SilentlyContinue
    } catch {}
    
    Register-ScheduledTask `
        -TaskName "StackLens-CertRenewal" `
        -Action $action `
        -Trigger $trigger1,$trigger2 `
        -Description "Renew Let's Encrypt SSL certificates for stacklens.app" `
        -RunLevel Highest | Out-Null
    
    Write-Success "Certificate auto-renewal scheduled (runs twice daily)"
}

function Show-Summary {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "   Deployment Complete!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Your application is now available at:" -ForegroundColor White
    Write-Host ""
    Write-Host "   🌐 Website:  https://stacklens.app" -ForegroundColor Cyan
    Write-Host "   🔌 API:      https://stacklens.app/api" -ForegroundColor Cyan
    Write-Host "   ❤️  Health:   https://stacklens.app/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   SSL Certificate expires in 90 days (auto-renewal enabled)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
}

# Main execution
Show-Banner
Test-Prerequisites
Initialize-Directories
Start-NginxInitial
Get-SSLCertificates
Start-NginxSSL
Update-ApplicationConfig
Test-Deployment
Setup-CertRenewal
Show-Summary
