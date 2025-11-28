# start-services.ps1
# Starts all StackLens infrastructure services on Windows EC2
# Run as Administrator

$INFRA_DIR = "C:\Users\Administrator\Downloads\stacklens-ai\infrastructure"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting StackLens Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "WARNING: Run as Administrator for best results" -ForegroundColor Yellow
}

# Start Kafka
Write-Host "Starting Kafka..." -ForegroundColor Yellow
$kafkaService = Get-Service -Name "StackLensKafka" -ErrorAction SilentlyContinue
if ($kafkaService) {
    Start-Service StackLensKafka -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    $kafkaService = Get-Service -Name "StackLensKafka"
    if ($kafkaService.Status -eq "Running") {
        Write-Host "  Kafka started!" -ForegroundColor Green
    } else {
        Write-Host "  Kafka failed to start. Check logs." -ForegroundColor Red
    }
} else {
    Write-Host "  Kafka service not installed. Starting manually..." -ForegroundColor Yellow
    $kafkaProcess = Start-Process -FilePath "$INFRA_DIR\kafka\bin\windows\kafka-server-start.bat" `
        -ArgumentList "$INFRA_DIR\config\kraft-server.properties" `
        -WindowStyle Hidden -PassThru
    Write-Host "  Kafka started (PID: $($kafkaProcess.Id))" -ForegroundColor Green
}

# Start OTEL
Write-Host "Starting OpenTelemetry Collector..." -ForegroundColor Yellow
$otelService = Get-Service -Name "StackLensOtel" -ErrorAction SilentlyContinue
if ($otelService) {
    Start-Service StackLensOtel -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $otelService = Get-Service -Name "StackLensOtel"
    if ($otelService.Status -eq "Running") {
        Write-Host "  OTEL Collector started!" -ForegroundColor Green
    } else {
        Write-Host "  OTEL failed to start. Check logs." -ForegroundColor Red
    }
} else {
    Write-Host "  OTEL service not installed. Starting manually..." -ForegroundColor Yellow
    $otelProcess = Start-Process -FilePath "$INFRA_DIR\otel-collector\otelcol-contrib.exe" `
        -ArgumentList "--config=$INFRA_DIR\config\otel-collector-config.yaml" `
        -WindowStyle Hidden -PassThru
    Write-Host "  OTEL started (PID: $($otelProcess.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoints:" -ForegroundColor Yellow
Write-Host "  Kafka:       localhost:9092"
Write-Host "  OTEL gRPC:   localhost:4317"
Write-Host "  OTEL HTTP:   localhost:4318"
Write-Host "  OTEL Health: localhost:13133"
Write-Host ""
Write-Host "Check status: .\status-services.ps1" -ForegroundColor Cyan
Write-Host ""
