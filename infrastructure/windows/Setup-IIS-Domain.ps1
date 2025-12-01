<#
.SYNOPSIS
    StackLens AI - IIS Setup (OPTIONAL - Only needed if you want IIS as reverse proxy)
    
    ⚠️  FOR MOST USERS: Use Setup-Firewall.ps1 instead!
        Cloudflare can connect directly to your app ports via Origin Rules.

.DESCRIPTION
    This script sets up IIS as a reverse proxy. Only use this if:
    - You need IIS for other reasons
    - You can't use Cloudflare Origin Rules
    - You want IIS as an extra layer
    
    Otherwise, use Setup-Firewall.ps1 + Cloudflare Origin Rules (simpler).

.PARAMETER ProjectPath
    Path to the StackLens project on the server

.EXAMPLE
    .\Setup-IIS-Domain.ps1
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = "C:\StackLens-AI"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "   ⚠️  NOTICE: IIS Setup is OPTIONAL" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""
Write-Host "   For simpler setup, use Cloudflare Origin Rules instead:" -ForegroundColor White
Write-Host "   1. Run: .\Setup-Firewall.ps1" -ForegroundColor Gray
Write-Host "   2. Configure Cloudflare Origin Rules to route to ports" -ForegroundColor Gray
Write-Host ""
Write-Host "   This IIS setup uses ports 80/443. If those ports are in use" -ForegroundColor White
Write-Host "   by other apps, DO NOT run this script." -ForegroundColor White
Write-Host ""
$continue = Read-Host "   Continue with IIS setup? (y/N)"
if ($continue -ne "y" -and $continue -ne "Y") {
    Write-Host ""
    Write-Host "   Exiting. Use Setup-Firewall.ps1 instead." -ForegroundColor Cyan
    exit 0
}

$ErrorActionPreference = "Stop"

# ============================================
# Configuration
# ============================================
$Domain = "stacklens.app"
$Subdomains = @{
    "main"    = @{ Host = "stacklens.app";       Port = 5173; Type = "frontend" }
    "www"     = @{ Host = "www.stacklens.app";   Port = 5173; Type = "frontend" }
    "api"     = @{ Host = "api.stacklens.app";   Port = 4000; Type = "api" }
    "pos"     = @{ Host = "pos.stacklens.app";   Port = 5174; Type = "frontend" }
    "posapi"  = @{ Host = "posapi.stacklens.app"; Port = 3000; Type = "api" }
}

