@echo off
cd /d "C:\Users\Administrator\Downloads\stacklens-ai"
set VITE_HOST=0.0.0.0
pnpm run dev:client > "C:\Users\Administrator\Downloads\stacklens-ai\logs\client.log" 2>&1
