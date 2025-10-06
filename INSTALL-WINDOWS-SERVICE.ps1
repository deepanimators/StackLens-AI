# Install StackLens-AI as Windows Service
# Run as Administrator

param(
    [int]$Port = 4000,
    [string]$ServiceName = "StackLensAI",
    [string]$DisplayName = "StackLens AI Error Analysis Service",
    [string]$Description = "StackLens AI - Intelligent Error Log Analysis and Management System"
)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  STACKLENS-AI SERVICE INSTALLER" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Get current directory
$scriptPath = $PSScriptRoot
if ([string]::IsNullOrEmpty($scriptPath)) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Write-Host "Installation Directory: $scriptPath" -ForegroundColor Green
Write-Host "Service Name: $ServiceName" -ForegroundColor Green
Write-Host "Port: $Port" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please run .\01-INSTALL.ps1 first" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if application is built
if (-not (Test-Path "$scriptPath\dist")) {
    Write-Host "ERROR: Application is not built!" -ForegroundColor Red
    Write-Host "Please run .\02-SETUP.ps1 first" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if nssm is available
$nssmPath = "$env:ProgramFiles\nssm\nssm.exe"
$nssmInstalled = Test-Path $nssmPath

if (-not $nssmInstalled) {
    Write-Host "Installing NSSM (Non-Sucking Service Manager)..." -ForegroundColor Yellow
    
    # Check if Chocolatey is installed
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nssm -y
        $nssmPath = (Get-Command nssm).Source
    } else {
        Write-Host "Downloading NSSM..." -ForegroundColor Yellow
        $nssmUrl = "https://nssm.cc/release/nssm-2.24.zip"
        $nssmZip = "$env:TEMP\nssm.zip"
        $nssmExtract = "$env:TEMP\nssm"
        
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip
        Expand-Archive -Path $nssmZip -DestinationPath $nssmExtract -Force
        
        # Copy appropriate version
        if ([Environment]::Is64BitOperatingSystem) {
            $nssmExe = "$nssmExtract\nssm-2.24\win64\nssm.exe"
        } else {
            $nssmExe = "$nssmExtract\nssm-2.24\win32\nssm.exe"
        }
        
        # Create NSSM directory
        New-Item -ItemType Directory -Path "$env:ProgramFiles\nssm" -Force | Out-Null
        Copy-Item $nssmExe -Destination "$env:ProgramFiles\nssm\nssm.exe" -Force
        $nssmPath = "$env:ProgramFiles\nssm\nssm.exe"
        
        Write-Host "NSSM installed successfully" -ForegroundColor Green
    }
}

# Stop and remove existing service if it exists
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Stopping existing service..." -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    & $nssmPath remove $ServiceName confirm
    Start-Sleep -Seconds 2
}

# Get Node.js path
$nodePath = (Get-Command node).Source

# Create service using NSSM
Write-Host ""
Write-Host "Installing service..." -ForegroundColor Cyan

& $nssmPath install $ServiceName $nodePath
& $nssmPath set $ServiceName AppDirectory $scriptPath
& $nssmPath set $ServiceName AppParameters "dist\index.js"
& $nssmPath set $ServiceName DisplayName $DisplayName
& $nssmPath set $ServiceName Description $Description
& $nssmPath set $ServiceName Start SERVICE_AUTO_START
& $nssmPath set $ServiceName AppStdout "$scriptPath\service-stdout.log"
& $nssmPath set $ServiceName AppStderr "$scriptPath\service-stderr.log"
& $nssmPath set $ServiceName AppRotateFiles 1
& $nssmPath set $ServiceName AppRotateOnline 1
& $nssmPath set $ServiceName AppRotateSeconds 86400
& $nssmPath set $ServiceName AppRotateBytes 10485760

# Set environment variables
& $nssmPath set $ServiceName AppEnvironmentExtra PORT=$Port

Write-Host "Service installed successfully!" -ForegroundColor Green

# Configure firewall
Write-Host ""
Write-Host "Configuring Windows Firewall..." -ForegroundColor Cyan

$firewallRule = Get-NetFirewallRule -DisplayName "StackLens-AI" -ErrorAction SilentlyContinue
if ($firewallRule) {
    Remove-NetFirewallRule -DisplayName "StackLens-AI"
}

New-NetFirewallRule -DisplayName "StackLens-AI" `
                    -Direction Inbound `
                    -LocalPort $Port `
                    -Protocol TCP `
                    -Action Allow `
                    -Description "Allow inbound traffic for StackLens-AI" | Out-Null

Write-Host "Firewall rule created for port $Port" -ForegroundColor Green

# Start the service
Write-Host ""
Write-Host "Starting service..." -ForegroundColor Cyan
Start-Service -Name $ServiceName

# Wait for service to start
Start-Sleep -Seconds 3

# Check service status
$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Running') {
    Write-Host ""
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host "  SERVICE INSTALLED SUCCESSFULLY!" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service Name: $ServiceName" -ForegroundColor White
    Write-Host "Status: Running" -ForegroundColor Green
    Write-Host "Port: $Port" -ForegroundColor White
    Write-Host ""
    Write-Host "Service Management Commands:" -ForegroundColor Cyan
    Write-Host "  Start:   Start-Service $ServiceName" -ForegroundColor White
    Write-Host "  Stop:    Stop-Service $ServiceName" -ForegroundColor White
    Write-Host "  Restart: Restart-Service $ServiceName" -ForegroundColor White
    Write-Host "  Status:  Get-Service $ServiceName" -ForegroundColor White
    Write-Host ""
    Write-Host "Logs Location:" -ForegroundColor Cyan
    Write-Host "  Output: $scriptPath\service-stdout.log" -ForegroundColor White
    Write-Host "  Errors: $scriptPath\service-stderr.log" -ForegroundColor White
    Write-Host ""
    Write-Host "Access URL: http://localhost:$Port" -ForegroundColor Green
    Write-Host ""
    Write-Host "The service will automatically start on system boot." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "WARNING: Service installed but not running!" -ForegroundColor Yellow
    Write-Host "Check logs for errors:" -ForegroundColor Yellow
    Write-Host "  $scriptPath\service-stderr.log" -ForegroundColor White
    Write-Host ""
    Write-Host "Try starting manually:" -ForegroundColor Yellow
    Write-Host "  Start-Service $ServiceName" -ForegroundColor White
    Write-Host ""
}

pause
