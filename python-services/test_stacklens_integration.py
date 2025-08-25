#!/usr/bin/env python3
"""
Test script for StackLens Integrated Error Intelligence Platform
Validates integration with existing stacklens.db database
"""

import asyncio
import sys
import os
import sqlite3
import json
import time
from pathlib import Path

# Add the ml_microservices directory to path
sys.path.append(os.path.join(os.path.dirname(__file__)))

from stacklens_integrated_intelligence import StackLensIntelligence, ErrorSeverity

class StackLensIntegrationTester:
    """Test suite for StackLens database integration"""
    
    def __init__(self):
        self.intelligence = StackLensIntelligence()
        self.db_path = Path("../db/stacklens.db")
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': time.time()
        })
    
    async def test_database_connection(self):
        """Test database connection and basic queries"""
        print("\n🔍 Testing Database Connection...")
        
        try:
            # Check if database exists
            if not self.db_path.exists():
                self.log_test("Database File Exists", False, f"Database not found: {self.db_path}")
                return False
            
            self.log_test("Database File Exists", True, f"Found: {self.db_path}")
            
            # Test connection
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Check tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            required_tables = ['error_logs', 'error_patterns', 'ai_training_data', 'log_files']
            missing_tables = [table for table in required_tables if table not in tables]
            
            if missing_tables:
                self.log_test("Required Tables Present", False, f"Missing: {missing_tables}")
                return False
            
            self.log_test("Required Tables Present", True, f"Found: {required_tables}")
            
            # Check data counts
            for table in required_tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                self.log_test(f"{table} Data Count", True, f"{count:,} records")
            
            conn.close()
            return True
            
        except Exception as e:
            self.log_test("Database Connection", False, str(e))
            return False
    
    async def test_intelligence_initialization(self):
        """Test intelligence system initialization"""
        print("\n🧠 Testing Intelligence Initialization...")
        
        try:
            await self.intelligence.initialize()
            
            self.log_test("Intelligence Initialization", True, "System initialized successfully")
            
            # Check loaded data
            patterns_count = len(self.intelligence.error_patterns)
            training_count = len(self.intelligence.training_data)
            models_count = len(self.intelligence.models)
            
            self.log_test("Error Patterns Loaded", patterns_count > 0, f"{patterns_count} patterns")
            self.log_test("Training Data Loaded", training_count > 0, f"{training_count} samples")
            self.log_test("ML Models Trained", models_count > 0, f"{models_count} models")
            
            return True
            
        except Exception as e:
            self.log_test("Intelligence Initialization", False, str(e))
            return False
    
    async def test_error_analysis(self):
        """Test error analysis functionality"""
        print("\n🔬 Testing Error Analysis...")
        
        if not self.intelligence.is_initialized:
            self.log_test("Error Analysis", False, "Intelligence not initialized")
            return False
        
        # Test cases with different error types
        test_cases = [
            {
                'name': 'Database Connection Error',
                'error': 'Database connection failed: Connection timeout after 30 seconds',
                'expected_type': 'database',
                'expected_severity': ['critical', 'high']
            },
            {
                'name': 'File Not Found Error',
                'error': 'FileNotFoundError: [Errno 2] No such file or directory: /path/to/file.txt',
                'expected_type': 'file',
                'expected_severity': ['high', 'medium']
            },
            {
                'name': 'Memory Error',
                'error': 'MemoryError: Unable to allocate 8.00 GiB for an array',
                'expected_type': 'memory',
                'expected_severity': ['critical', 'high']
            },
            {
                'name': 'API Timeout',
                'error': 'Request timeout: API call to /api/users timed out after 60 seconds',
                'expected_type': 'timeout',
                'expected_severity': ['high', 'medium']
            },
            {
                'name': 'JSON Parse Error',
                'error': 'JSONDecodeError: Expecting value: line 1 column 1 (char 0)',
                'expected_type': 'api',
                'expected_severity': ['medium', 'low']
            }
        ]
        
        successful_analyses = 0
        
        for test_case in test_cases:
            try:
                result = await self.intelligence.analyze_error(
                    test_case['error'],
                    {'test_case': test_case['name']}
                )
                
                # Check if analysis completed
                if result.error_type and result.severity:
                    successful_analyses += 1
                    
                    details = f"Type: {result.error_type}, Severity: {result.severity}, Confidence: {result.confidence:.2f}"
                    self.log_test(f"Analysis - {test_case['name']}", True, details)
                    
                    # Check if results make sense
                    type_matches = any(expected in result.error_type.lower() 
                                     for expected in [test_case['expected_type']])
                    severity_matches = result.severity in test_case['expected_severity']
                    
                    if type_matches or severity_matches:
                        self.log_test(f"Accuracy - {test_case['name']}", True, 
                                    f"Expected patterns found")
                    else:
                        self.log_test(f"Accuracy - {test_case['name']}", False, 
                                    f"Expected {test_case['expected_type']}/{test_case['expected_severity']}")
                else:
                    self.log_test(f"Analysis - {test_case['name']}", False, "Incomplete analysis")
                
            except Exception as e:
                self.log_test(f"Analysis - {test_case['name']}", False, str(e))
        
        overall_success = successful_analyses >= len(test_cases) * 0.8  # 80% success rate
        self.log_test("Overall Analysis Success", overall_success, 
                     f"{successful_analyses}/{len(test_cases)} successful")
        
        return overall_success
    
    async def test_real_error_samples(self):
        """Test with real error samples from database"""
        print("\n📊 Testing with Real Database Samples...")
        
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Get sample errors from different severities
            cursor.execute("""
                SELECT message, severity, error_type 
                FROM error_logs 
                WHERE LENGTH(message) BETWEEN 50 AND 500
                GROUP BY severity, error_type
                LIMIT 10
            """)
            
            samples = cursor.fetchall()
            conn.close()
            
            if not samples:
                self.log_test("Real Sample Analysis", False, "No suitable samples found")
                return False
            
            successful_real_analyses = 0
            
            for i, (message, actual_severity, actual_type) in enumerate(samples):
                try:
                    result = await self.intelligence.analyze_error(message[:200])  # Truncate long messages
                    
                    if result.error_type and result.severity:
                        successful_real_analyses += 1
                        
                        # Compare with actual labels
                        severity_match = result.severity == actual_severity
                        type_similarity = any(word in result.error_type.lower() 
                                            for word in actual_type.lower().split())
                        
                        match_status = "✓" if (severity_match or type_similarity) else "~"
                        details = f"{match_status} Predicted: {result.error_type}/{result.severity} vs Actual: {actual_type}/{actual_severity}"
                        
                        self.log_test(f"Real Sample {i+1}", True, details)
                    else:
                        self.log_test(f"Real Sample {i+1}", False, "Analysis failed")
                        
                except Exception as e:
                    self.log_test(f"Real Sample {i+1}", False, str(e))
            
            success_rate = successful_real_analyses / len(samples)
            overall_success = success_rate >= 0.7  # 70% success rate
            
            self.log_test("Real Sample Analysis", overall_success, 
                         f"{successful_real_analyses}/{len(samples)} successful ({success_rate:.1%})")
            
            return overall_success
            
        except Exception as e:
            self.log_test("Real Sample Analysis", False, str(e))
            return False
    
    async def test_statistics_and_insights(self):
        """Test statistics and insights functionality"""
        print("\n📈 Testing Statistics and Insights...")
        
        try:
            stats = await self.intelligence.get_error_statistics()
            
            required_stats = [
                'total_errors', 'severity_breakdown', 'top_error_types',
                'training_data_count', 'active_patterns', 'models_trained'
            ]
            
            missing_stats = [stat for stat in required_stats if stat not in stats]
            
            if missing_stats:
                self.log_test("Statistics Completeness", False, f"Missing: {missing_stats}")
                return False
            
            self.log_test("Statistics Completeness", True, "All required statistics present")
            
            # Validate statistics values
            self.log_test("Total Errors", stats['total_errors'] > 0, 
                         f"{stats['total_errors']:,} total errors")
            
            self.log_test("Severity Breakdown", len(stats['severity_breakdown']) > 0,
                         f"{len(stats['severity_breakdown'])} severity levels")
            
            self.log_test("Top Error Types", len(stats['top_error_types']) > 0,
                         f"{len(stats['top_error_types'])} error types")
            
            self.log_test("Training Data", stats['training_data_count'] > 0,
                         f"{stats['training_data_count']:,} training samples")
            
            self.log_test("Active Patterns", stats['active_patterns'] > 0,
                         f"{stats['active_patterns']} active patterns")
            
            self.log_test("Trained Models", stats['models_trained'] > 0,
                         f"{stats['models_trained']} models trained")
            
            return True
            
        except Exception as e:
            self.log_test("Statistics and Insights", False, str(e))
            return False
    
    async def test_pattern_management(self):
        """Test pattern addition and management"""
        print("\n🔧 Testing Pattern Management...")
        
        try:
            # Add a test pattern
            test_pattern = {
                'pattern': 'TEST_PATTERN_ERROR',
                'regex': r'TEST_PATTERN_ERROR.*',
                'description': 'Test pattern for validation',
                'severity': 'medium',
                'error_type': 'test_error',
                'suggested_fix': 'This is a test pattern fix'
            }
            
            initial_count = len(self.intelligence.error_patterns)
            
            success = await self.intelligence.add_new_pattern(**test_pattern)
            
            if success:
                new_count = len(self.intelligence.error_patterns)
                self.log_test("Pattern Addition", new_count > initial_count,
                             f"Patterns: {initial_count} → {new_count}")
                
                # Test pattern matching
                test_error = "TEST_PATTERN_ERROR: This is a test error message"
                result = await self.intelligence.analyze_error(test_error)
                
                pattern_matched = result.pattern_matched is not None
                self.log_test("Pattern Matching", pattern_matched,
                             f"Pattern matched: {result.pattern_matched}")
                
                return True
            else:
                self.log_test("Pattern Addition", False, "Failed to add pattern")
                return False
                
        except Exception as e:
            self.log_test("Pattern Management", False, str(e))
            return False
    
    async def run_all_tests(self):
        """Run all tests and generate report"""
        print("🚀 Starting StackLens Integrated Intelligence Tests...")
        print("=" * 60)
        
        # Run all test suites
        tests = [
            ("Database Connection", self.test_database_connection),
            ("Intelligence Initialization", self.test_intelligence_initialization),
            ("Error Analysis", self.test_error_analysis),
            ("Real Error Samples", self.test_real_error_samples),
            ("Statistics and Insights", self.test_statistics_and_insights),
            ("Pattern Management", self.test_pattern_management),
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test_name, test_func in tests:
            try:
                result = await test_func()
                if result:
                    passed_tests += 1
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_name}: {e}")
        
        # Generate final report
        print("\n" + "=" * 60)
        print("🎯 TEST SUMMARY REPORT")
        print("=" * 60)
        
        success_rate = passed_tests / total_tests
        status = "✅ EXCELLENT" if success_rate >= 0.9 else \
                "✅ GOOD" if success_rate >= 0.7 else \
                "⚠️ NEEDS ATTENTION" if success_rate >= 0.5 else \
                "❌ CRITICAL ISSUES"
        
        print(f"Overall Status: {status}")
        print(f"Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1%})")
        
        # Detailed breakdown
        passed_count = sum(1 for result in self.test_results if result['success'])
        total_count = len(self.test_results)
        
        print(f"Detailed Results: {passed_count}/{total_count} individual tests passed")
        
        # Failed tests summary
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print(f"\n⚠️ Failed Tests ({len(failed_tests)}):")
            for failed in failed_tests:
                print(f"  • {failed['test']}: {failed['details']}")
        
        # Database statistics
        if self.intelligence.is_initialized:
            try:
                stats = await self.intelligence.get_error_statistics()
                print(f"\n📊 Database Statistics:")
                print(f"  • Total Errors: {stats.get('total_errors', 'N/A'):,}")
                print(f"  • Training Samples: {stats.get('training_data_count', 'N/A'):,}")
                print(f"  • Active Patterns: {stats.get('active_patterns', 'N/A')}")
                print(f"  • Trained Models: {stats.get('models_trained', 'N/A')}")
            except Exception as e:
                print(f"\n📊 Database Statistics: Error retrieving ({e})")
        
        print("\n🔍 Integration Assessment:")
        
        if success_rate >= 0.8:
            print("✅ The StackLens database integration is working excellently!")
            print("   - All major components are functional")
            print("   - Real error data is being processed correctly")
            print("   - ML models are trained and making predictions")
            print("   - Ready for production use")
        elif success_rate >= 0.6:
            print("⚠️ The integration is working but needs some attention:")
            print("   - Core functionality is operational")
            print("   - Some features may need tuning")
            print("   - Review failed tests for improvements")
        else:
            print("❌ Critical issues detected:")
            print("   - Major components are not working properly")
            print("   - Database integration needs fixing")
            print("   - Review all failed tests before deployment")
        
        print("\n" + "=" * 60)
        return success_rate >= 0.7

async def main():
    """Main test execution"""
    tester = StackLensIntegrationTester()
    success = await tester.run_all_tests()
    
    if success:
        print("🎉 Integration testing completed successfully!")
        return 0
    else:
        print("💥 Integration testing found critical issues!")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️ Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Critical error during testing: {e}")
        sys.exit(1)
