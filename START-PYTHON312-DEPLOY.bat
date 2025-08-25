@echo off
echo =====================================
echo    STACKLENS-AI PYTHON 3.12 DEPLOY
echo =====================================
echo.

set /p SERVER_IP="Enter your server IP (default: localhost): "
if "%SERVER_IP%"=="" set SERVER_IP=localhost

echo.
echo Starting deployment with Python 3.12...
echo Server IP: %SERVER_IP%
echo.

PowerShell -ExecutionPolicy Bypass -File "QUICK-DEPLOY-PYTHON312.ps1" -ServerIP %SERVER_IP%

echo.
pause