# ============================================
# Helper Functions
# ============================================
function Write-Step { param($Message) Write-Host "`n[$script:stepNum] $Message" -ForegroundColor Cyan; $script:stepNum++ }
function Write-Success { param($Message) Write-Host "  ✓ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "  → $Message" -ForegroundColor White }
function Write-Warn { param($Message) Write-Host "  ⚠ $Message" -ForegroundColor Yellow }

$script:stepNum = 1

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   StackLens AI - Windows IIS Domain Setup" -ForegroundColor Cyan
Write-Host "   Domain: $Domain (with Cloudflare SSL)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Subdomains:" -ForegroundColor White
Write-Host "   • stacklens.app      → Main Frontend (127.0.0.1:5173)" -ForegroundColor Gray
Write-Host "   • api.stacklens.app  → Main API      (127.0.0.1:4000)" -ForegroundColor Gray
Write-Host "   • pos.stacklens.app  → POS Frontend  (127.0.0.1:5174)" -ForegroundColor Gray
Write-Host "   • posapi.stacklens.app → POS API     (127.0.0.1:3000)" -ForegroundColor Gray
Write-Host ""
Write-Host "   SSL/TLS: Handled by Cloudflare (Flexible mode)" -ForegroundColor Yellow
Write-Host ""

# ============================================
# Step 1: Enable IIS Features
# ============================================
Write-Step "Enabling IIS and required Windows features..."

$features = @(
    "IIS-WebServerRole",
    "IIS-WebServer",
    "IIS-CommonHttpFeatures",
    "IIS-HttpErrors",
    "IIS-StaticContent",
    "IIS-DefaultDocument",
    "IIS-DirectoryBrowsing",
    "IIS-HealthAndDiagnostics",
    "IIS-HttpLogging",
    "IIS-LoggingLibraries",
    "IIS-RequestMonitor",
    "IIS-Security",
    "IIS-RequestFiltering",
    "IIS-Performance",
    "IIS-HttpCompressionStatic",
    "IIS-HttpCompressionDynamic",
    "IIS-WebServerManagementTools",
    "IIS-ManagementConsole",
    "IIS-ApplicationDevelopment",
    "IIS-WebSockets",
    "IIS-ApplicationInit",
    "NetFx4Extended-ASPNET45",
    "IIS-NetFxExtensibility45",
    "IIS-ASPNET45"
)

foreach ($feature in $features) {
    $state = (Get-WindowsOptionalFeature -Online -FeatureName $feature -ErrorAction SilentlyContinue).State
    if ($state -ne "Enabled") {
        Write-Info "Enabling $feature..."
        Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart | Out-Null
    }
}
Write-Success "IIS features enabled"

# ============================================
# Step 2: Install URL Rewrite Module
# ============================================
Write-Step "Installing IIS URL Rewrite Module..."

$urlRewritePath = "$env:TEMP\urlrewrite.msi"
$urlRewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"

if (-not (Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue)) {
    Write-Info "Downloading URL Rewrite Module..."
    Invoke-WebRequest -Uri $urlRewriteUrl -OutFile $urlRewritePath -UseBasicParsing
    
    Write-Info "Installing URL Rewrite Module..."
    Start-Process msiexec.exe -ArgumentList "/i `"$urlRewritePath`" /qn" -Wait
    Write-Success "URL Rewrite Module installed"
} else {
    Write-Success "URL Rewrite Module already installed"
}

# ============================================
# Step 3: Install Application Request Routing (ARR)
# ============================================
Write-Step "Installing Application Request Routing (ARR)..."

$arrPath = "$env:TEMP\arr.msi"
$arrUrl = "https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi"

$arrInstalled = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue | 
    Where-Object { $_.DisplayName -like "*Application Request Routing*" }

if (-not $arrInstalled) {
    Write-Info "Downloading ARR..."
    Invoke-WebRequest -Uri $arrUrl -OutFile $arrPath -UseBasicParsing
    
    Write-Info "Installing ARR..."
    Start-Process msiexec.exe -ArgumentList "/i `"$arrPath`" /qn" -Wait
    Write-Success "ARR installed"
} else {
    Write-Success "ARR already installed"
}

# ============================================
# Step 4: Enable ARR Proxy
# ============================================
Write-Step "Configuring ARR as reverse proxy..."

Import-Module WebAdministration -ErrorAction SilentlyContinue

# Enable proxy
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "enabled" -Value "True" -ErrorAction SilentlyContinue
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "preserveHostHeader" -Value "True" -ErrorAction SilentlyContinue
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter "system.webServer/proxy" -Name "reverseRewriteHostInResponseHeaders" -Value "False" -ErrorAction SilentlyContinue

Write-Success "ARR proxy enabled"

# ============================================
# Step 5: Create Website Directories
# ============================================
Write-Step "Creating website directories..."

$webRoot = "C:\inetpub\stacklens"
$sites = @("main", "api", "pos", "posapi")

foreach ($site in $sites) {
    $sitePath = "$webRoot\$site"
    if (-not (Test-Path $sitePath)) {
        New-Item -ItemType Directory -Path $sitePath -Force | Out-Null
        Write-Info "Created: $sitePath"
    }
}
Write-Success "Directories created"

# ============================================
# Step 6: Create IIS Sites with Reverse Proxy
# ============================================
Write-Step "Creating IIS websites..."

Import-Module WebAdministration

# Remove default website if exists
if (Get-Website -Name "Default Web Site" -ErrorAction SilentlyContinue) {
    Remove-Website -Name "Default Web Site" -ErrorAction SilentlyContinue
    Write-Info "Removed Default Web Site"
}

# Create Application Pool
$appPoolName = "StackLensAppPool"
if (-not (Test-Path "IIS:\AppPools\$appPoolName")) {
    New-WebAppPool -Name $appPoolName | Out-Null
    Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name "managedRuntimeVersion" -Value ""
    Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name "startMode" -Value "AlwaysRunning"
    Write-Info "Created application pool: $appPoolName"
}

# Create websites for each subdomain
$siteConfigs = @(
    @{ Name = "StackLens-Main";   Hosts = @("stacklens.app", "www.stacklens.app"); Port = 5173; Path = "$webRoot\main" }
    @{ Name = "StackLens-API";    Hosts = @("api.stacklens.app");                  Port = 4000; Path = "$webRoot\api" }
    @{ Name = "StackLens-POS";    Hosts = @("pos.stacklens.app");                  Port = 5174; Path = "$webRoot\pos" }
    @{ Name = "StackLens-POSAPI"; Hosts = @("posapi.stacklens.app");               Port = 3000; Path = "$webRoot\posapi" }
)

foreach ($config in $siteConfigs) {
    # Remove existing site
    if (Get-Website -Name $config.Name -ErrorAction SilentlyContinue) {
        Remove-Website -Name $config.Name
    }
    
    # Create site
    $site = New-Website -Name $config.Name `
        -PhysicalPath $config.Path `
        -ApplicationPool $appPoolName `
        -HostHeader $config.Hosts[0] `
        -Port 80 `
        -Force
    
    # Add additional host bindings
    foreach ($host in $config.Hosts | Select-Object -Skip 1) {
        New-WebBinding -Name $config.Name -Protocol "http" -Port 80 -HostHeader $host
    }
    
    # Create web.config with reverse proxy rules
    $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <rule name="ReverseProxyToLocalhost" stopProcessing="true">
                    <match url="(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:$($config.Port)/{R:1}" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
                        <set name="HTTP_X_FORWARDED_PROTO" value="https" />
                        <set name="HTTP_X_REAL_IP" value="{REMOTE_ADDR}" />
                    </serverVariables>
                </rule>
            </rules>
            <outboundRules>
                <rule name="RestoreAcceptEncoding" preCondition="NeedsRestoringAcceptEncoding">
                    <match serverVariable="HTTP_ACCEPT_ENCODING" pattern="^(.*)" />
                    <action type="Rewrite" value="{HTTP_X_ORIGINAL_ACCEPT_ENCODING}" />
                </rule>
                <preConditions>
                    <preCondition name="NeedsRestoringAcceptEncoding">
                        <add input="{HTTP_X_ORIGINAL_ACCEPT_ENCODING}" pattern=".+" />
                    </preCondition>
                </preConditions>
            </outboundRules>
        </rewrite>
        <proxy enabled="true" preserveHostHeader="true" reverseRewriteHostInResponseHeaders="false" />
        
        <!-- Security Headers -->
        <httpProtocol>
            <customHeaders>
                <remove name="X-Powered-By" />
                <add name="X-Frame-Options" value="SAMEORIGIN" />
                <add name="X-Content-Type-Options" value="nosniff" />
                <add name="X-XSS-Protection" value="1; mode=block" />
                <add name="Referrer-Policy" value="strict-origin-when-cross-origin" />
            </customHeaders>
        </httpProtocol>
        
        <!-- WebSocket Support -->
        <webSocket enabled="true" />
        
        <!-- Compression -->
        <urlCompression doStaticCompression="true" doDynamicCompression="true" />
    </system.webServer>
</configuration>
"@
    
    $webConfig | Out-File -FilePath "$($config.Path)\web.config" -Encoding UTF8
    Write-Info "Created site: $($config.Name) → 127.0.0.1:$($config.Port)"
}

Write-Success "IIS websites created"

# ============================================
# Step 7: Configure Server Variables for ARR
# ============================================
Write-Step "Configuring server variables..."

$serverVars = @(
    "HTTP_X_FORWARDED_HOST",
    "HTTP_X_FORWARDED_PROTO", 
    "HTTP_X_REAL_IP",
    "HTTP_X_ORIGINAL_ACCEPT_ENCODING"
)

foreach ($var in $serverVars) {
    Add-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' `
        -Filter "system.webServer/rewrite/allowedServerVariables" `
        -Name "." `
        -Value @{name=$var} `
        -ErrorAction SilentlyContinue
}

Write-Success "Server variables configured"

# ============================================
# Step 8: Configure Windows Firewall
# ============================================
Write-Step "Configuring Windows Firewall (only port 80 for Cloudflare)..."

# Remove any existing rules for our app ports
$appPorts = @(3000, 4000, 5173, 5174)
foreach ($port in $appPorts) {
    Get-NetFirewallRule -DisplayName "*StackLens*$port*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    Get-NetFirewallRule | Where-Object { 
        $_ | Get-NetFirewallPortFilter | Where-Object { $_.LocalPort -eq $port }
    } | Where-Object { $_.DisplayName -notlike "*IIS*" } | Remove-NetFirewallRule -ErrorAction SilentlyContinue
}

# Ensure HTTP is allowed (Cloudflare connects via HTTP in Flexible mode)
$httpRule = Get-NetFirewallRule -DisplayName "StackLens HTTP" -ErrorAction SilentlyContinue
if (-not $httpRule) {
    New-NetFirewallRule -DisplayName "StackLens HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow | Out-Null
}

# HTTPS is optional (only needed for Cloudflare Full SSL mode)
$httpsRule = Get-NetFirewallRule -DisplayName "StackLens HTTPS" -ErrorAction SilentlyContinue
if (-not $httpsRule) {
    New-NetFirewallRule -DisplayName "StackLens HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow | Out-Null
}

# Block direct access to application ports from external
foreach ($port in $appPorts) {
    $ruleName = "Block External Access to Port $port"
    $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        # This blocks external access but allows localhost
        New-NetFirewallRule -DisplayName $ruleName `
            -Direction Inbound `
            -LocalPort $port `
            -Protocol TCP `
            -RemoteAddress "!127.0.0.1" `
            -Action Block `
            -ErrorAction SilentlyContinue | Out-Null
    }
}

Write-Success "Firewall configured - only ports 80/443 are exposed (Cloudflare handles HTTPS)"

# ============================================
# Step 9: Create Startup Scripts for Node.js Apps
# ============================================
Write-Step "Creating application startup scripts..."

$startupScript = @"
<#
.SYNOPSIS
    Start all StackLens applications
#>

`$ErrorActionPreference = "Stop"
`$ProjectPath = "$ProjectPath"

Write-Host "Starting StackLens Applications..." -ForegroundColor Cyan

# Function to start app in background
function Start-NodeApp {
    param(
        [string]`$Name,
        [string]`$Path,
        [string]`$Command,
        [int]`$Port,
        [string]`$Host = "127.0.0.1"
    )
    
    Write-Host "  Starting `$Name on `$Host:`$Port..." -ForegroundColor White
    
    `$env:HOST = `$Host
    `$env:PORT = `$Port
    
    `$job = Start-Job -ScriptBlock {
        param(`$p, `$c)
        Set-Location `$p
        Invoke-Expression `$c
    } -ArgumentList `$Path, `$Command
    
    # Save job info
    `$job | Export-Clixml "`$ProjectPath\jobs\`$Name.xml"
    
    Write-Host "    ✓ Started (Job ID: `$(`$job.Id))" -ForegroundColor Green
}

