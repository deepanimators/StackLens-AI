# stop-services.ps1
# Stops all StackLens infrastructure services on Windows EC2
# Run as Administrator

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stopping StackLens Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop Kafka Service
$kafkaService = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
if ($kafkaService -and $kafkaService.Status -eq "Running") {
    Write-Host "Stopping Kafka service..." -ForegroundColor Yellow
    Stop-Service StackLensKafka -Force -ErrorAction SilentlyContinue
    Write-Host "  Kafka service stopped" -ForegroundColor Green
}

# Stop any Kafka processes
$kafkaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*kafka*" }
if ($kafkaProcesses) {
    Write-Host "Stopping Kafka processes..." -ForegroundColor Yellow
    $kafkaProcesses | Stop-Process -Force
    Write-Host "  Kafka processes stopped" -ForegroundColor Green
}

# Stop OTEL Service
$otelService = Get-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
if ($otelService -and $otelService.Status -eq "Running") {
    Write-Host "Stopping OTEL service..." -ForegroundColor Yellow
    Stop-Service StackLensOtel -Force -ErrorAction SilentlyContinue
    Write-Host "  OTEL service stopped" -ForegroundColor Green
}

# Stop any OTEL processes
$otelProcesses = Get-Process -Name "otelcol-contrib" -ErrorAction SilentlyContinue
if ($otelProcesses) {
    Write-Host "Stopping OTEL processes..." -ForegroundColor Yellow
    $otelProcesses | Stop-Process -Force
    Write-Host "  OTEL processes stopped" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Services Stopped" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
