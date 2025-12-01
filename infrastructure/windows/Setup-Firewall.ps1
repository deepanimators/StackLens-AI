<#
.SYNOPSIS
    StackLens AI - Windows Firewall Setup
    Opens ports 5173, 4000, 5174, 3000 for Cloudflare access

.DESCRIPTION
    This script configures Windows Firewall to allow Cloudflare to connect
    directly to your Node.js application ports.
    
    NO IIS required - Cloudflare connects directly to app ports.
    Ports 80/443 are NOT used (available for other apps).

.EXAMPLE
    .\Setup-Firewall.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   StackLens AI - Windows Firewall Setup" -ForegroundColor Cyan
Write-Host "   (Cloudflare Origin Rules → Direct to App Ports)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Port Configuration:" -ForegroundColor White
Write-Host "   • 5173 → Main Frontend (stacklens.app)" -ForegroundColor Gray
Write-Host "   • 4000 → Main API (api.stacklens.app)" -ForegroundColor Gray
Write-Host "   • 5174 → POS Frontend (pos.stacklens.app)" -ForegroundColor Gray
Write-Host "   • 3000 → POS API (posapi.stacklens.app)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Ports 80/443: NOT USED (available for other apps)" -ForegroundColor Yellow
Write-Host ""

# Application port configuration
$ports = @(
    @{ Port = 5173; Name = "StackLens Main Frontend"; Domain = "stacklens.app" }
    @{ Port = 4000; Name = "StackLens Main API"; Domain = "api.stacklens.app" }
    @{ Port = 5174; Name = "StackLens POS Frontend"; Domain = "pos.stacklens.app" }
    @{ Port = 3000; Name = "StackLens POS API"; Domain = "posapi.stacklens.app" }
)

Write-Host "[1/2] Configuring Windows Firewall rules..." -ForegroundColor Yellow
Write-Host ""

foreach ($config in $ports) {
    $ruleName = $config.Name
    $port = $config.Port
    
    # Remove existing rule if exists
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName $ruleName
        Write-Host "  Removed existing rule: $ruleName" -ForegroundColor Gray
    }
    
    # Create new rule
    New-NetFirewallRule -DisplayName $ruleName `
        -Direction Inbound `
        -LocalPort $port `
        -Protocol TCP `
        -Action Allow `
        -Profile Any | Out-Null
    
    Write-Host "  ✓ Allowed port $port ($ruleName)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/2] Verifying firewall rules..." -ForegroundColor Yellow
Write-Host ""

Get-NetFirewallRule -DisplayName "StackLens*" | ForEach-Object {
    $portFilter = $_ | Get-NetFirewallPortFilter
    Write-Host "  ✓ $($_.DisplayName): Port $($portFilter.LocalPort)" -ForegroundColor Cyan
}

# Get public IP
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   Firewall Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

try {
    $publicIP = (Invoke-RestMethod -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" -TimeoutSec 3)
} catch {
    try {
        $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5)
    } catch {
        $publicIP = "YOUR_EC2_PUBLIC_IP"
    }
}

Write-Host "   Your EC2 Public IP: $publicIP" -ForegroundColor White
Write-Host ""
Write-Host "   Next Steps:" -ForegroundColor Cyan
Write-Host "   ─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   1. In AWS EC2 Security Group, allow inbound:" -ForegroundColor White
Write-Host "      • Port 5173 (TCP) from 0.0.0.0/0" -ForegroundColor Gray
Write-Host "      • Port 4000 (TCP) from 0.0.0.0/0" -ForegroundColor Gray
Write-Host "      • Port 5174 (TCP) from 0.0.0.0/0" -ForegroundColor Gray
Write-Host "      • Port 3000 (TCP) from 0.0.0.0/0" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. In Cloudflare Dashboard → Rules → Origin Rules:" -ForegroundColor White
Write-Host "      Create rules to route each subdomain to its port:" -ForegroundColor Gray
Write-Host ""
Write-Host "      stacklens.app      → Port 5173" -ForegroundColor Cyan
Write-Host "      api.stacklens.app  → Port 4000" -ForegroundColor Cyan
Write-Host "      pos.stacklens.app  → Port 5174" -ForegroundColor Cyan
Write-Host "      posapi.stacklens.app → Port 3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Start applications:" -ForegroundColor White
Write-Host "      .\Start-StackLens.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
