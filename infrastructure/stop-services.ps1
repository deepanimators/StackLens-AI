# stop-services.ps1
# Stops Kafka and OpenTelemetry Collector on Windows

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Stopping Infrastructure Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Stop Kafka Windows Service first
$kafkaSvc = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
if ($kafkaSvc -and $kafkaSvc.Status -eq "Running") {
    Write-Host "Stopping StackLensKafka Windows Service..." -ForegroundColor Yellow
    Stop-Service -Name "StackLensKafka" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  Kafka Windows Service stopped" -ForegroundColor Green
} elseif ($kafkaSvc) {
    Write-Host "StackLensKafka service exists but not running" -ForegroundColor Gray
}

# Stop OTEL Windows Service first
$otelSvc = Get-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
if ($otelSvc -and $otelSvc.Status -eq "Running") {
    Write-Host "Stopping StackLensOtel Windows Service..." -ForegroundColor Yellow
    Stop-Service -Name "StackLensOtel" -Force -ErrorAction SilentlyContinue
    Write-Host "  Service stopped" -ForegroundColor Green
}

# Also stop by port if still running (handles direct launches)
$kafka = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
if ($kafka) {
    Write-Host "Stopping Kafka process (PID: $($kafka.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $kafka.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  Kafka process stopped" -ForegroundColor Green
} else {
    Write-Host "[OK] Kafka port 9092 is now free" -ForegroundColor Green
}

# Stop Kafka Controller
$kafkaCtrl = Get-NetTCPConnection -LocalPort 9093 -State Listen -ErrorAction SilentlyContinue
if ($kafkaCtrl) {
    Stop-Process -Id $kafkaCtrl.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Stop OTEL by port
$otel = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue
if ($otel) {
    Write-Host "Stopping OTEL Collector (PID: $($otel.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $otel.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  OTEL Collector stopped" -ForegroundColor Green
} else {
    Write-Host "OTEL Collector is not running on port 4317" -ForegroundColor Gray
}

# Kill any remaining Java processes related to Kafka
$javaProcs = Get-Process -Name "java" -ErrorAction SilentlyContinue
foreach ($proc in $javaProcs) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" -ErrorAction SilentlyContinue).CommandLine
        if ($cmdLine -match "kafka") {
            Write-Host "Stopping Java/Kafka process (PID: $($proc.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

Write-Host ""
Write-Host "All infrastructure services stopped." -ForegroundColor Green
Write-Host ""
