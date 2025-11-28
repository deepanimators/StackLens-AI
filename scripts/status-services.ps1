# status-services.ps1
# Shows status of StackLens infrastructure services on Windows EC2

$INFRA_DIR = "C:\Users\Administrator\Downloads\stacklens-ai\infrastructure"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Infrastructure Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Windows Services
Write-Host "Windows Services:" -ForegroundColor Yellow
Write-Host "-----------------"

$services = @("StackLensKafka", "StackLensOtel")
foreach ($svcName in $services) {
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc) {
        if ($svc.Status -eq "Running") {
            Write-Host "  $svcName : " -NoNewline
            Write-Host "Running" -ForegroundColor Green
        } else {
            Write-Host "  $svcName : " -NoNewline
            Write-Host "$($svc.Status)" -ForegroundColor Red
        }
    } else {
        Write-Host "  $svcName : " -NoNewline
        Write-Host "Not Installed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Processes:" -ForegroundColor Yellow
Write-Host "----------"

# Check for Kafka Java process
$kafkaProc = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object { 
    try { $_.CommandLine -like "*kafka*" } catch { $false }
}
if ($kafkaProc) {
    Write-Host "  Kafka (Java): " -NoNewline
    Write-Host "Running (PID: $($kafkaProc.Id))" -ForegroundColor Green
} else {
    Write-Host "  Kafka (Java): " -NoNewline
    Write-Host "Not Running" -ForegroundColor Red
}

# Check for OTEL process
$otelProc = Get-Process -Name "otelcol-contrib" -ErrorAction SilentlyContinue
if ($otelProc) {
    Write-Host "  OTEL Collector: " -NoNewline
    Write-Host "Running (PID: $($otelProc.Id))" -ForegroundColor Green
} else {
    Write-Host "  OTEL Collector: " -NoNewline
    Write-Host "Not Running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Port Status:" -ForegroundColor Yellow
Write-Host "------------"

$ports = @(
    @{Port=9092; Name="Kafka"},
    @{Port=4317; Name="OTEL gRPC"},
    @{Port=4318; Name="OTEL HTTP"},
    @{Port=13133; Name="OTEL Health"}
)

foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p.Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    if ($conn) {
        Write-Host "  $($p.Port) ($($p.Name)): " -NoNewline
        Write-Host "LISTENING" -ForegroundColor Green
    } else {
        Write-Host "  $($p.Port) ($($p.Name)): " -NoNewline
        Write-Host "NOT LISTENING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Health Checks:" -ForegroundColor Yellow
Write-Host "--------------"

# Check Kafka
try {
    $kafkaCheck = Test-NetConnection -ComputerName localhost -Port 9092 -WarningAction SilentlyContinue
    if ($kafkaCheck.TcpTestSucceeded) {
        Write-Host "  Kafka (9092): " -NoNewline
        Write-Host "Healthy" -ForegroundColor Green
    } else {
        Write-Host "  Kafka (9092): " -NoNewline
        Write-Host "Unhealthy" -ForegroundColor Red
    }
} catch {
    Write-Host "  Kafka (9092): " -NoNewline
    Write-Host "Unhealthy" -ForegroundColor Red
}

# Check OTEL Health endpoint
try {
    $otelHealth = Invoke-WebRequest -Uri "http://localhost:13133" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($otelHealth.StatusCode -eq 200) {
        Write-Host "  OTEL (13133): " -NoNewline
        Write-Host "Healthy" -ForegroundColor Green
    } else {
        Write-Host "  OTEL (13133): " -NoNewline
        Write-Host "Unhealthy" -ForegroundColor Red
    }
} catch {
    Write-Host "  OTEL (13133): " -NoNewline
    Write-Host "Unhealthy" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Log Files:" -ForegroundColor Yellow
Write-Host "  Kafka: $INFRA_DIR\logs\kafka-stdout.log"
Write-Host "  OTEL:  $INFRA_DIR\logs\otel-stdout.log"
Write-Host ""