# Create jobs directory
if (-not (Test-Path "`$ProjectPath\jobs")) {
    New-Item -ItemType Directory -Path "`$ProjectPath\jobs" -Force | Out-Null
}

# Start Main Frontend (port 5173)
Start-NodeApp -Name "main-frontend" `
    -Path "`$ProjectPath" `
    -Command "npm run dev:client" `
    -Port 5173

# Start Main API (port 4000)
Start-NodeApp -Name "main-api" `
    -Path "`$ProjectPath" `
    -Command "npm run dev:server" `
    -Port 4000

# Start POS Frontend (port 5174)
Start-NodeApp -Name "pos-frontend" `
    -Path "`$ProjectPath\pos-demo\frontend" `
    -Command "npm run dev" `
    -Port 5174

# Start POS API (port 3000)
Start-NodeApp -Name "pos-api" `
    -Path "`$ProjectPath\pos-demo\backend" `
    -Command "npm run dev" `
    -Port 3000

Write-Host ""
Write-Host "All applications started!" -ForegroundColor Green
Write-Host ""
Write-Host "Access via:" -ForegroundColor Cyan
Write-Host "  • https://stacklens.app" -ForegroundColor White
Write-Host "  • https://api.stacklens.app" -ForegroundColor White
Write-Host "  • https://pos.stacklens.app" -ForegroundColor White
Write-Host "  • https://posapi.stacklens.app" -ForegroundColor White
"@

