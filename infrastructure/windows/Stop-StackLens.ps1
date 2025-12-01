<#
.SYNOPSIS
    Stop all StackLens Applications

.EXAMPLE
    .\Stop-StackLens.ps1
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectPath = "C:\StackLens-AI"
)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "   Stopping StackLens Applications" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

$logsDir = "$ProjectPath\logs"

# Stop by PID files
$pidFiles = Get-ChildItem "$logsDir\*.pid" -ErrorAction SilentlyContinue
foreach ($pidFile in $pidFiles) {
    $name = $pidFile.BaseName
    $pid = Get-Content $pidFile.FullName -ErrorAction SilentlyContinue
    
    if ($pid) {
        Write-Host "  Stopping $name (PID: $pid)..." -ForegroundColor White
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Remove-Item $pidFile.FullName -Force
        Write-Host "    ✓ Stopped" -ForegroundColor Green
    }
}

# Also stop by port (in case PID files are missing)
$ports = @(3000, 4000, 5173, 5174)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        if ($conn.OwningProcess -gt 0) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process -and $process.Name -ne "System") {
                Write-Host "  Stopping process on port $port (PID: $($conn.OwningProcess))..." -ForegroundColor White
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "    ✓ Stopped" -ForegroundColor Green
            }
        }
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   All Applications Stopped" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
