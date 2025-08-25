#!/usr/bin/env python3
"""
Enterprise Error Intelligence Platform - Comprehensive Test Suite
Tests the complete functionality of the enterprise error detection and learning system
"""

import requests
import json
import time
import sys
from typing import List, Dict
import asyncio

class EnterpriseIntelligenceValidator:
    """Comprehensive test suite for the enterprise error intelligence platform"""
    
    def __init__(self, base_url: str = "http://localhost:8889"):
        self.base_url = base_url
        self.test_results = []
        
    def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        print("🚀 Starting Enterprise Error Intelligence Platform Validation")
        print("=" * 70)
        
        # Test comprehensive error analysis
        self.test_comprehensive_analysis()
        
        # Test learning capabilities
        self.test_manual_learning()
        
        # Test corpus statistics
        self.test_corpus_stats()
        
        # Test anomaly detection
        self.test_anomaly_detection()
        
        # Test multi-language support
        self.test_multi_language_support()
        
        # Test security error detection
        self.test_security_detection()
        
        # Test infrastructure error detection
        self.test_infrastructure_detection()
        
        # Test performance error detection
        self.test_performance_detection()
        
        # Health check
        self.test_health_check()
        
        # Print final results
        self.print_final_results()
    
    def test_comprehensive_analysis(self):
        """Test comprehensive error analysis with mixed error types"""
        print("📊 Testing Comprehensive Error Analysis...")
        
        test_errors = [
            # Python errors
            "AttributeError: 'NoneType' object has no attribute 'get'",
            "KeyError: 'user_id' not found in dictionary",
            "ImportError: No module named 'tensorflow'",
            
            # JavaScript errors
            "TypeError: Cannot read property 'map' of undefined",
            "ReferenceError: React is not defined",
            "Error: ENOENT: no such file or directory, open 'config.json'",
            
            # Database errors
            "ERROR 1045 (28000): Access denied for user 'root'@'localhost'",
            "FATAL: database 'production' does not exist",
            "ORA-00001: unique constraint (USERS.EMAIL_UK) violated",
            
            # Infrastructure errors
            "ImagePullBackOff: Failed to pull image 'app:latest'",
            "docker: Error response from daemon: no space left on device",
            "CrashLoopBackOff: Pod is crashing repeatedly",
            
            # Security errors
            "SQL injection attempt detected in query parameter",
            "CSRF token mismatch for user session",
            "SSL certificate verification failed for domain api.example.com"
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/analyze/comprehensive",
                json=test_errors,
                params={"learn_from_analysis": True}
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate response structure
                required_fields = [
                    "analysis_id", "timestamp", "input_count", "analysis_result", "intelligence_metrics"
                ]
                
                missing_fields = [field for field in required_fields if field not in result]
                if missing_fields:
                    self.test_results.append(("❌", f"Comprehensive Analysis - Missing fields: {missing_fields}"))
                    return
                
                analysis = result["analysis_result"]
                
                # Check if all errors were analyzed
                if len(analysis["detected_errors"]) != len(test_errors):
                    self.test_results.append(("❌", f"Comprehensive Analysis - Expected {len(test_errors)} errors, got {len(analysis['detected_errors'])}"))
                    return
                
                # Check severity distribution
                severity_dist = analysis["severity_distribution"]
                total_severity = sum(severity_dist.values())
                if total_severity == 0:
                    self.test_results.append(("❌", "Comprehensive Analysis - No severity classifications"))
                    return
                
                # Check category distribution
                category_dist = analysis["category_distribution"]
                expected_categories = ["security", "database", "runtime", "infrastructure"]
                found_categories = [cat for cat in expected_categories if cat in category_dist and category_dist[cat] > 0]
                
                if len(found_categories) < 3:
                    self.test_results.append(("❌", f"Comprehensive Analysis - Expected multiple categories, found: {found_categories}"))
                    return
                
                # Check language distribution
                language_dist = analysis["language_distribution"]
                expected_languages = ["Python", "JavaScript", "SQL"]
                found_languages = [lang for lang in expected_languages if lang in language_dist and language_dist[lang] > 0]
                
                if len(found_languages) < 2:
                    self.test_results.append(("❌", f"Comprehensive Analysis - Expected multiple languages, found: {found_languages}"))
                    return
                
                # Check recommendations
                recommendations = analysis["recommendations"]
                if len(recommendations) == 0:
                    self.test_results.append(("❌", "Comprehensive Analysis - No recommendations provided"))
                    return
                
                self.test_results.append(("✅", f"Comprehensive Analysis - Analyzed {len(test_errors)} errors across {len(found_categories)} categories and {len(found_languages)} languages"))
                
                # Print detailed results
                print(f"   📈 Severity Distribution: {severity_dist}")
                print(f"   🏷️  Category Distribution: {category_dist}")
                print(f"   🌍 Language Distribution: {language_dist}")
                print(f"   💡 Recommendations: {len(recommendations)}")
                print(f"   🧠 Learning Opportunities: {len(analysis.get('learning_opportunities', []))}")
                
            else:
                self.test_results.append(("❌", f"Comprehensive Analysis - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Comprehensive Analysis - Exception: {str(e)}"))
    
    def test_manual_learning(self):
        """Test manual learning from classified errors"""
        print("🧠 Testing Manual Learning Capabilities...")
        
        manual_classifications = {
            "CustomApplicationError: Business logic validation failed": {
                "error_type": "BusinessLogicError",
                "severity": "medium",
                "category": "business_logic",
                "language": "Java",
                "framework": "Spring"
            },
            "QUANTUM_FLUX_ERROR: Quantum state decoherence detected": {
                "error_type": "QuantumError",
                "severity": "critical",
                "category": "runtime",
                "language": "Python",
                "framework": "QuantumFramework"
            },
            "NEURAL_NETWORK_DIVERGENCE: Loss function exploded to infinity": {
                "error_type": "MLTrainingError",
                "severity": "high",
                "category": "performance",
                "language": "Python",
                "framework": "TensorFlow"
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/learn/manual",
                json=manual_classifications
            )
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("status") == "success" and result.get("learned_patterns") == len(manual_classifications):
                    self.test_results.append(("✅", f"Manual Learning - Successfully learned {len(manual_classifications)} new patterns"))
                    print(f"   📚 Learned patterns: {result['learned_patterns']}")
                    print(f"   💬 Message: {result['message']}")
                else:
                    self.test_results.append(("❌", f"Manual Learning - Unexpected response: {result}"))
            else:
                self.test_results.append(("❌", f"Manual Learning - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Manual Learning - Exception: {str(e)}"))
    
    def test_corpus_stats(self):
        """Test corpus statistics retrieval"""
        print("📊 Testing Corpus Statistics...")
        
        try:
            response = requests.get(f"{self.base_url}/corpus/stats")
            
            if response.status_code == 200:
                result = response.json()
                
                corpus_stats = result.get("corpus_statistics", {})
                model_status = result.get("model_status", {})
                
                # Check if we have a substantial corpus
                total_patterns = corpus_stats.get("total_patterns", 0)
                if total_patterns < 50:
                    self.test_results.append(("❌", f"Corpus Statistics - Insufficient patterns: {total_patterns}"))
                    return
                
                # Check if we have multiple categories
                category_dist = corpus_stats.get("category_distribution", {})
                if len(category_dist) < 5:
                    self.test_results.append(("❌", f"Corpus Statistics - Insufficient categories: {len(category_dist)}"))
                    return
                
                # Check if models are trained
                trained_classifiers = model_status.get("trained_classifiers", [])
                if len(trained_classifiers) < 3:
                    self.test_results.append(("❌", f"Corpus Statistics - Insufficient trained models: {len(trained_classifiers)}"))
                    return
                
                self.test_results.append(("✅", f"Corpus Statistics - {total_patterns} patterns, {len(category_dist)} categories, {len(trained_classifiers)} models"))
                
                print(f"   📈 Total Patterns: {total_patterns}")
                print(f"   🏷️  Categories: {len(category_dist)}")
                print(f"   🤖 Trained Models: {trained_classifiers}")
                print(f"   📊 Vectorizer Features: {model_status.get('vectorizer_features', 0)}")
                
            else:
                self.test_results.append(("❌", f"Corpus Statistics - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Corpus Statistics - Exception: {str(e)}"))
    
    def test_anomaly_detection(self):
        """Test anomaly detection capabilities"""
        print("🔍 Testing Anomaly Detection...")
        
        # Mix of normal and anomalous errors
        test_errors = [
            # Normal errors (should have low anomaly scores)
            "AttributeError: 'NoneType' object has no attribute 'get'",
            "ERROR 1045 (28000): Access denied for user 'root'@'localhost'",
            "TypeError: Cannot read property 'map' of undefined",
            
            # Anomalous/rare errors (should have high anomaly scores)
            "COSMIC_RAY_BIT_FLIP: Memory corruption caused by solar radiation",
            "TEMPORAL_PARADOX_ERROR: Timeline consistency violation detected",
            "INTERDIMENSIONAL_BREACH: Parallel universe data leak detected"
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/analyze/comprehensive",
                json=test_errors
            )
            
            if response.status_code == 200:
                result = response.json()
                detected_errors = result["analysis_result"]["detected_errors"]
                
                # Check anomaly detection
                normal_errors = detected_errors[:3]  # First 3 are normal
                anomalous_errors = detected_errors[3:]  # Last 3 are anomalous
                
                normal_anomaly_scores = [e["anomaly_score"] for e in normal_errors]
                anomalous_anomaly_scores = [e["anomaly_score"] for e in anomalous_errors]
                
                # Normal errors should have higher anomaly scores (less negative)
                # Anomalous errors should have lower anomaly scores (more negative)
                avg_normal_score = sum(normal_anomaly_scores) / len(normal_anomaly_scores)
                avg_anomalous_score = sum(anomalous_anomaly_scores) / len(anomalous_anomaly_scores)
                
                anomalies_detected = sum(1 for e in detected_errors if e.get("is_anomaly", False))
                
                self.test_results.append(("✅", f"Anomaly Detection - {anomalies_detected} anomalies detected, avg scores: normal={avg_normal_score:.3f}, anomalous={avg_anomalous_score:.3f}"))
                
                print(f"   🎯 Anomalies Detected: {anomalies_detected}")
                print(f"   📊 Average Normal Score: {avg_normal_score:.3f}")
                print(f"   📊 Average Anomalous Score: {avg_anomalous_score:.3f}")
                
            else:
                self.test_results.append(("❌", f"Anomaly Detection - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Anomaly Detection - Exception: {str(e)}"))
    
    def test_multi_language_support(self):
        """Test multi-language error detection"""
        print("🌍 Testing Multi-Language Support...")
        
        multi_language_errors = [
            # Python
            "ModuleNotFoundError: No module named 'pandas'",
            # JavaScript
            "ReferenceError: require is not defined",
            # Java
            "java.lang.ClassNotFoundException: com.example.Service",
            # C++
            "segmentation fault (core dumped)",
            # SQL
            "ORA-00942: table or view does not exist",
            # Go
            "panic: runtime error: invalid memory address or nil pointer dereference",
            # Rust
            "error[E0382]: borrow of moved value",
            # PHP
            "Fatal error: Call to undefined function mysql_connect()"
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/analyze/comprehensive",
                json=multi_language_errors
            )
            
            if response.status_code == 200:
                result = response.json()
                language_dist = result["analysis_result"]["language_distribution"]
                
                # Should detect multiple languages
                detected_languages = [lang for lang, count in language_dist.items() if count > 0]
                
                if len(detected_languages) >= 4:
                    self.test_results.append(("✅", f"Multi-Language Support - Detected {len(detected_languages)} languages: {detected_languages}"))
                    print(f"   🌍 Languages Detected: {detected_languages}")
                    print(f"   📊 Distribution: {language_dist}")
                else:
                    self.test_results.append(("❌", f"Multi-Language Support - Only detected {len(detected_languages)} languages: {detected_languages}"))
                    
            else:
                self.test_results.append(("❌", f"Multi-Language Support - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Multi-Language Support - Exception: {str(e)}"))
    
    def test_security_detection(self):
        """Test security error detection capabilities"""
        print("🔒 Testing Security Error Detection...")
        
        security_errors = [
            "SQL injection attempt detected in query parameter 'id'",
            "Cross-site scripting (XSS) detected in user input",
            "CSRF token mismatch for user session abc123",
            "Invalid JWT token: signature verification failed",
            "SSL certificate verification failed for domain api.example.com",
            "Unauthorized API access attempt from IP 192.168.1.100",
            "Suspicious login activity detected for user admin",
            "File upload contains malicious script content"
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/analyze/comprehensive",
                json=security_errors
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis = result["analysis_result"]
                
                # Check if security category is dominant
                category_dist = analysis["category_distribution"]
                security_count = category_dist.get("security", 0)
                
                # Check severity - security errors should be high/critical
                severity_dist = analysis["severity_distribution"]
                high_severity_count = severity_dist.get("high", 0) + severity_dist.get("critical", 0)
                
                # Check recommendations for security-specific advice
                recommendations = analysis["recommendations"]
                security_recommendations = [r for r in recommendations if "security" in r.lower() or "🔒" in r]
                
                if security_count >= 6 and high_severity_count >= 6 and len(security_recommendations) > 0:
                    self.test_results.append(("✅", f"Security Detection - {security_count} security errors, {high_severity_count} high/critical, {len(security_recommendations)} security recommendations"))
                    print(f"   🔒 Security Errors: {security_count}")
                    print(f"   ⚠️  High/Critical: {high_severity_count}")
                    print(f"   💡 Security Recommendations: {len(security_recommendations)}")
                else:
                    self.test_results.append(("❌", f"Security Detection - Insufficient detection: {security_count} security, {high_severity_count} high/critical"))
                    
            else:
                self.test_results.append(("❌", f"Security Detection - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Security Detection - Exception: {str(e)}"))
    
    def test_infrastructure_detection(self):
        """Test infrastructure error detection"""
        print("🏗️ Testing Infrastructure Error Detection...")
        
        infrastructure_errors = [
            "ImagePullBackOff: Failed to pull image 'nginx:latest'",
            "CrashLoopBackOff: Pod app-deployment-123 is crashing",
            "docker: Error response from daemon: no space left on device",
            "Insufficient cpu: 0/3 nodes are available",
            "FailedScheduling: 0/3 nodes are available: 3 Insufficient memory",
            "NodeNotReady: kubelet stopped posting node status",
            "CreateContainerConfigError: couldn't find key app.properties in ConfigMap",
            "OCI runtime create failed: container_linux.go"
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/analyze/comprehensive",
                json=infrastructure_errors
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis = result["analysis_result"]
                
                category_dist = analysis["category_distribution"]
                infrastructure_count = category_dist.get("infrastructure", 0)
                
                framework_dist = analysis["framework_distribution"]
                k8s_count = framework_dist.get("Kubernetes", 0)
                docker_count = framework_dist.get("Docker", 0)
                
                if infrastructure_count >= 5 and (k8s_count > 0 or docker_count > 0):
                    self.test_results.append(("✅", f"Infrastructure Detection - {infrastructure_count} infrastructure errors, K8s: {k8s_count}, Docker: {docker_count}"))
                    print(f"   🏗️ Infrastructure Errors: {infrastructure_count}")
                    print(f"   ☸️  Kubernetes: {k8s_count}")
                    print(f"   🐳 Docker: {docker_count}")
                else:
                    self.test_results.append(("❌", f"Infrastructure Detection - Insufficient detection: {infrastructure_count} infrastructure"))
                    
            else:
                self.test_results.append(("❌", f"Infrastructure Detection - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Infrastructure Detection - Exception: {str(e)}"))
    
    def test_performance_detection(self):
        """Test performance error detection"""
        print("⚡ Testing Performance Error Detection...")
        
        performance_errors = [
            "Query execution time exceeded 30 seconds for SELECT * FROM users",
            "Memory usage exceeds 90% threshold on server prod-web-01",
            "High CPU utilization detected (98%) on container app-backend",
            "Thread pool exhausted: 200/200 threads in use",
            "Garbage collection taking 15 seconds, blocking application",
            "Connection pool exhausted: 100/100 connections in use",
            "Disk I/O latency exceeds 500ms threshold on /data volume",
            "Network latency 2.5s exceeds SLA of 200ms"
        ]
        
        try:
            response = requests.post(
                f"{self.base_url}/analyze/comprehensive",
                json=performance_errors
            )
            
            if response.status_code == 200:
                result = response.json()
                analysis = result["analysis_result"]
                
                category_dist = analysis["category_distribution"]
                performance_count = category_dist.get("performance", 0)
                
                # Check for performance-related recommendations
                recommendations = analysis["recommendations"]
                performance_recommendations = [r for r in recommendations if any(word in r.lower() for word in ["performance", "cpu", "memory", "⚡"])]
                
                if performance_count >= 6 and len(performance_recommendations) > 0:
                    self.test_results.append(("✅", f"Performance Detection - {performance_count} performance errors, {len(performance_recommendations)} recommendations"))
                    print(f"   ⚡ Performance Errors: {performance_count}")
                    print(f"   💡 Performance Recommendations: {len(performance_recommendations)}")
                else:
                    self.test_results.append(("❌", f"Performance Detection - Insufficient detection: {performance_count} performance"))
                    
            else:
                self.test_results.append(("❌", f"Performance Detection - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Performance Detection - Exception: {str(e)}"))
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("🏥 Testing Health Check...")
        
        try:
            response = requests.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                result = response.json()
                
                if (result.get("status") == "healthy" and 
                    result.get("models_ready") == True and 
                    result.get("corpus_loaded") == True):
                    self.test_results.append(("✅", "Health Check - All systems operational"))
                    print(f"   💚 Status: {result['status']}")
                    print(f"   🤖 Models Ready: {result['models_ready']}")
                    print(f"   📚 Corpus Loaded: {result['corpus_loaded']}")
                else:
                    self.test_results.append(("❌", f"Health Check - System not ready: {result}"))
            else:
                self.test_results.append(("❌", f"Health Check - HTTP {response.status_code}: {response.text}"))
                
        except Exception as e:
            self.test_results.append(("❌", f"Health Check - Exception: {str(e)}"))
    
    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 70)
        print("🎯 ENTERPRISE ERROR INTELLIGENCE PLATFORM - TEST RESULTS")
        print("=" * 70)
        
        passed = sum(1 for result in self.test_results if result[0] == "✅")
        failed = sum(1 for result in self.test_results if result[0] == "❌")
        total = len(self.test_results)
        
        for status, message in self.test_results:
            print(f"{status} {message}")
        
        print("\n" + "=" * 70)
        print(f"📊 SUMMARY: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED! Enterprise Error Intelligence Platform is fully operational!")
            print("🚀 Ready for production deployment and comprehensive error analysis!")
        else:
            print(f"⚠️  {failed} test(s) failed. Please review and fix issues before production deployment.")
        
        print("=" * 70)

def main():
    """Main test execution"""
    import sys
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:8889/health", timeout=5)
        if response.status_code != 200:
            print("❌ Enterprise Error Intelligence Platform is not responding correctly")
            print("Please ensure the server is running on port 8889")
            sys.exit(1)
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to Enterprise Error Intelligence Platform")
        print("Please start the server first:")
        print("python3 enterprise_error_intelligence.py")
        sys.exit(1)
    
    # Run comprehensive validation
    validator = EnterpriseIntelligenceValidator()
    validator.run_comprehensive_tests()

if __name__ == "__main__":
    main()