$startupScript | Out-File -FilePath "$ProjectPath\Start-StackLens.ps1" -Encoding UTF8

# Stop script
$stopScript = @"
<#
.SYNOPSIS
    Stop all StackLens applications
#>

`$ProjectPath = "$ProjectPath"

Write-Host "Stopping StackLens Applications..." -ForegroundColor Cyan

Get-ChildItem "`$ProjectPath\jobs\*.xml" -ErrorAction SilentlyContinue | ForEach-Object {
    `$job = Import-Clixml `$_.FullName
    if (`$job) {
        Stop-Job -Id `$job.Id -ErrorAction SilentlyContinue
        Remove-Job -Id `$job.Id -ErrorAction SilentlyContinue
        Write-Host "  Stopped: `$(`$_.BaseName)" -ForegroundColor Yellow
    }
    Remove-Item `$_.FullName -Force
}

# Also kill any node processes on our ports
@(3000, 4000, 5173, 5174) | ForEach-Object {
    `$connections = Get-NetTCPConnection -LocalPort `$_ -ErrorAction SilentlyContinue
    `$connections | ForEach-Object {
        Stop-Process -Id `$_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "All applications stopped!" -ForegroundColor Green
"@

$stopScript | Out-File -FilePath "$ProjectPath\Stop-StackLens.ps1" -Encoding UTF8

Write-Success "Startup scripts created"

# ============================================
# Step 10: Create Windows Service (Optional)
# ============================================
Write-Step "Creating Windows Service setup script..."

$serviceScript = @"
<#
.SYNOPSIS
    Install StackLens as Windows Services using NSSM
    This allows apps to start automatically on boot
#>

`$nssmPath = "C:\nssm"
`$nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
`$ProjectPath = "$ProjectPath"

# Download NSSM if not present
if (-not (Test-Path "`$nssmPath\win64\nssm.exe")) {
    Write-Host "Downloading NSSM..." -ForegroundColor Cyan
    `$zip = "`$env:TEMP\nssm.zip"
    Invoke-WebRequest -Uri `$nssmUrl -OutFile `$zip -UseBasicParsing
    Expand-Archive -Path `$zip -DestinationPath `$nssmPath -Force
    Move-Item "`$nssmPath\nssm-2.24\*" `$nssmPath -Force
    Remove-Item "`$nssmPath\nssm-2.24" -Recurse -Force
    Remove-Item `$zip -Force
}

`$nssm = "`$nssmPath\win64\nssm.exe"

# Service configurations
`$services = @(
    @{
        Name = "StackLens-MainAPI"
        Path = "node.exe"
        Args = "--import tsx apps/api/src/index.ts"
        Dir = `$ProjectPath
        Port = 4000
    },
    @{
        Name = "StackLens-POSBackend"
        Path = "node.exe"
        Args = "--import ts-node/register src/index.ts"
        Dir = "`$ProjectPath\pos-demo\backend"
        Port = 3000
    }
)

