@echo off
REM install-services.bat
REM Run this as Administrator to install Kafka and OpenTelemetry on Windows EC2

echo.
echo ========================================
echo   StackLens Infrastructure Installer
echo   Windows EC2 (No Docker)
echo ========================================
echo.

REM Keep window open on any error
setlocal enabledelayedexpansion

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo Running as Administrator - OK
echo.

REM Check if PowerShell script exists
if not exist "%~dp0install-services-windows.ps1" (
    echo.
    echo ERROR: Cannot find install-services-windows.ps1
    echo Expected location: %~dp0install-services-windows.ps1
    echo.
    echo Please make sure the PowerShell script is in the same folder as this batch file.
    echo.
    pause
    exit /b 1
)

echo Found PowerShell script - OK
echo Starting installation...
echo.

REM Run PowerShell installer with error handling
powershell -NoExit -ExecutionPolicy Bypass -Command "& {try { & '%~dp0install-services-windows.ps1' } catch { Write-Host 'ERROR:' $_.Exception.Message -ForegroundColor Red; Read-Host 'Press Enter to exit' }}"

echo.
echo ========================================
echo   Installation script completed
echo ========================================
echo.
pause
