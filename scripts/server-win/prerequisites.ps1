<#
  prepare-windows-ec2.ps1
  Run this as Administrator on the Windows EC2 instance.
  Purpose: enable containers, install Docker Engine, ensure docker compose availability,
           enable WinRM, open firewall ports, create deploy dir.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Config: adjust if needed
$DeployDir = "C:\Users\Administrator\Downloads\stacklens-ai"
$ComposeVersion = "v2.18.1"   # fallback version to download if 'docker compose' not present
$ComposeExePath = "C:\Program Files\Docker\docker-compose.exe"
$AppPorts = @(4000, 5173, 3000, 3001, 5174)
$WinRMPort = 5985

function Write-Ok($msg){ Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Err($msg){ Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Warn($msg){ Write-Host "⚠️ $msg" -ForegroundColor Yellow }

# 1) Enable Containers feature
Write-Host "Enabling Windows Containers feature..."
if (-not (Get-WindowsFeature -Name Containers).Installed) {
  Install-WindowsFeature -Name Containers -IncludeAllSubFeature -IncludeManagementTools -ErrorAction Stop
  Write-Ok "Containers feature installed."
} else {
  Write-Ok "Containers feature already installed."
}

# 2) Install Docker Engine via DockerMsftProvider (if not present)
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Installing Docker (DockerMsftProvider)..."
  # Install provider module if needed
  if (-not (Get-Module -ListAvailable -Name DockerMsftProvider)) {
    Install-Module -Name DockerMsftProvider -Repository PSGallery -Force -AllowClobber
  }
  # Install docker package
  Install-Package -Name docker -ProviderName DockerMsftProvider -Force -ErrorAction Stop
  Write-Ok "Docker package installed."
} else {
  Write-Ok "Docker CLI already present."
}

# 3) Start Docker service
Write-Host "Starting Docker service..."
try {
  Start-Service docker -ErrorAction Stop
} catch {
  Write-Warn "Start-Service docker failed or docker service already started. Attempting to continue."
}
# Wait for Docker daemon to respond
$maxWait = 60
$elapsed = 0
while ($elapsed -lt $maxWait) {
  try {
    docker version --format '{{.Server.Version}}' > $null 2>&1
    Write-Ok "Docker daemon is running."
    break
  } catch {
    Start-Sleep -Seconds 2
    $elapsed += 2
  }
}
if ($elapsed -ge $maxWait) {
  Write-Err "Docker daemon didn't respond within $maxWait seconds. Check service and logs."
  exit 1
}

# 4) Ensure 'docker compose' or docker-compose exists. If not, download fallback binary.
$hasDockerCompose = $false
try {
  docker compose version > $null 2>&1
  $hasDockerCompose = $true
  Write-Ok "'docker compose' command available."
} catch {
  # try docker-compose binary check
  if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $hasDockerCompose = $true
    Write-Ok "docker-compose CLI available."
  } else {
    Write-Warn "'docker compose' not found. Will attempt to download docker-compose.exe fallback."
  }
}

if (-not $hasDockerCompose) {
  # Create directory for compose binary
  $composeDir = Split-Path -Parent $ComposeExePath
  if (-not (Test-Path $composeDir)) { New-Item -Path $composeDir -ItemType Directory -Force | Out-Null }

  $url = "https://github.com/docker/compose/releases/download/$ComposeVersion/docker-compose-windows-x86_64.exe"
  Write-Host "Downloading docker-compose fallback from $url ..."
  try {
    Invoke-WebRequest -Uri $url -OutFile $ComposeExePath -UseBasicParsing -ErrorAction Stop
    # ensure executable
    icacls $ComposeExePath /grant "BUILTIN\Users:(RX)" > $null
    Write-Ok "Downloaded docker-compose to $ComposeExePath"
    Write-Host "You can run the fallback as: `"$ComposeExePath`" -f docker-compose.yml up -d"
  } catch {
    Write-Warn "Failed to download docker-compose fallback. You may need to install compose manually or ensure Docker CLI provides 'docker compose'. Error: $_"
  }
}

# 5) Enable WinRM / PowerShell Remoting
Write-Host "Configuring WinRM / PowerShell Remoting..."
try {
  winrm quickconfig -q
  Enable-PSRemoting -Force -ErrorAction Stop
  Write-Ok "WinRM and PSRemoting enabled."
} catch {
  Write-Warn "WinRM/PSRemoting configuration had issues. Ensure WinRM is allowed and configured. Error: $_"
}

# 6) Open firewall ports: WinRM and app ports
Write-Host "Configuring firewall rules..."
try {
  # WinRM rule
  if (-not (Get-NetFirewallRule -DisplayName "Allow WinRM (HTTP 5985)" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "Allow WinRM (HTTP 5985)" -Direction Inbound -LocalPort $WinRMPort -Protocol TCP -Action Allow
  }
  foreach ($p in $AppPorts) {
    $ruleName = "Allow App Port $p"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $p -Protocol TCP -Action Allow
    }
  }
  Write-Ok "Firewall rules created for WinRM and app ports: $($AppPorts -join ', ')."
} catch {
  Write-Warn "Firewall configuration failed: $_"
}

# 7) Create deploy directory
Write-Host "Creating deploy directory: $DeployDir"
try {
  if (-not (Test-Path -LiteralPath $DeployDir)) {
    New-Item -Path $DeployDir -ItemType Directory -Force | Out-Null
    Write-Ok "Created $DeployDir"
  } else {
    Write-Ok "Deploy directory already exists."
  }
} catch {
  Write-Err "Failed to create deploy directory: $_"
  exit 1
}

# 8) Final checks & summary
Write-Host ""
Write-Host "=== Summary ==="
try {
  $dockerVer = docker version --format "Server: {{.Server.Version}}, Client: {{.Client.Version}}" 2>$null
  Write-Host "Docker: $dockerVer"
} catch {
  Write-Warn "Unable to query docker version. Check Docker service."
}
if (docker compose version > $null 2>&1) {
  Write-Ok "'docker compose' available"
} elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
  Write-Ok "docker-compose binary available"
} else {
  Write-Warn "No compose command detected. Use the fallback compose binary at $ComposeExePath if downloaded."
}

Write-Host "WinRM listening on port $WinRMPort (ensure security group allows remote access from your admin IP)."
Write-Host "Deploy directory: $DeployDir"
Write-Host ""
Write-Ok "Server prep completed. You can now copy docker-compose.yml and .env.prod to the deploy directory and run your deployment script."
Write-Warn "REMINDER: Windows containers only on this host. Linux images will not run here."