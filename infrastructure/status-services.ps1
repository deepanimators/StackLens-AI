# status-services.ps1
# Shows status of StackLens infrastructure services

$ErrorActionPreference = "Continue"

# Find paths
$SCRIPT_DIR = $PSScriptRoot
if (-not $SCRIPT_DIR) { $SCRIPT_DIR = (Get-Location).Path }

if (Test-Path "$SCRIPT_DIR\..\package.json") {
    $ROOT_DIR = (Resolve-Path "$SCRIPT_DIR\..").Path
} else {
    $ROOT_DIR = "C:\Users\Administrator\Downloads\stacklens-ai"
}

$INFRA_DIR = "$ROOT_DIR\infrastructure"
$LOGS_DIR = "$INFRA_DIR\logs"

# Load env for server IP
$envFile = "$ROOT_DIR\.env.windows"
if (-not (Test-Path $envFile)) { $envFile = "$ROOT_DIR\.env" }
$serverIp = "localhost"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*SERVER_IP\s*=\s*(.+)$") {
            $serverIp = $matches[1].Trim()
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server IP: $serverIp" -ForegroundColor Yellow
Write-Host ""

# Check Windows Services
Write-Host "Windows Services:" -ForegroundColor Cyan

$kafkaSvc = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
if ($kafkaSvc) {
    $status = $kafkaSvc.Status
    $color = if ($status -eq "Running") { "Green" } else { "Red" }
    Write-Host "  StackLensKafka: $status" -ForegroundColor $color
} else {
    Write-Host "  StackLensKafka: NOT INSTALLED" -ForegroundColor Yellow
}

$otelSvc = Get-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
if ($otelSvc) {
    $status = $otelSvc.Status
    $color = if ($status -eq "Running") { "Green" } else { "Red" }
    Write-Host "  StackLensOtel:  $status" -ForegroundColor $color
} else {
    Write-Host "  StackLensOtel:  NOT INSTALLED" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Port Status:" -ForegroundColor Cyan

# Check ports
$ports = @(
    @{Port=9092; Name="Kafka"; Service="Kafka Broker"},
    @{Port=9093; Name="Kafka Controller"; Service="Kafka Controller"},
    @{Port=4317; Name="OTEL gRPC"; Service="OpenTelemetry gRPC"},
    @{Port=4318; Name="OTEL HTTP"; Service="OpenTelemetry HTTP"},
    @{Port=13133; Name="OTEL Health"; Service="OpenTelemetry Health"}
)

foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p.Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess
        $procName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
        Write-Host "  [LISTENING] $($p.Name) - ${serverIp}:$($p.Port) (PID: $pid, $procName)" -ForegroundColor Green
    } else {
        Write-Host "  [CLOSED]    $($p.Name) - ${serverIp}:$($p.Port)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Java Processes:" -ForegroundColor Cyan

$javaProcs = Get-Process -Name "java" -ErrorAction SilentlyContinue
if ($javaProcs) {
    foreach ($proc in $javaProcs) {
        try {
            $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
            if ($cmdLine -match "kafka") {
                Write-Host "  [KAFKA] PID: $($proc.Id), Memory: $([math]::Round($proc.WorkingSet64/1MB, 2)) MB" -ForegroundColor Green
            } else {
                Write-Host "  [OTHER] PID: $($proc.Id), Memory: $([math]::Round($proc.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
            }
        } catch {
            Write-Host "  [JAVA]  PID: $($proc.Id)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  No Java processes running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Log Files:" -ForegroundColor Cyan

if (Test-Path $LOGS_DIR) {
    $logFiles = Get-ChildItem -Path $LOGS_DIR -Filter "*.log" -ErrorAction SilentlyContinue
    if ($logFiles) {
        foreach ($log in $logFiles) {
            $size = [math]::Round($log.Length/1KB, 2)
            $modified = $log.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            Write-Host "  $($log.Name): $size KB (modified: $modified)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  No log files found" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Logs directory not found: $LOGS_DIR" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Directories:" -ForegroundColor Cyan
Write-Host "  Infrastructure: $INFRA_DIR" -ForegroundColor Gray
Write-Host "  Logs:          $LOGS_DIR" -ForegroundColor Gray

Write-Host ""

# Quick health summary
$allOk = $true
$kafka = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
$otel = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue

if ($kafka -and $otel) {
    Write-Host "Overall Status: ALL SERVICES RUNNING" -ForegroundColor Green
} elseif ($kafka) {
    Write-Host "Overall Status: KAFKA OK, OTEL DOWN" -ForegroundColor Yellow
} elseif ($otel) {
    Write-Host "Overall Status: KAFKA DOWN, OTEL OK" -ForegroundColor Yellow
} else {
    Write-Host "Overall Status: ALL SERVICES DOWN" -ForegroundColor Red
}

Write-Host ""
