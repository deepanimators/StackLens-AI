#!/usr/bin/env pwsh
# PowerShell 5.1+ compatible rebuild script

param(
    [string]$ServerIP = "localhost"
)

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "    REBUILD APPLICATION" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Clean previous builds
Write-Host "Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "Removed dist folder" -ForegroundColor Green
}

if (Test-Path "client/dist") {
    Remove-Item -Recurse -Force "client/dist" 
    Write-Host "Removed client/dist folder" -ForegroundColor Green
}

# Install/update dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install --no-audit

if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed, trying with --force..." -ForegroundColor Yellow
    npm install --force --no-audit
}

# Build the application
Write-Host ""
Write-Host "Building application..." -ForegroundColor Yellow

Write-Host "Building client..." -ForegroundColor Gray
npm run build:client

if ($LASTEXITCODE -eq 0) {
    Write-Host "Client build successful" -ForegroundColor Green
} else {
    Write-Host "Client build failed" -ForegroundColor Red
    exit 1
}

Write-Host "Building server..." -ForegroundColor Gray  
npm run build:server

if ($LASTEXITCODE -eq 0) {
    Write-Host "Server build successful" -ForegroundColor Green
} else {
    Write-Host "Server build failed" -ForegroundColor Red
    exit 1
}

# Verify build outputs
Write-Host ""
Write-Host "Verifying build outputs..." -ForegroundColor Yellow

if (Test-Path "dist/index.js") {
    Write-Host "Server build output found: dist/index.js" -ForegroundColor Green
} else {
    Write-Host "ERROR: Server build output missing!" -ForegroundColor Red
    exit 1
}

if (Test-Path "dist/public/index.html") {
    Write-Host "Client build output found: dist/public/index.html" -ForegroundColor Green
} else {
    Write-Host "ERROR: Client build output missing!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "    REBUILD COMPLETED!" -ForegroundColor Green  
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application rebuilt successfully!" -ForegroundColor Green
Write-Host "You can now start the application with:" -ForegroundColor Yellow
Write-Host "  .\03-START-APP.ps1 -ServerIP $ServerIP" -ForegroundColor White
Write-Host ""
