#!/usr/bin/env python3
"""
Simple startup script for StackLens Vector Database Service
Only starts the enhanced_vector_db_service.py which is used by the main application
"""

import subprocess
import sys
import os
import uvicorn

# Add current directory to Python path
current_dir = os.path.dirname(__file__)
sys.path.insert(0, current_dir)

def main():
    """Start the enhanced vector database service"""
    print("🚀 Starting StackLens Vector Database Service...")
    print("📡 Service will be available at: http://localhost:8001")
    print("⚡ Press Ctrl+C to stop")
    
    try:
        # Import and run the service
        from enhanced_vector_db_service import app
        
        uvicorn.run(
            app,
            host="0.0.0.0", 
            port=8001,
            log_level="info"
        )
    except ImportError as e:
        print(f"❌ Failed to import vector service: {e}")
        print("Make sure enhanced_vector_db_service.py is in the same directory")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to start service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
