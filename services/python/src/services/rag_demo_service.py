#!/usr/bin/env python3
"""
Simplified RAG Vector Database Service Demo
Demonstrates the concept without heavy ML dependencies
"""

import json
import uuid
import time
from typing import List, Dict, Any, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse as urlparse
import re

# Simulated sentence embedding model
class MockSentenceTransformer:
    def __init__(self, model_name: str = "mock-model"):
        self.model_name = model_name
        print(f"🤖 Initialized mock transformer: {model_name}")
    
    def encode(self, sentences: List[str]) -> List[List[float]]:
        """Generate mock embeddings for demonstration"""
        embeddings = []
        for sentence in sentences:
            # Create a simple hash-based mock embedding
            hash_val = hash(sentence.lower()) % 1000000
            # Generate 384-dim embedding based on text characteristics
            embedding = []
            for i in range(384):
                val = ((hash_val + i) % 1000) / 1000.0 - 0.5
                embedding.append(val)
            embeddings.append(embedding)
        return embeddings

# Simulated FAISS index
class MockFAISIndex:
    def __init__(self, dimension: int):
        self.dimension = dimension
        self.vectors = []
        self.metadata = []
        print(f"🔢 Created mock FAISS index with {dimension} dimensions")
    
    def add(self, vectors: List[List[float]], metadata: List[Dict]):
        """Add vectors to the index"""
        start_id = len(self.vectors)
        self.vectors.extend(vectors)
        self.metadata.extend(metadata)
        print(f"➕ Added {len(vectors)} vectors to index (total: {len(self.vectors)})")
    
    def search(self, query_vector: List[float], k: int = 5) -> tuple:
        """Search for similar vectors"""
        if not self.vectors:
            return [], []
        
        # Simple cosine similarity calculation
        similarities = []
        for i, vec in enumerate(self.vectors):
            similarity = self._cosine_similarity(query_vector, vec)
            similarities.append((similarity, i))
        
        # Sort by similarity and return top k
        similarities.sort(key=lambda x: x[0], reverse=True)
        top_k = similarities[:k]
        
        distances = [1.0 - sim for sim, _ in top_k]  # Convert to distance
        indices = [idx for _, idx in top_k]
        
        return distances, indices
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot_product / (norm1 * norm2)

class RAGVectorService:
    def __init__(self):
        self.model = MockSentenceTransformer("BAAI/bge-base-en-v1.5")
        self.index = MockFAISIndex(384)
        self.id_to_metadata = {}
        self.startup_time = time.time()
        
    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "model": self.model.model_name,
            "index_size": len(self.index.vectors),
            "uptime_seconds": int(time.time() - self.startup_time)
        }
    
    def index_corpus(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Index a collection of documents"""
        if not documents:
            return {"success": False, "error": "No documents provided"}
        
        try:
            texts = [doc.get("text", "") for doc in documents]
            embeddings = self.model.encode(texts)
            
            # Prepare metadata
            metadata = []
            for i, doc in enumerate(documents):
                meta = {
                    "id": doc.get("id", str(uuid.uuid4())),
                    "text": doc.get("text", ""),
                    **doc.get("metadata", {})
                }
                metadata.append(meta)
                self.id_to_metadata[meta["id"]] = meta
            
            # Add to index
            self.index.add(embeddings, metadata)
            
            return {
                "success": True,
                "indexed_count": len(documents),
                "total_vectors": len(self.index.vectors)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def search_similar(self, query: str, k: int = 5, threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        if not self.index.vectors:
            return []
        
        try:
            # Encode query
            query_embedding = self.model.encode([query])[0]
            
            # Search
            distances, indices = self.index.search(query_embedding, k)
            
            results = []
            for dist, idx in zip(distances, indices):
                if idx < len(self.index.metadata):
                    similarity = 1.0 - dist  # Convert distance back to similarity
                    if similarity >= threshold:
                        meta = self.index.metadata[idx]
                        results.append({
                            "id": meta.get("id", str(idx)),
                            "text": meta.get("text", ""),
                            "similarity": similarity,
                            "metadata": {k: v for k, v in meta.items() if k not in ["id", "text"]}
                        })
            
            return results
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_vectors": len(self.index.vectors),
            "model_name": self.model.model_name,
            "dimension": self.index.dimension,
            "uptime_seconds": int(time.time() - self.startup_time)
        }

# HTTP Request Handler
class RAGRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, rag_service=None, **kwargs):
        self.rag_service = rag_service
        super().__init__(*args, **kwargs)
    
    def do_GET(self):
        if self.path == "/health":
            self.send_json_response(self.rag_service.health_check())
        elif self.path == "/stats":
            self.send_json_response(self.rag_service.get_stats())
        else:
            self.send_error(404)
    
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        if self.path == "/index-corpus":
            response = self.rag_service.index_corpus(data.get("documents", []))
            self.send_json_response(response)
        elif self.path == "/search":
            query = data.get("query", "")
            k = data.get("k", 5)
            threshold = data.get("threshold", 0.3)
            results = self.rag_service.search_similar(query, k, threshold)
            self.send_json_response({"results": results})
        else:
            self.send_error(404)
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def create_handler(rag_service):
    def handler(*args, **kwargs):
        RAGRequestHandler(*args, rag_service=rag_service, **kwargs)
    return handler

if __name__ == "__main__":
    # Initialize RAG service
    rag_service = RAGVectorService()
    
    # Sample data for demonstration
    sample_errors = [
        {
            "id": "1", 
            "text": "Database connection timeout after 30 seconds",
            "metadata": {"severity": "high", "type": "database", "solution": "Check connection pool settings"}
        },
        {
            "id": "2", 
            "text": "HTTP 500 internal server error in user authentication",
            "metadata": {"severity": "critical", "type": "authentication", "solution": "Verify JWT token validation"}
        },
        {
            "id": "3", 
            "text": "Memory leak detected in background task processor",
            "metadata": {"severity": "high", "type": "memory", "solution": "Review object disposal in task handler"}
        },
        {
            "id": "4", 
            "text": "Network timeout when connecting to external API",
            "metadata": {"severity": "medium", "type": "network", "solution": "Increase timeout and add retry logic"}
        },
        {
            "id": "5", 
            "text": "SQL syntax error in user query builder",
            "metadata": {"severity": "medium", "type": "database", "solution": "Validate SQL parameters and escaping"}
        }
    ]
    
    # Index sample data
    print("🚀 Starting RAG Vector Database Service Demo...")
    result = rag_service.index_corpus(sample_errors)
    print(f"✅ Indexed sample data: {result}")
    
    # Test search
    test_query = "database connection issue"
    results = rag_service.search_similar(test_query, k=3)
    print(f"🔍 Test search for '{test_query}':")
    for result in results:
        print(f"   - {result['text'][:50]}... (similarity: {result['similarity']:.3f})")
    
    # Start HTTP server
    port = 8001
    handler = create_handler(rag_service)
    server = HTTPServer(('localhost', port), handler)
    
    print(f"🌐 RAG Vector Service running on http://localhost:{port}")
    print("📝 Available endpoints:")
    print("   - GET  /health - Service health check")
    print("   - GET  /stats  - Service statistics")
    print("   - POST /index-corpus - Index documents")
    print("   - POST /search - Search similar documents")
    print("🔄 Use Ctrl+C to stop the service")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopping RAG Vector Service...")
        server.shutdown()
        print("✅ Service stopped")
