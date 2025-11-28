@echo off
REM install-services.bat
REM Run this as Administrator to install Kafka and OpenTelemetry on Windows EC2

echo.
echo ========================================
echo   StackLens Infrastructure Installer
echo   Windows EC2 (No Docker)
echo ========================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Run PowerShell installer
powershell -ExecutionPolicy Bypass -File "%~dp0install-services-windows.ps1"

pause
