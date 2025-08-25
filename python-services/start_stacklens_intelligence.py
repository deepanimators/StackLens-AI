#!/usr/bin/env python3
"""
StackLens Integrated Intelligence Starter
Quick start script for using the integrated error intelligence system
"""

import asyncio
import uvicorn
import sys
import os
from pathlib import Path

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from stacklens_integrated_intelligence import app, intelligence

def print_banner():
    """Print startup banner"""
    print("🌟 StackLens Integrated Error Intelligence Platform")
    print("=" * 60)
    print("🔗 Using your existing stacklens.db with 56K+ real errors")
    print("🎯 304+ proven error patterns from production data")
    print("🧠 19K+ training samples for superior ML accuracy")
    print("=" * 60)

async def quick_test():
    """Run a quick test to verify system works"""
    print("\n🧪 Quick System Test...")
    
    # Initialize if not already done
    if not intelligence.is_initialized:
        print("🔄 Initializing intelligence system...")
        await intelligence.initialize()
    
    # Test error analysis
    test_error = "Database connection timeout after 30 seconds"
    result = await intelligence.analyze_error(test_error)
    
    print(f"✅ Test Analysis Complete:")
    print(f"   Error: {test_error}")
    print(f"   Type: {result.error_type}")
    print(f"   Severity: {result.severity}")
    print(f"   Confidence: {result.confidence:.2f}")
    print(f"   Solution: {result.suggested_solution[:60]}...")
    
    # Get statistics
    stats = await intelligence.get_error_statistics()
    print(f"\n📊 System Statistics:")
    print(f"   Total Errors: {stats.get('total_errors', 'N/A'):,}")
    print(f"   Active Patterns: {stats.get('active_patterns', 'N/A')}")
    print(f"   Trained Models: {stats.get('models_trained', 'N/A')}")
    
    print(f"\n✅ System is working correctly!")

def start_api_server():
    """Start the FastAPI server"""
    print(f"\n🚀 Starting StackLens Intelligence API Server...")
    print(f"📡 API will be available at: http://localhost:8001")
    print(f"📚 Interactive docs at: http://localhost:8001/docs")
    print(f"🔍 Health check at: http://localhost:8001/health")
    print(f"\n⚡ Press Ctrl+C to stop the server")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )

async def interactive_demo():
    """Run interactive demo"""
    print(f"\n🎮 Interactive Demo Mode")
    print(f"Enter error messages to analyze (type 'quit' to exit):")
    
    # Initialize if needed
    if not intelligence.is_initialized:
        print("🔄 Initializing...")
        await intelligence.initialize()
    
    while True:
        try:
            error_input = input(f"\n🔍 Enter error message: ").strip()
            
            if error_input.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not error_input:
                continue
            
            print("🤖 Analyzing...")
            result = await intelligence.analyze_error(error_input)
            
            print(f"📊 Analysis Results:")
            print(f"   Type: {result.error_type}")
            print(f"   Severity: {result.severity}")
            print(f"   Confidence: {result.confidence:.2f}")
            print(f"   Solution: {result.suggested_solution}")
            
            if result.pattern_matched:
                print(f"   🎯 Matched Pattern: {result.pattern_matched}")
            
            if result.similar_errors:
                print(f"   🔗 Similar Errors Found: {len(result.similar_errors)}")
            
        except KeyboardInterrupt:
            print(f"\n👋 Demo interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    """Main function with menu options"""
    print_banner()
    
    print(f"\n🎯 Choose an option:")
    print(f"1. 🧪 Quick Test (verify system works)")
    print(f"2. 🚀 Start API Server (for integration)")
    print(f"3. 🎮 Interactive Demo (test error analysis)")
    print(f"4. 📊 Run Full Demo (comprehensive showcase)")
    print(f"5. 🔬 Run Integration Tests (validate system)")
    print(f"6. ❓ Show Help")
    
    while True:
        try:
            choice = input(f"\nEnter your choice (1-6): ").strip()
            
            if choice == "1":
                print(f"\n🧪 Running Quick Test...")
                asyncio.run(quick_test())
                break
                
            elif choice == "2":
                start_api_server()
                break
                
            elif choice == "3":
                asyncio.run(interactive_demo())
                break
                
            elif choice == "4":
                print(f"\n📊 Starting Full Demo...")
                print(f"Run: python demo_stacklens_integration.py")
                os.system("python demo_stacklens_integration.py")
                break
                
            elif choice == "5":
                print(f"\n🔬 Running Integration Tests...")
                print(f"Run: python test_stacklens_integration.py")
                os.system("python test_stacklens_integration.py")
                break
                
            elif choice == "6":
                show_help()
                
            else:
                print(f"❌ Invalid choice. Please enter 1-6.")
                
        except KeyboardInterrupt:
            print(f"\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")

def show_help():
    """Show help information"""
    print(f"\n❓ StackLens Integrated Intelligence Help")
    print("=" * 50)
    print(f"📁 Files Overview:")
    print(f"   • stacklens_integrated_intelligence.py - Main platform")
    print(f"   • test_stacklens_integration.py - Integration tests")
    print(f"   • demo_stacklens_integration.py - Full demo")
    print(f"   • analyze_database_integration.py - Database analysis")
    print(f"   • start_stacklens_intelligence.py - This starter script")
    
    print(f"\n🔗 API Endpoints (when server is running):")
    print(f"   • POST /analyze - Analyze error messages")
    print(f"   • GET /statistics - Get system statistics")
    print(f"   • GET /patterns - Get error patterns")
    print(f"   • POST /patterns - Add new patterns")
    print(f"   • POST /retrain - Retrain ML models")
    print(f"   • GET /health - Health check")
    
    print(f"\n🧠 Integration with StackLens App:")
    print(f"   1. The system uses your existing db/stacklens.db")
    print(f"   2. No separate database needed")
    print(f"   3. Real-time learning from your error logs")
    print(f"   4. Use enterprise-intelligence-integration.ts for TypeScript")
    
    print(f"\n📊 Database Content:")
    print(f"   • 56,221 real error logs from your environment")
    print(f"   • 305 proven error patterns")
    print(f"   • 19,971 training data samples")
    print(f"   • 23 processed log files")
    
    print(f"\n🚀 Quick Start Commands:")
    print(f"   python start_stacklens_intelligence.py   # This script")
    print(f"   python test_stacklens_integration.py     # Run tests")
    print(f"   python demo_stacklens_integration.py     # Full demo")
    
    print(f"\n💡 Tips:")
    print(f"   • Start with option 1 (Quick Test) to verify everything works")
    print(f"   • Use option 2 (API Server) for production integration")
    print(f"   • The system learns automatically from new errors")
    print(f"   • All analysis results are stored back in stacklens.db")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"💥 Critical error: {e}")
        sys.exit(1)
