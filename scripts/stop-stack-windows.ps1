# stop-stack-windows.ps1
# Stops all StackLens services on Windows

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  Stopping StackLens Services" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Ports to check and kill
$ports = @(
    @{Port=4000; Name="StackLens API"},
    @{Port=5173; Name="StackLens Frontend"},
    @{Port=5174; Name="POS Demo Frontend"},
    @{Port=3000; Name="POS Demo Backend"},
    @{Port=3001; Name="Legacy Backend"}
)

foreach ($item in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $item.Port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            try {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                Write-Host "  Stopping $($item.Name) (PID: $($conn.OwningProcess), Process: $($process.ProcessName))..." -ForegroundColor Yellow
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "    Stopped!" -ForegroundColor Green
            } catch {
                Write-Host "    Could not stop process: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "  $($item.Name) (port $($item.Port)): Not running" -ForegroundColor Gray
    }
}

# Also kill any node processes related to the project
Write-Host ""
Write-Host "Cleaning up Node.js processes..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcesses) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
        if ($cmdLine -match "stacklens|pos-demo|vite|tsx") {
            Write-Host "  Stopping Node.js process (PID: $($proc.Id))..." -ForegroundColor Yellow
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  All Services Stopped!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