foreach (`$svc in `$services) {
    Write-Host "Installing service: `$(`$svc.Name)" -ForegroundColor Cyan
    
    # Remove if exists
    & `$nssm stop `$svc.Name 2>`$null
    & `$nssm remove `$svc.Name confirm 2>`$null
    
    # Install
    & `$nssm install `$svc.Name `$svc.Path `$svc.Args
    & `$nssm set `$svc.Name AppDirectory `$svc.Dir
    & `$nssm set `$svc.Name AppEnvironmentExtra "PORT=`$(`$svc.Port)" "HOST=127.0.0.1" "NODE_ENV=production"
    & `$nssm set `$svc.Name Start SERVICE_AUTO_START
    & `$nssm set `$svc.Name AppStdout "`$ProjectPath\logs\`$(`$svc.Name).log"
    & `$nssm set `$svc.Name AppStderr "`$ProjectPath\logs\`$(`$svc.Name).error.log"
    
    # Start
    & `$nssm start `$svc.Name
    
    Write-Host "  ✓ Service installed and started" -ForegroundColor Green
}

Write-Host ""
Write-Host "Services installed! They will start automatically on boot." -ForegroundColor Green
"@

$serviceScript | Out-File -FilePath "$ProjectPath\Install-Services.ps1" -Encoding UTF8
Write-Success "Service installation script created"

