@echo off
REM install-and-build.bat
REM Installs all dependencies and builds the StackLens project
REM Run this ONCE after cloning the repository

echo.
echo ========================================
echo   StackLens AI Platform
echo   Install and Build Script
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
powershell -ExecutionPolicy Bypass -File "scripts\install-and-build-windows.ps1"

pause
