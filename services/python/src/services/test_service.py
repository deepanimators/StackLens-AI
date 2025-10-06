#!/usr/bin/env python3
"""
Quick Test Service - Minimal FastAPI service to verify setup
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="StackLens AI Test Service", version="1.0.0")

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "test_service"}

@app.get("/")
def root():
    return {"message": "StackLens AI Test Service is running!"}

@app.post("/test")
def test_endpoint(data: dict):
    return {"received": data, "status": "success"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8888)