# ============================================
# Step 11: Restart IIS
# ============================================
Write-Step "Restarting IIS..."

iisreset /restart | Out-Null
Write-Success "IIS restarted"

# ============================================
# Summary
# ============================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "   IIS is configured as reverse proxy for:" -ForegroundColor White
Write-Host ""
Write-Host "   Domain                    → Internal Service" -ForegroundColor Cyan
Write-Host "   ─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   stacklens.app            → 127.0.0.1:5173 (Main Frontend)" -ForegroundColor White
Write-Host "   www.stacklens.app        → 127.0.0.1:5173 (Main Frontend)" -ForegroundColor White
Write-Host "   api.stacklens.app        → 127.0.0.1:4000 (Main API)" -ForegroundColor White
Write-Host "   pos.stacklens.app        → 127.0.0.1:5174 (POS Frontend)" -ForegroundColor White
Write-Host "   posapi.stacklens.app     → 127.0.0.1:3000 (POS API)" -ForegroundColor White
Write-Host ""
Write-Host "   SSL/TLS: Cloudflare handles HTTPS (use 'Flexible' mode)" -ForegroundColor Yellow
Write-Host "   Exposed Ports: 80 only (Cloudflare connects via HTTP)" -ForegroundColor Yellow
Write-Host "   Internal ports 3000, 4000, 5173, 5174 are blocked externally" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Next Steps:" -ForegroundColor Cyan
Write-Host "   ─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   1. Configure DNS in Cloudflare (add A records)" -ForegroundColor White
Write-Host "   2. Enable 'Flexible' SSL mode in Cloudflare" -ForegroundColor White
Write-Host "   3. Run: .\Start-StackLens.ps1" -ForegroundColor White
Write-Host ""
Write-Host "   Cloudflare DNS Configuration:" -ForegroundColor Yellow
Write-Host "   ─────────────────────────────────────────────" -ForegroundColor Gray

# Get public IP
try {
    $publicIP = (Invoke-RestMethod -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" -TimeoutSec 3)
} catch {
    $publicIP = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5)
}

Write-Host "   Add these A records in Cloudflare Dashboard:" -ForegroundColor White
Write-Host ""
Write-Host "   Type  Name              Value              Proxy" -ForegroundColor Cyan
Write-Host "   ────  ────              ─────              ─────" -ForegroundColor Gray
Write-Host "   A     @                 $publicIP     Proxied" -ForegroundColor White
Write-Host "   A     www               $publicIP     Proxied" -ForegroundColor White
Write-Host "   A     api               $publicIP     Proxied" -ForegroundColor White
Write-Host "   A     pos               $publicIP     Proxied" -ForegroundColor White
Write-Host "   A     posapi            $publicIP     Proxied" -ForegroundColor White
Write-Host ""
Write-Host "   Cloudflare SSL Settings:" -ForegroundColor Yellow
Write-Host "   ─────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "   • SSL/TLS → Overview → Select 'Flexible'" -ForegroundColor White
Write-Host "   • SSL/TLS → Edge Certificates → Always Use HTTPS: ON" -ForegroundColor White
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
