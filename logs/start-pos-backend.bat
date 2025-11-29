@echo off
cd /d "C:\Users\Administrator\Downloads\stacklens-ai\pos-demo\backend"
set PORT=3000
set HOST=0.0.0.0
pnpm run start > "C:\Users\Administrator\Downloads\stacklens-ai\logs\pos_backend.log" 2>&1
