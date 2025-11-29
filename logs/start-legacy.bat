@echo off
cd /d "C:\Users\Administrator\Downloads\stacklens-ai\stacklens\backend"
set PORT=3001
set HOST=0.0.0.0
pnpm run start > "C:\Users\Administrator\Downloads\stacklens-ai\logs\legacy_backend.log" 2>&1
