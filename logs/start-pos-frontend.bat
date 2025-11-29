@echo off
cd /d "C:\Users\Administrator\Downloads\stacklens-ai\pos-demo\frontend"
set VITE_HOST=0.0.0.0
pnpm run dev -- --host 0.0.0.0 --port 5174 > "C:\Users\Administrator\Downloads\stacklens-ai\logs\pos_frontend.log" 2>&1
