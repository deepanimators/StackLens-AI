@echo off
echo ========================================
echo StackLens-AI Windows GPU Server Setup
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Running as Administrator... ✓
echo.

REM Get server IP from user
set /p SERVER_IP="Enter your Windows server IP address: "
if "%SERVER_IP%"=="" (
    echo ERROR: Server IP is required!
    pause
    exit /b 1
)

echo.
echo Starting deployment with IP: %SERVER_IP%
echo This will take a few minutes...
echo.

REM Run PowerShell deployment script
powershell.exe -ExecutionPolicy Bypass -File "QUICK-DEPLOY.ps1" -ServerIP "%SERVER_IP%"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Deployment failed!
    echo Check the error messages above.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 🎉 SUCCESS! Your app is now running! 🎉
echo ========================================
echo.
echo Share this URL with your staff:
echo http://%SERVER_IP%:4000
echo.
echo Press any key to exit...
pause >nul
