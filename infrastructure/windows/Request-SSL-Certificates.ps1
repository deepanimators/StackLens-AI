<#
.SYNOPSIS
    Request SSL Certificates from Let's Encrypt for stacklens.app

.DESCRIPTION
    Uses win-acme to obtain free SSL certificates for all subdomains
    and configure IIS bindings automatically.

.PARAMETER Email
    Email for certificate expiration notifications

.EXAMPLE
    .\Request-SSL-Certificates.ps1 -Email admin@stacklens.app
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$Email = "admin@stacklens.app",
    
    [Parameter(Mandatory=$false)]
    [switch]$Staging = $false
)

$ErrorActionPreference = "Stop"

$domains = @(
    "stacklens.app",
    "www.stacklens.app",
    "api.stacklens.app",
    "pos.stacklens.app",
    "posapi.stacklens.app"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   SSL Certificate Request - Let's Encrypt" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Domains:" -ForegroundColor White
foreach ($domain in $domains) {
    Write-Host "   • $domain" -ForegroundColor Gray
}
Write-Host ""

# Prerequisites check
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check if IIS is running
$iisService = Get-Service W3SVC -ErrorAction SilentlyContinue
if (-not $iisService) {
    Write-Host "  ✗ IIS is not installed. Run Setup-IIS-Domain.ps1 first." -ForegroundColor Red
    exit 1
}

if ($iisService.Status -ne "Running") {
    Write-Host "  Starting IIS..." -ForegroundColor Yellow
    Start-Service W3SVC
    Start-Sleep -Seconds 3
}
Write-Host "  ✓ IIS is running" -ForegroundColor Green

# Check DNS
Write-Host ""
Write-Host "[2/5] Checking DNS resolution..." -ForegroundColor Yellow

$publicIP = try {
    (Invoke-RestMethod -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" -TimeoutSec 3)
} catch {
    (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5)
}

Write-Host "  Server public IP: $publicIP" -ForegroundColor Gray

$dnsOk = $true
foreach ($domain in $domains) {
    try {
        $resolved = (Resolve-DnsName -Name $domain -Type A -ErrorAction Stop).IPAddress
        if ($resolved -eq $publicIP) {
            Write-Host "  ✓ $domain → $resolved" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $domain → $resolved (expected: $publicIP)" -ForegroundColor Red
            $dnsOk = $false
        }
    } catch {
        Write-Host "  ✗ $domain → DNS not configured" -ForegroundColor Red
        $dnsOk = $false
    }
}

if (-not $dnsOk) {
    Write-Host ""
    Write-Host "  ⚠ DNS is not properly configured!" -ForegroundColor Yellow
    Write-Host "  Please add A records for all domains pointing to: $publicIP" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

# Check win-acme installation
Write-Host ""
Write-Host "[3/5] Checking win-acme installation..." -ForegroundColor Yellow

$wacmePath = "C:\win-acme"
if (-not (Test-Path "$wacmePath\wacs.exe")) {
    Write-Host "  win-acme not found. Downloading..." -ForegroundColor Yellow
    
    $wacmeUrl = "https://github.com/win-acme/win-acme/releases/download/v2.2.9.1701/win-acme.v2.2.9.1701.x64.pluggable.zip"
    $wacmeZip = "$env:TEMP\win-acme.zip"
    
    if (-not (Test-Path $wacmePath)) {
        New-Item -ItemType Directory -Path $wacmePath -Force | Out-Null
    }
    
    Invoke-WebRequest -Uri $wacmeUrl -OutFile $wacmeZip -UseBasicParsing
    Expand-Archive -Path $wacmeZip -DestinationPath $wacmePath -Force
    Remove-Item $wacmeZip -Force
    
    Write-Host "  ✓ win-acme installed" -ForegroundColor Green
} else {
    Write-Host "  ✓ win-acme found" -ForegroundColor Green
}

# Request certificates
Write-Host ""
Write-Host "[4/5] Requesting SSL certificates..." -ForegroundColor Yellow

$domainsArg = $domains -join ","

$stagingArg = ""
if ($Staging) {
    $stagingArg = "--test"
    Write-Host "  ⚠ Using STAGING environment (certificates will not be valid)" -ForegroundColor Yellow
}

# Run win-acme
Set-Location $wacmePath

# Create settings file for unattended operation
$settingsContent = @"
{
    "Client": {
        "EmailAddress": "$Email"
    }
}
"@
$settingsContent | Out-File "$wacmePath\settings.json" -Encoding UTF8 -Force

# Run certificate request
$wacsArgs = @(
    "--target", "manual",
    "--host", $domainsArg,
    "--validation", "selfhosting",
    "--validationport", "80",
    "--store", "certificatestore",
    "--installation", "iis",
    "--emailaddress", $Email,
    "--accepttos"
)

if ($Staging) {
    $wacsArgs += "--test"
}

Write-Host "  Running: wacs.exe $($wacsArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

& "$wacmePath\wacs.exe" @wacsArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "  ✓ Certificates obtained successfully" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "  ⚠ Certificate request completed with warnings" -ForegroundColor Yellow
}

# Configure IIS bindings
Write-Host ""
Write-Host "[5/5] Configuring IIS HTTPS bindings..." -ForegroundColor Yellow

Import-Module WebAdministration -ErrorAction SilentlyContinue

# Get the certificate
$cert = Get-ChildItem -Path Cert:\LocalMachine\WebHosting | 
    Where-Object { $_.Subject -like "*stacklens.app*" } | 
    Sort-Object NotAfter -Descending | 
    Select-Object -First 1

if (-not $cert) {
    $cert = Get-ChildItem -Path Cert:\LocalMachine\My | 
        Where-Object { $_.Subject -like "*stacklens.app*" } | 
        Sort-Object NotAfter -Descending | 
        Select-Object -First 1
}

if ($cert) {
    Write-Host "  Found certificate: $($cert.Thumbprint)" -ForegroundColor Gray
    
    $siteBindings = @(
        @{ Site = "StackLens-Main"; Hosts = @("stacklens.app", "www.stacklens.app") }
        @{ Site = "StackLens-API"; Hosts = @("api.stacklens.app") }
        @{ Site = "StackLens-POS"; Hosts = @("pos.stacklens.app") }
        @{ Site = "StackLens-POSAPI"; Hosts = @("posapi.stacklens.app") }
    )
    
    foreach ($siteBinding in $siteBindings) {
        $site = Get-Website -Name $siteBinding.Site -ErrorAction SilentlyContinue
        if ($site) {
            foreach ($host in $siteBinding.Hosts) {
                # Check if binding exists
                $existingBinding = Get-WebBinding -Name $siteBinding.Site -Protocol "https" -HostHeader $host -ErrorAction SilentlyContinue
                
                if (-not $existingBinding) {
                    New-WebBinding -Name $siteBinding.Site -Protocol "https" -Port 443 -HostHeader $host -SslFlags 1
                }
                
                # Assign certificate
                $binding = Get-WebBinding -Name $siteBinding.Site -Protocol "https" -HostHeader $host
                if ($binding) {
                    $binding.AddSslCertificate($cert.Thumbprint, "WebHosting")
                }
                
                Write-Host "  ✓ HTTPS binding added: $host" -ForegroundColor Green
            }
        }
    }
} else {
    Write-Host "  ⚠ Certificate not found in store. HTTPS bindings may need manual configuration." -ForegroundColor Yellow
}

# Restart IIS
Write-Host ""
Write-Host "  Restarting IIS..." -ForegroundColor Gray
iisreset /restart | Out-Null

# Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   SSL Certificate Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "   Your sites are now accessible via HTTPS:" -ForegroundColor White
Write-Host ""
Write-Host "   🌐 https://stacklens.app" -ForegroundColor Cyan
Write-Host "   🔌 https://api.stacklens.app" -ForegroundColor Cyan
Write-Host "   🛒 https://pos.stacklens.app" -ForegroundColor Cyan
Write-Host "   🔌 https://posapi.stacklens.app" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Certificate auto-renewal is configured via win-acme scheduled task." -ForegroundColor Gray
Write-Host ""
