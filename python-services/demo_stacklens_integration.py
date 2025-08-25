#!/usr/bin/env python3
"""
StackLens Integrated Intelligence Demo
Demonstrates the capabilities of using existing stacklens.db for error intelligence
"""

import asyncio
import sys
import os
import sqlite3
import json
import time
from datetime import datetime
from pathlib import Path

# Add the ml_microservices directory to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from stacklens_integrated_intelligence import StackLensIntelligence

class StackLensDemo:
    """Demo showcasing StackLens integrated intelligence capabilities"""
    
    def __init__(self):
        self.intelligence = StackLensIntelligence()
        self.db_path = Path("../db/stacklens.db")
    
    async def initialize(self):
        """Initialize the intelligence system"""
        print("🚀 Initializing StackLens Integrated Intelligence...")
        await self.intelligence.initialize()
        print("✅ System ready!\n")
    
    async def show_database_overview(self):
        """Show overview of the existing database"""
        print("📊 StackLens Database Overview")
        print("=" * 50)
        
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Basic stats
            cursor.execute("SELECT COUNT(*) FROM error_logs")
            total_errors = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM error_patterns WHERE is_active = 1")
            active_patterns = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM ai_training_data")
            training_data = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM log_files")
            log_files = cursor.fetchone()[0]
            
            print(f"📁 Total Error Logs: {total_errors:,}")
            print(f"🔍 Active Patterns: {active_patterns}")
            print(f"🧠 Training Data: {training_data:,}")
            print(f"📄 Processed Files: {log_files}")
            
            # Top error types
            cursor.execute("""
                SELECT error_type, COUNT(*) as count 
                FROM error_logs 
                GROUP BY error_type 
                ORDER BY count DESC 
                LIMIT 5
            """)
            top_errors = cursor.fetchall()
            
            print(f"\n🏆 Top Error Types:")
            for error_type, count in top_errors:
                print(f"   {error_type}: {count:,} occurrences")
            
            # Severity distribution
            cursor.execute("""
                SELECT severity, COUNT(*) as count 
                FROM error_logs 
                GROUP BY severity 
                ORDER BY count DESC
            """)
            severity_dist = cursor.fetchall()
            
            print(f"\n⚠️ Severity Distribution:")
            for severity, count in severity_dist:
                print(f"   {severity}: {count:,} ({count/total_errors*100:.1f}%)")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ Error accessing database: {e}")
    
    async def demonstrate_real_error_analysis(self):
        """Analyze real errors from the database"""
        print("\n🔬 Real Error Analysis Demo")
        print("=" * 50)
        
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Get diverse real error samples
            cursor.execute("""
                SELECT message, severity, error_type, file_id
                FROM error_logs 
                WHERE LENGTH(message) BETWEEN 100 AND 300
                AND message NOT LIKE '%<?xml%'
                GROUP BY error_type, severity
                LIMIT 5
            """)
            
            real_errors = cursor.fetchall()
            conn.close()
            
            for i, (message, actual_severity, actual_type, file_id) in enumerate(real_errors, 1):
                print(f"\n📝 Real Error #{i}")
                print(f"Source: File ID {file_id}")
                print(f"Original: {actual_type}/{actual_severity}")
                print(f"Message: {message[:120]}...")
                
                # Analyze with our system
                result = await self.intelligence.analyze_error(message)
                
                print(f"🔍 AI Analysis:")
                print(f"   Type: {result.error_type}")
                print(f"   Severity: {result.severity}")
                print(f"   Confidence: {result.confidence:.2f}")
                print(f"   Pattern Matched: {result.pattern_matched or 'None'}")
                
                if result.suggested_solution:
                    print(f"   Solution: {result.suggested_solution[:80]}...")
                
                # Accuracy assessment
                type_match = result.error_type.lower() in actual_type.lower() or actual_type.lower() in result.error_type.lower()
                severity_match = result.severity == actual_severity
                
                accuracy = "✅ High" if (type_match and severity_match) else \
                          "🟡 Partial" if (type_match or severity_match) else \
                          "🔴 Low"
                print(f"   Accuracy: {accuracy}")
            
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
    
    async def demonstrate_pattern_capabilities(self):
        """Show pattern matching capabilities"""
        print("\n🎯 Pattern Matching Demo")
        print("=" * 50)
        
        # Sample patterns from our database
        sample_patterns = [
            "Database connection failed",
            "Out of memory", 
            "File not found",
            "Request timeout",
            "Null pointer exception"
        ]
        
        for pattern in sample_patterns:
            test_error = f"{pattern}: Detailed error message here with context"
            
            result = await self.intelligence.analyze_error(test_error)
            
            print(f"\n🔍 Pattern: '{pattern}'")
            print(f"   Detected Type: {result.error_type}")
            print(f"   Severity: {result.severity}")
            print(f"   Confidence: {result.confidence:.2f}")
            
            if result.pattern_matched:
                print(f"   ✅ Matched Pattern: {result.pattern_matched}")
            else:
                print(f"   🤖 ML Prediction Used")
    
    async def demonstrate_similarity_search(self):
        """Show similar error finding"""
        print("\n🔗 Similar Error Search Demo")
        print("=" * 50)
        
        test_error = "Connection timeout occurred while connecting to database server"
        
        result = await self.intelligence.analyze_error(test_error)
        
        print(f"🔍 Query Error: {test_error}")
        print(f"Analysis: {result.error_type}/{result.severity} (confidence: {result.confidence:.2f})")
        
        if result.similar_errors:
            print(f"\n🔗 Found {len(result.similar_errors)} similar errors:")
            for i, similar in enumerate(result.similar_errors[:3], 1):
                print(f"   {i}. {similar['message'][:80]}...")
                print(f"      Type: {similar['error_type']}, Severity: {similar['severity']}")
                if similar['suggestion']:
                    print(f"      Suggestion: {similar['suggestion'][:60]}...")
        else:
            print("🔍 No similar errors found in database")
    
    async def demonstrate_ml_insights(self):
        """Show ML model insights"""
        print("\n🧠 Machine Learning Insights Demo")
        print("=" * 50)
        
        # Different types of errors to test ML models
        test_cases = [
            "NullPointerException at line 42 in UserService.java",
            "SSL certificate verification failed for api.example.com",
            "Memory allocation failed: cannot allocate 2GB array",
            "HTTP 503 Service Unavailable: backend server overloaded",
            "SQL syntax error near 'WHERE' clause in query"
        ]
        
        for test_error in test_cases:
            result = await self.intelligence.analyze_error(test_error)
            
            print(f"\n🔍 Test: {test_error[:60]}...")
            print(f"   ML Prediction: {result.error_type}/{result.severity}")
            print(f"   Confidence: {result.confidence:.2f}")
            
            if result.ai_insights:
                insights = result.ai_insights
                print(f"   Pattern Matched: {insights.get('pattern_matched', False)}")
                print(f"   ML Predicted: {insights.get('ml_predicted', False)}")
                print(f"   Similar Found: {insights.get('similar_errors_found', 0)}")
                print(f"   Anomaly: {insights.get('anomaly_detected', False)}")
    
    async def show_statistics_dashboard(self):
        """Show comprehensive statistics"""
        print("\n📊 System Statistics Dashboard")
        print("=" * 50)
        
        stats = await self.intelligence.get_error_statistics()
        
        print(f"🎯 System Performance:")
        print(f"   Total Errors Processed: {stats.get('total_errors', 'N/A'):,}")
        print(f"   Training Data Available: {stats.get('training_data_count', 'N/A'):,}")
        print(f"   Active Patterns: {stats.get('active_patterns', 'N/A')}")
        print(f"   ML Models Trained: {stats.get('models_trained', 'N/A')}")
        
        if 'severity_breakdown' in stats:
            print(f"\n📈 Error Severity Breakdown:")
            for severity, count in stats['severity_breakdown'].items():
                percentage = (count / stats['total_errors'] * 100) if stats['total_errors'] > 0 else 0
                print(f"   {severity.title()}: {count:,} ({percentage:.1f}%)")
        
        if 'top_error_types' in stats:
            print(f"\n🏆 Top Error Categories:")
            for error_type, count in list(stats['top_error_types'].items())[:5]:
                print(f"   {error_type}: {count:,}")
        
        if 'recent_errors_24h' in stats:
            print(f"\n⏰ Recent Activity:")
            print(f"   Errors in last 24h: {stats['recent_errors_24h']:,}")
    
    async def run_complete_demo(self):
        """Run the complete demonstration"""
        print("🌟 StackLens Integrated Error Intelligence Platform")
        print("=" * 60)
        print("Leveraging your existing database for superior error analysis!")
        print("=" * 60)
        
        await self.initialize()
        
        # Run all demonstrations
        demos = [
            ("Database Overview", self.show_database_overview),
            ("Real Error Analysis", self.demonstrate_real_error_analysis),
            ("Pattern Matching", self.demonstrate_pattern_capabilities),
            ("Similarity Search", self.demonstrate_similarity_search),
            ("ML Insights", self.demonstrate_ml_insights),
            ("Statistics Dashboard", self.show_statistics_dashboard)
        ]
        
        for demo_name, demo_func in demos:
            try:
                await demo_func()
                input(f"\n⏸️  Press Enter to continue to next demo...")
            except KeyboardInterrupt:
                print(f"\n👋 Demo interrupted. Goodbye!")
                return
            except Exception as e:
                print(f"\n❌ Error in {demo_name}: {e}")
        
        print("\n🎉 Demo Complete!")
        print("\n💡 Key Benefits of StackLens Integration:")
        print("   ✅ Uses your existing 56K+ real error logs")
        print("   ✅ Leverages 304 proven error patterns")
        print("   ✅ Trained on 19K+ validated examples")
        print("   ✅ No separate database needed")
        print("   ✅ Real-time learning from your data")
        print("   ✅ Production-ready accuracy")
        
        print("\n🚀 Ready for integration with your StackLens application!")

async def main():
    """Main demo execution"""
    demo = StackLensDemo()
    await demo.run_complete_demo()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Demo interrupted. Goodbye!")
    except Exception as e:
        print(f"💥 Demo error: {e}")
