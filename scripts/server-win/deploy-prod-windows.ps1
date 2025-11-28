<#
.SYNOPSIS
  deploy-prod-windows.ps1
  Build Windows container images, push to registry, and deploy to a Windows EC2 host via PowerShell Remoting (WinRM).

.USAGE
  Edit top parameters or pass them when invoking the script:
  .\deploy-prod-windows.ps1 -ProdHost "ec2-host" -ProdUser "Administrator" -DockerRegistry "docker.io/yourorg" -Tag "20251128-abcd" -EnvFileLocal ".env.prod" -MigrateCmd "npm run migrate"

.NOTES
  - Target host must have WinRM enabled and Docker Engine for Windows installed and running.
  - Images must be Windows-based (servercore/nanoserver). Linux images will not run on Windows host.
  - This script builds locally. If you run from CI, ensure CI runner is Windows and has Docker installed.
  - Adjust service paths to match your repository structure if needed.
#>

param(
  [string]$ProdHost         = "ec2-windows-hostname-or-ip",
  [string]$ProdUser         = "Administrator",
  [string]$ProdRemoteDir    = "C:\Users\Administrator\Downloads\stacklens-ai",
  [string]$DockerRegistry   = "docker.io/yourorg",           # registry root, e.g. docker.io/yourorg or myregistry.azurecr.io/myorg
  [string]$Tag              = "$(Get-Date -Format yyyyMMddHHmmss)-$(git rev-parse --short HEAD 2>$null)",
  [string]$EnvFileLocal     = ".env.prod",
  [string]$MigrateCmd       = ""                             # e.g. "npm run migrate"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------
# Services -> relative build paths (adjust if your repo differs)
# ---------------------------
$Services = @{
  api            = "apps\api"
  web            = "apps\web"
  legacy_backend = "stacklens\backend"
  pos_backend    = "pos-demo\backend"
  pos_frontend   = "pos-demo\frontend"
}

Write-Host "=== StackLens Windows Deploy ===" -ForegroundColor Cyan
Write-Host "Target host: $ProdHost"
Write-Host "Target user: $ProdUser"
Write-Host "Remote dir: $ProdRemoteDir"
Write-Host "Docker registry: $DockerRegistry"
Write-Host "Image tag: $Tag"
Write-Host ""

# ---------------------------
# Validate Docker availability locally
# ---------------------------
function Assert-LocalDocker {
  try {
    docker version | Out-Null
  } catch {
    Write-Error "Docker must be installed and running locally. Aborting."
    exit 1
  }
}
Assert-LocalDocker

# ---------------------------
# Build and push images
# ---------------------------
foreach ($svc in $Services.Keys) {
  $path = $Services[$svc]
  $image = "$DockerRegistry/$svc:$Tag"
  Write-Host "==> Building $svc from $path -> $image" -ForegroundColor Yellow

  if (-Not (Test-Path "$path\Dockerfile")) {
    Write-Error "Dockerfile not found at $path\Dockerfile. Ensure your repo matches paths. Aborting."
    exit 1
  }

  # Build for Windows containers (explicit platform)
  $buildCmd = "docker build --platform windows/amd64 -t `"$image`" `"$path`""
  Write-Host "Running: $buildCmd"
  $buildProc = Start-Process -FilePath docker -ArgumentList @("build","--platform","windows/amd64","-t",$image,$path) -NoNewWindow -Wait -PassThru
  if ($buildProc.ExitCode -ne 0) {
    Write-Error "docker build failed for $svc (exit $($buildProc.ExitCode)). Aborting."
    exit 1
  }

  Write-Host "Pushing $image"
  $pushProc = Start-Process -FilePath docker -ArgumentList @("push",$image) -NoNewWindow -Wait -PassThru
  if ($pushProc.ExitCode -ne 0) {
    Write-Error "docker push failed for $svc (exit $($pushProc.ExitCode)). Aborting."
    exit 1
  }
}

# ---------------------------
# Generate docker-compose.yml content
# ---------------------------
$compose = @"
version: '3.8'
services:
  api:
    image: $DockerRegistry/api:$Tag
    restart: unless-stopped
    env_file:
      - .env.prod
    ports:
      - "4000:4000"
    networks:
      - backend

  web:
    image: $DockerRegistry/web:$Tag
    restart: unless-stopped
    env_file:
      - .env.prod
    ports:
      - "5173:5173"
    networks:
      - frontend

  legacy_backend:
    image: $DockerRegistry/legacy_backend:$Tag
    restart: unless-stopped
    env_file:
      - .env.prod
    ports:
      - "3001:3001"
    networks:
      - backend

  pos_backend:
    image: $DockerRegistry/pos_backend:$Tag
    restart: unless-stopped
    env_file:
      - .env.prod
    ports:
      - "3000:3000"
    networks:
      - backend

  pos_frontend:
    image: $DockerRegistry/pos_frontend:$Tag
    restart: unless-stopped
    env_file:
      - .env.prod
    ports:
      - "5174:5174"
    networks:
      - frontend

networks:
  frontend: {}
  backend: {}
"@

# ---------------------------
# Prepare remote session (WinRM)
# ---------------------------
Write-Host "Creating remote PowerShell session to $ProdHost..."
$cred = Get-Credential -UserName $ProdUser -Message "Enter password for $ProdUser on $ProdHost"

try {
  $session = New-PSSession -ComputerName $ProdHost -Credential $cred -ErrorAction Stop
} catch {
  Write-Error "Failed to create PSSession to $ProdHost. Ensure WinRM is enabled and firewall allows 5985/5986. $_"
  exit 1
}

try {
  # Ensure remote directory exists
  Invoke-Command -Session $session -ScriptBlock {
    param($dir)
    if (-Not (Test-Path -LiteralPath $dir)) {
      New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }
  } -ArgumentList $ProdRemoteDir

  # Upload docker-compose.yml
  $remoteComposePath = Join-Path $ProdRemoteDir "docker-compose.yml"
  Write-Host "Uploading docker-compose.yml to $remoteComposePath"
  $tmpCompose = [System.IO.Path]::GetTempFileName()
  Set-Content -Path $tmpCompose -Value $compose -Encoding UTF8
  Copy-Item -ToSession $session -Path $tmpCompose -Destination $remoteComposePath -Force

  # Upload .env.prod if present
  if (Test-Path $EnvFileLocal) {
    Write-Host "Uploading $EnvFileLocal to remote $ProdRemoteDir\.env.prod"
    Copy-Item -ToSession $session -Path $EnvFileLocal -Destination (Join-Path $ProdRemoteDir ".env.prod") -Force
  } else {
    Write-Warning ".env.prod not found locally. Ensure the remote host has proper production environment variables at $ProdRemoteDir\.env.prod"
  }

  # Create remote deploy script
  $remoteScript = @"
param(
  [string]\$ProdDir = '$ProdRemoteDir',
  [string]\$Registry = '$DockerRegistry',
  [string]\$Tag = '$Tag',
  [string]\$MigrateCmd = '$MigrateCmd'
)

try {
  Set-Location -Path \$ProdDir

  Write-Host 'Pruning unused images (non-interactive)...'
  docker image prune -f

  Write-Host 'Pulling images...'
  docker pull \$Registry/api:\$Tag
  docker pull \$Registry/web:\$Tag
  docker pull \$Registry/legacy_backend:\$Tag
  docker pull \$Registry/pos_backend:\$Tag
  docker pull \$Registry/pos_frontend:\$Tag

  Write-Host 'Bringing up compose stack...'
  # Use 'docker compose' (v2) if available. Fallback to docker-compose if not.
  if (Get-Command 'docker' -ErrorAction SilentlyContinue) {
    docker compose -f docker-compose.yml up -d --remove-orphans
  } else {
    docker-compose -f docker-compose.yml up -d --remove-orphans
  }

  if ([string]::IsNullOrEmpty(\$MigrateCmd) -eq \$false) {
    Write-Host "Running migration command inside API container: \$MigrateCmd"
    \$apiId = (docker ps --filter "ancestor=\$Registry/api:\$Tag" -q | Select-Object -First 1)
    if (\$apiId) {
      # For Windows containers use powershell inside the container
      docker exec -i \$apiId powershell -Command \$MigrateCmd
    } else {
      Write-Warning 'API container not found to run migrations.'
    }
  }

  Write-Host 'Waiting for API health-check...'
  \$healthy = \$false
  for (\$i = 0; \$i -lt 15; \$i++) {
    try {
      \$res = Invoke-RestMethod -Uri 'http://localhost:4000/api/analytics/health-status' -Method GET -TimeoutSec 2
      if (\$res.success) { \$healthy = \$true; break }
    } catch {}
    Start-Sleep -Seconds 2
  }
  if (-not \$healthy) {
    Write-Warning 'API health-check did not succeed within timeout.'
    exit 1
  }
  Write-Host 'Deployment completed successfully.'
} catch {
  Write-Error "Remote deploy script failed: $_"
  exit 1
}
"@

  $remoteScriptPath = Join-Path $ProdRemoteDir "deploy_script.ps1"
  $tmpScript = [System.IO.Path]::GetTempFileName()
  Set-Content -Path $tmpScript -Value $remoteScript -Encoding UTF8
  Copy-Item -ToSession $session -Path $tmpScript -Destination $remoteScriptPath -Force

  # Execute remote script
  Write-Host "Executing remote deploy script..."
  Invoke-Command -Session $session -ScriptBlock { param($script) & powershell -ExecutionPolicy Bypass -File $script } -ArgumentList $remoteScriptPath -ErrorAction Stop

  Write-Host "✅ Remote deployment finished (tag: $Tag)" -ForegroundColor Green
}
finally {
  if ($session) { Remove-PSSession $session }
  # cleanup local temp files
  if (Test-Path $tmpCompose) { Remove-Item $tmpCompose -Force -ErrorAction SilentlyContinue }
  if (Test-Path $tmpScript) { Remove-Item $tmpScript -Force -ErrorAction SilentlyContinue }
}

Write-Host "=== Deploy script completed ===" -ForegroundColor Cyan
Write-Host "Rollback: edit docker-compose.yml on the server to previous tag and run `docker compose -f docker-compose.yml up -d` remotely."