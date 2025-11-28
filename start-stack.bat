@echo off
REM start-stack.bat
REM Starts all StackLens services on Windows
REM Run from the project root directory

echo.
echo ========================================
echo   StackLens AI Platform
echo   Windows Startup Script
echo ========================================
echo.

REM Check if running from correct directory
if not exist "package.json" (
    echo ERROR: Please run this script from the project root directory
    echo Expected to find package.json in current directory
    pause
    exit /b 1
)

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "scripts\start-stack-windows.ps1"

pause
