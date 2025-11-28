# stop-services.ps1
# Stops Kafka and OpenTelemetry Collector on Windows

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Stopping Infrastructure Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Stop Kafka
$kafka = Get-NetTCPConnection -LocalPort 9092 -State Listen -ErrorAction SilentlyContinue
if ($kafka) {
    Write-Host "Stopping Kafka (PID: $($kafka.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $kafka.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  Kafka stopped" -ForegroundColor Green
} else {
    Write-Host "Kafka is not running" -ForegroundColor Gray
}

# Stop Kafka Controller
$kafkaCtrl = Get-NetTCPConnection -LocalPort 9093 -State Listen -ErrorAction SilentlyContinue
if ($kafkaCtrl) {
    Stop-Process -Id $kafkaCtrl.OwningProcess -Force -ErrorAction SilentlyContinue
}

# Stop OTEL
$otel = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue
if ($otel) {
    Write-Host "Stopping OTEL Collector (PID: $($otel.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $otel.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "  OTEL Collector stopped" -ForegroundColor Green
} else {
    Write-Host "OTEL Collector is not running" -ForegroundColor Gray
}

# Kill any remaining Java processes related to Kafka
$javaProcs = Get-Process -Name "java" -ErrorAction SilentlyContinue
foreach ($proc in $javaProcs) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        if ($cmdLine -match "kafka") {
            Write-Host "Stopping Java/Kafka process (PID: $($proc.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

Write-Host ""
Write-Host "All infrastructure services stopped." -ForegroundColor Green
Write-Host ""
