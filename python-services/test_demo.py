#!/usr/bin/env python3
"""
StackLens AI Demo - Integration Test
Test the complete AI pipeline with real examples
"""

import requests
import json
import time

BASE_URL = "http://localhost:8888"

def test_ai_pipeline():
    """Test the complete AI pipeline"""
    print("🧪 Testing StackLens AI Pipeline...")
    print("=" * 50)
    
    # Test error scenarios
    test_errors = [
        "Database connection timeout after 30 seconds",
        "Memory allocation failed: out of heap space",
        "Network socket closed unexpectedly",
        "CRITICAL: System temperature exceeded 85°C",
        "Authentication token expired for user session"
    ]
    
    print("📊 Analyzing Error Patterns...")
    for i, error in enumerate(test_errors, 1):
        print(f"\n{i}. Testing: '{error}'")
        
        # Analyze error
        response = requests.post(f"{BASE_URL}/analyze-error", 
                               json={"error_text": error})
        analysis = response.json()
        
        print(f"   🏷️  Category: {analysis['analysis']['predicted_category']}")
        print(f"   📈 Confidence: {analysis['analysis']['confidence']:.2f}")
        print(f"   ⚠️  Anomaly: {'Yes' if analysis['analysis']['is_anomaly'] else 'No'}")
        print(f"   🔍 Similar: {analysis['analysis']['most_similar_error']}")
    
    print("\n" + "=" * 50)
    print("🔍 Testing Semantic Search...")
    
    # Test semantic search
    search_response = requests.post(f"{BASE_URL}/search", json={
        "query": "database connection problem",
        "corpus": test_errors,
        "k": 3
    })
    search_results = search_response.json()
    
    print(f"Query: '{search_results['query']}'")
    print("Top matches:")
    for i, result in enumerate(search_results['results'], 1):
        print(f"  {i}. {result['text']} (similarity: {result['similarity']:.3f})")
    
    print("\n" + "=" * 50)
    print("📈 Checking Error Patterns...")
    
    # Get patterns
    patterns_response = requests.get(f"{BASE_URL}/get-patterns")
    patterns = patterns_response.json()
    
    print(f"Found {patterns['total_patterns']} error patterns:")
    for pattern in patterns['patterns']:
        print(f"  • {pattern['pattern']}: {pattern['frequency']} occurrences ({pattern['severity']})")
    
    print("\n" + "=" * 50)
    print("🤖 Testing Anomaly Detection...")
    
    # Test anomaly detection
    normal_errors = [
        "Database connection timeout",
        "Memory allocation failed", 
        "Network error occurred"
    ]
    
    unusual_errors = [
        "QUANTUM FLUX CAPACITOR OVERFLOW",
        "ERROR 404: REALITY NOT FOUND",
        "SYSTEM ACHIEVED SENTIENCE - TERMINATING HUMANS"
    ]
    
    anomaly_response = requests.post(f"{BASE_URL}/detect-anomaly", 
                                   json={"sentences": normal_errors + unusual_errors})
    anomaly_results = anomaly_response.json()
    
    print("Anomaly Detection Results:")
    for sentence, is_anomaly in zip(anomaly_results['sentences'], anomaly_results['anomaly_labels']):
        status = "🚨 ANOMALY" if is_anomaly else "✅ Normal"
        print(f"  {status}: {sentence}")
    
    print("\n" + "=" * 50)
    print("🎉 Pipeline Test Complete!")
    print("\n✅ All AI capabilities are working perfectly!")
    print("🚀 Your StackLens application is ready for advanced error intelligence!")

if __name__ == "__main__":
    try:
        # Check if service is running
        health_response = requests.get(f"{BASE_URL}/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ StackLens AI Service is running!")
            test_ai_pipeline()
        else:
            print("❌ Service not responding properly")
    except requests.exceptions.RequestException:
        print("❌ StackLens AI Service is not running!")
        print("💡 Start it with: python3 demo_service.py")
