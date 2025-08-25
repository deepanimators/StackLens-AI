#!/usr/bin/env python3
"""
Integration test script for StackLens AI Deep Learning Microservices
Tests all services and their interactions
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, List

class MicroserviceIntegrationTest:
    """Test suite for all microservices"""
    
    def __init__(self):
        self.base_urls = {
            'embeddings': 'http://localhost:8000',
            'ner': 'http://localhost:8001',
            'summarization': 'http://localhost:8002',
            'semantic_search': 'http://localhost:8003',
            'anomaly': 'http://localhost:8004',
            'vector_db': 'http://localhost:8005',
            'deep_learning': 'http://localhost:8006',
            'active_learning': 'http://localhost:8007'
        }
        self.test_results = {}
    
    async def test_service_health(self, session: aiohttp.ClientSession):
        """Test health endpoints of all services"""
        print("🔍 Testing service health...")
        
        for service, url in self.base_urls.items():
            try:
                async with session.get(f"{url}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ {service}: {data.get('status', 'unknown')}")
                        self.test_results[f"{service}_health"] = True
                    else:
                        print(f"❌ {service}: HTTP {response.status}")
                        self.test_results[f"{service}_health"] = False
            except Exception as e:
                print(f"❌ {service}: Connection failed - {e}")
                self.test_results[f"{service}_health"] = False
    
    async def test_embeddings_service(self, session: aiohttp.ClientSession):
        """Test embeddings and clustering"""
        print("🔍 Testing embeddings service...")
        
        test_data = {
            "sentences": [
                "Database connection timeout error",
                "Memory allocation failed",
                "Network socket closed unexpectedly"
            ]
        }
        
        try:
            # Test embeddings
            async with session.post(f"{self.base_urls['embeddings']}/embed", 
                                  json=test_data) as response:
                if response.status == 200:
                    data = await response.json()
                    embeddings = data.get('embeddings', [])
                    if embeddings and len(embeddings) == 3:
                        print("✅ Embeddings generation successful")
                        self.test_results['embeddings_generation'] = True
                        
                        # Test clustering
                        cluster_data = {"embeddings": embeddings, "n_clusters": 2}
                        async with session.post(f"{self.base_urls['embeddings']}/cluster",
                                              json=cluster_data) as cluster_response:
                            if cluster_response.status == 200:
                                cluster_result = await cluster_response.json()
                                if 'labels' in cluster_result:
                                    print("✅ Clustering successful")
                                    self.test_results['clustering'] = True
                                else:
                                    print("❌ Clustering failed: No labels returned")
                                    self.test_results['clustering'] = False
                            else:
                                print(f"❌ Clustering failed: HTTP {cluster_response.status}")
                                self.test_results['clustering'] = False
                    else:
                        print("❌ Embeddings generation failed: Invalid response")
                        self.test_results['embeddings_generation'] = False
                else:
                    print(f"❌ Embeddings service failed: HTTP {response.status}")
                    self.test_results['embeddings_generation'] = False
        except Exception as e:
            print(f"❌ Embeddings service error: {e}")
            self.test_results['embeddings_generation'] = False
            self.test_results['clustering'] = False
    
    async def test_semantic_search(self, session: aiohttp.ClientSession):
        """Test semantic search functionality"""
        print("🔍 Testing semantic search...")
        
        test_data = {
            "query": "database error",
            "corpus": [
                "Database connection timeout",
                "Memory allocation failed", 
                "Network connection refused",
                "SQL query execution error",
                "File not found exception"
            ]
        }
        
        try:
            async with session.post(f"{self.base_urls['semantic_search']}/semantic-search",
                                  json=test_data) as response:
                if response.status == 200:
                    data = await response.json()
                    results = data.get('results', [])
                    if results and len(results) > 0:
                        print(f"✅ Semantic search successful: {len(results)} results")
                        self.test_results['semantic_search'] = True
                    else:
                        print("❌ Semantic search failed: No results")
                        self.test_results['semantic_search'] = False
                else:
                    print(f"❌ Semantic search failed: HTTP {response.status}")
                    self.test_results['semantic_search'] = False
        except Exception as e:
            print(f"❌ Semantic search error: {e}")
            self.test_results['semantic_search'] = False
    
    async def test_anomaly_detection(self, session: aiohttp.ClientSession):
        """Test anomaly detection"""
        print("🔍 Testing anomaly detection...")
        
        # First train the model
        train_data = {
            "sentences": [
                "Normal database operation",
                "Successful file read",
                "Network connection established",
                "User authentication successful",
                "Cache hit for user data"
            ]
        }
        
        try:
            async with session.post(f"{self.base_urls['anomaly']}/fit-anomaly",
                                  json=train_data) as response:
                if response.status == 200:
                    print("✅ Anomaly model training successful")
                    
                    # Test anomaly detection
                    test_data = {
                        "sentences": [
                            "Critical system failure detected",
                            "Normal operation continuing"
                        ]
                    }
                    
                    async with session.post(f"{self.base_urls['anomaly']}/detect-anomaly",
                                          json=test_data) as detect_response:
                        if detect_response.status == 200:
                            detect_result = await detect_response.json()
                            if 'anomaly_labels' in detect_result:
                                print("✅ Anomaly detection successful")
                                self.test_results['anomaly_detection'] = True
                            else:
                                print("❌ Anomaly detection failed: Invalid response")
                                self.test_results['anomaly_detection'] = False
                        else:
                            print(f"❌ Anomaly detection failed: HTTP {detect_response.status}")
                            self.test_results['anomaly_detection'] = False
                else:
                    print(f"❌ Anomaly training failed: HTTP {response.status}")
                    self.test_results['anomaly_detection'] = False
        except Exception as e:
            print(f"❌ Anomaly detection error: {e}")
            self.test_results['anomaly_detection'] = False
    
    async def test_vector_database(self, session: aiohttp.ClientSession):
        """Test vector database functionality"""
        print("🔍 Testing vector database...")
        
        # Index corpus
        index_data = {
            "corpus": [
                "Database connection timeout error",
                "Memory allocation failed",
                "Network socket error",
                "File permission denied",
                "Authentication failure"
            ]
        }
        
        try:
            async with session.post(f"{self.base_urls['vector_db']}/index-corpus",
                                  json=index_data) as response:
                if response.status == 200:
                    print("✅ Vector indexing successful")
                    
                    # Test search
                    search_data = {
                        "query": "database error",
                        "k": 3
                    }
                    
                    async with session.post(f"{self.base_urls['vector_db']}/search",
                                          json=search_data) as search_response:
                        if search_response.status == 200:
                            search_result = await search_response.json()
                            if 'results' in search_result:
                                print(f"✅ Vector search successful: {len(search_result['results'])} results")
                                self.test_results['vector_db'] = True
                            else:
                                print("❌ Vector search failed: Invalid response")
                                self.test_results['vector_db'] = False
                        else:
                            print(f"❌ Vector search failed: HTTP {search_response.status}")
                            self.test_results['vector_db'] = False
                else:
                    print(f"❌ Vector indexing failed: HTTP {response.status}")
                    self.test_results['vector_db'] = False
        except Exception as e:
            print(f"❌ Vector database error: {e}")
            self.test_results['vector_db'] = False
    
    async def test_active_learning(self, session: aiohttp.ClientSession):
        """Test active learning functionality"""
        print("🔍 Testing active learning...")
        
        # Submit a prediction for evaluation
        prediction_data = {
            "error_text": "Unexpected database disconnection occurred",
            "features": [0.1, 0.5, 0.8, 0.2, 0.9],
            "predicted_label": "database_error",
            "confidence": 0.7,
            "uncertainty": 0.9
        }
        
        try:
            async with session.post(f"{self.base_urls['active_learning']}/submit-prediction",
                                  json=prediction_data) as response:
                if response.status == 200:
                    data = await response.json()
                    if 'should_review' in data:
                        print(f"✅ Active learning prediction submitted: Review needed = {data['should_review']}")
                        self.test_results['active_learning'] = True
                    else:
                        print("❌ Active learning failed: Invalid response")
                        self.test_results['active_learning'] = False
                else:
                    print(f"❌ Active learning failed: HTTP {response.status}")
                    self.test_results['active_learning'] = False
        except Exception as e:
            print(f"❌ Active learning error: {e}")
            self.test_results['active_learning'] = False
    
    async def test_end_to_end_pipeline(self, session: aiohttp.ClientSession):
        """Test complete end-to-end error analysis pipeline"""
        print("🔍 Testing end-to-end pipeline...")
        
        error_text = "FATAL: Database connection pool exhausted after 30 seconds timeout"
        
        pipeline_results = {}
        
        try:
            # 1. Generate embeddings
            embed_data = {"sentences": [error_text]}
            async with session.post(f"{self.base_urls['embeddings']}/embed",
                                  json=embed_data) as response:
                if response.status == 200:
                    embed_result = await response.json()
                    embeddings = embed_result.get('embeddings', [[]])[0]
                    pipeline_results['embeddings'] = embeddings
                    print("✅ Step 1: Embeddings generated")
                else:
                    print("❌ Pipeline failed at embeddings step")
                    return
            
            # 2. NER analysis
            ner_data = {"text": error_text}
            async with session.post(f"{self.base_urls['ner']}/ner",
                                  json=ner_data) as response:
                if response.status == 200:
                    ner_result = await response.json()
                    pipeline_results['entities'] = ner_result.get('entities', [])
                    print("✅ Step 2: NER analysis completed")
                else:
                    print("❌ Pipeline failed at NER step")
            
            # 3. Anomaly detection
            if 'embeddings' in pipeline_results:
                anomaly_data = {"sentences": [error_text]}
                async with session.post(f"{self.base_urls['anomaly']}/detect-anomaly",
                                      json=anomaly_data) as response:
                    if response.status == 200:
                        anomaly_result = await response.json()
                        pipeline_results['anomaly'] = anomaly_result
                        print("✅ Step 3: Anomaly detection completed")
            
            # 4. Semantic search for similar errors
            search_corpus = [
                "Database timeout error",
                "Memory leak detected",
                "Connection pool exhausted",
                "Network latency high",
                "Authentication failed"
            ]
            
            search_data = {"query": error_text, "corpus": search_corpus}
            async with session.post(f"{self.base_urls['semantic_search']}/semantic-search",
                                  json=search_data) as response:
                if response.status == 200:
                    search_result = await response.json()
                    pipeline_results['similar_errors'] = search_result.get('results', [])
                    print("✅ Step 4: Similar error search completed")
            
            print(f"🎉 End-to-end pipeline successful! Results: {len(pipeline_results)} components")
            self.test_results['end_to_end_pipeline'] = True
            
        except Exception as e:
            print(f"❌ End-to-end pipeline error: {e}")
            self.test_results['end_to_end_pipeline'] = False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("🎯 INTEGRATION TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in self.test_results.values() if result)
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"✅ Passed: {passed}/{total} ({success_rate:.1f}%)")
        print(f"❌ Failed: {total - passed}/{total}")
        print()
        
        print("Detailed Results:")
        for test, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test:25} {status}")
        
        print("\n" + "="*60)
        
        if success_rate >= 80:
            print("🎉 INTEGRATION TEST SUITE: PASSED")
        else:
            print("⚠️  INTEGRATION TEST SUITE: NEEDS ATTENTION")
    
    async def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting StackLens AI Microservices Integration Tests")
        print("="*60)
        
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # Basic health checks
            await self.test_service_health(session)
            
            # Wait a bit for services to fully initialize
            await asyncio.sleep(2)
            
            # Individual service tests
            await self.test_embeddings_service(session)
            await self.test_semantic_search(session)
            await self.test_anomaly_detection(session)
            await self.test_vector_database(session)
            await self.test_active_learning(session)
            
            # End-to-end pipeline test
            await self.test_end_to_end_pipeline(session)
        
        # Print summary
        self.print_summary()

async def main():
    """Main test runner"""
    print("Waiting for services to start up...")
    await asyncio.sleep(5)  # Give services time to start
    
    tester = MicroserviceIntegrationTest()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
