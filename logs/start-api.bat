@echo off
cd /d "C:\Users\Administrator\Downloads\stacklens-ai"
set HOST=0.0.0.0
pnpm run start > "C:\Users\Administrator\Downloads\stacklens-ai\logs\server.log" 2>&1
