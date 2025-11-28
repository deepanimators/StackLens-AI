# status-stack-windows.ps1
# Shows status of all StackLens services on Windows

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  StackLens Service Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Service ports to check
$services = @(
    @{Port=4000; Name="StackLens API"; URL="http://localhost:4000/api/health"},
    @{Port=5173; Name="StackLens Frontend"; URL="http://localhost:5173"},
    @{Port=5174; Name="POS Demo Frontend"; URL="http://localhost:5174"},
    @{Port=3000; Name="POS Demo Backend"; URL="http://localhost:3000"},
    @{Port=3001; Name="Legacy Backend"; URL="http://localhost:3001"}
)

Write-Host "Application Services:" -ForegroundColor Yellow
Write-Host ""

foreach ($svc in $services) {
    $conn = Get-NetTCPConnection -LocalPort $svc.Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "  [RUNNING] $($svc.Name)" -ForegroundColor Green -NoNewline
        Write-Host " - Port $($svc.Port), PID: $($conn.OwningProcess), Process: $($process.ProcessName)" -ForegroundColor Gray
    } else {
        Write-Host "  [STOPPED] $($svc.Name)" -ForegroundColor Red -NoNewline
        Write-Host " - Port $($svc.Port)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Infrastructure Services:" -ForegroundColor Yellow
Write-Host ""

$infraServices = @(
    @{Port=9092; Name="Kafka Broker"},
    @{Port=9093; Name="Kafka Controller"},
    @{Port=4317; Name="OTEL gRPC"},
    @{Port=4318; Name="OTEL HTTP"},
    @{Port=13133; Name="OTEL Health"}
)

foreach ($svc in $infraServices) {
    $conn = Get-NetTCPConnection -LocalPort $svc.Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "  [RUNNING] $($svc.Name)" -ForegroundColor Green -NoNewline
        Write-Host " - Port $($svc.Port)" -ForegroundColor Gray
    } else {
        Write-Host "  [STOPPED] $($svc.Name)" -ForegroundColor Red -NoNewline
        Write-Host " - Port $($svc.Port)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Optional: Test API endpoint
Write-Host "Testing API Health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  API Health: OK" -ForegroundColor Green
} catch {
    Write-Host "  API Health: FAILED or Not Responding" -ForegroundColor Red
}

Write-Host ""
