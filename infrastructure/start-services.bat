@echo off
REM start-services.bat
REM Starts Kafka and OpenTelemetry Collector on Windows

echo.
echo ========================================
echo   Starting StackLens Infrastructure
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0start-services.ps1"

pause
