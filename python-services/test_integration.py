#!/usr/bin/env python3
"""
Test script to verify deep learning integration
Run this to check if all components are working correctly
"""

import requests
import json
import time
import sys
import os

def test_service(service_name, port, endpoint="/health"):
    """Test if a service is running"""
    try:
        response = requests.get(f"http://localhost:{port}{endpoint}", timeout=5)
        if response.status_code == 200:
            print(f"✅ {service_name} (port {port}) - Running")
            return True
        else:
            print(f"❌ {service_name} (port {port}) - HTTP {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {service_name} (port {port}) - Not running")
        return False
    except Exception as e:
        print(f"❌ {service_name} (port {port}) - Error: {e}")
        return False

def test_deep_learning_api():
    """Test the deep learning API specifically"""
    print("\n🧠 Testing Deep Learning API...")
    
    # Test health check
    if not test_service("Deep Learning API", 8006, "/"):
        return False
    
    # Test status endpoint
    try:
        response = requests.get("http://localhost:8006/status")
        if response.status_code == 200:
            status = response.json()
            print(f"📊 Models loaded: {len(status.get('models', {}))}")
            print(f"🎯 GPU available: {status.get('gpu_available', False)}")
            print(f"🧮 PyTorch available: {status.get('pytorch_available', False)}")
        else:
            print(f"⚠️ Status endpoint returned {response.status_code}")
    except Exception as e:
        print(f"⚠️ Could not get status: {e}")
    
    # Test prediction endpoint with sample data
    try:
        test_data = {
            "error_context": {
                "message": "NullPointerException in UserService",
                "timestamp": "2024-01-15T10:30:00Z",
                "system_state": {"cpu": 85, "memory": 78, "load": "high"},
                "recent_errors": ["ConnectionTimeout", "DatabaseLock"]
            }
        }
        
        response = requests.post(
            "http://localhost:8006/predict",
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"🎯 Prediction successful!")
            print(f"   Severity: {result.get('predicted_severity', 'N/A')}")
            print(f"   Category: {result.get('predicted_category', 'N/A')}")
            print(f"   Confidence: {result.get('confidence', 'N/A')}")
            return True
        else:
            print(f"❌ Prediction failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return False

def test_all_microservices():
    """Test all microservices"""
    print("🔍 Testing All Microservices...\n")
    
    services = [
        ("Embeddings Service", 8001),
        ("NER Service", 8002),
        ("Summarization Service", 8003),
        ("Semantic Search", 8004),
        ("Anomaly Detection", 8005),
        ("Deep Learning", 8006),
        ("Vector Database", 8007)
    ]
    
    running_services = 0
    for service_name, port in services:
        if test_service(service_name, port):
            running_services += 1
    
    print(f"\n📈 Services running: {running_services}/{len(services)}")
    return running_services == len(services)

def check_environment():
    """Check if environment is properly set up"""
    print("🔧 Checking Environment...\n")
    
    # Check Python version
    python_version = sys.version_info
    print(f"🐍 Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    # Check if we're in the right directory
    if os.path.exists("deep_learning_models.py"):
        print("✅ Deep learning files found")
    else:
        print("❌ Deep learning files not found - make sure you're in the ml_microservices directory")
        return False
    
    # Check for Docker
    try:
        import subprocess
        result = subprocess.run(["docker", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Docker available")
        else:
            print("⚠️ Docker not available")
    except:
        print("⚠️ Docker not available")
    
    # Check for key Python packages
    packages = ["torch", "transformers", "fastapi", "uvicorn"]
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package} installed")
        except ImportError:
            print(f"❌ {package} not installed")
    
    return True

def run_integration_test():
    """Run a comprehensive integration test"""
    print("🚀 Running Integration Test for Deep Learning StackLens AI\n")
    print("=" * 60)
    
    # Step 1: Check environment
    if not check_environment():
        print("\n❌ Environment check failed")
        return False
    
    print("\n" + "=" * 60)
    
    # Step 2: Test microservices
    all_services_running = test_all_microservices()
    
    print("\n" + "=" * 60)
    
    # Step 3: Deep learning specific tests
    if not test_deep_learning_api():
        print("\n⚠️ Deep learning API tests failed")
        if not all_services_running:
            print("💡 Tip: Make sure to run './launch_all_enhanced.sh' first")
    
    print("\n" + "=" * 60)
    print("🎯 Integration Test Complete!")
    
    if all_services_running:
        print("✅ All systems operational - Your StackLens AI is ready!")
        print("\n🔗 Access your services at:")
        print("   • Deep Learning API: http://localhost:8006")
        print("   • Embeddings: http://localhost:8001")
        print("   • NER: http://localhost:8002")
        print("   • Summarization: http://localhost:8003")
        print("   • Semantic Search: http://localhost:8004")
        print("   • Anomaly Detection: http://localhost:8005")
        print("   • Vector Database: http://localhost:8007")
    else:
        print("⚠️ Some services are not running")
        print("\n🛠️ To start all services:")
        print("   cd ml_microservices")
        print("   ./launch_all_enhanced.sh")
        print("   # Or use Docker Compose:")
        print("   docker-compose up --build")

if __name__ == "__main__":
    run_integration_test()
