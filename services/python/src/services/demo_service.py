#!/usr/bin/env python3
"""
StackLens AI - Working Demo Service
A lightweight demo of the microservices architecture without heavy model downloads
"""

from fastapi import FastAPI, HTTPException
import uvicorn
from typing import List, Dict, Any
import json
import time
import random
import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import IsolationForest
import logging
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize simple models and vectorizers
vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
anomaly_detector = IsolationForest(contamination=0.1, random_state=42)

# Global variables
is_trained = False
demo_corpus = [
    "Database connection timeout",
    "Memory allocation failed", 
    "Network socket error",
    "File permission denied",
    "Authentication failure",
    "Cache miss error",
    "SQL query timeout",
    "Service unavailable"
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    global is_trained, vectorizer, anomaly_detector
    logger.info("🚀 Starting StackLens AI Demo Service...")
    
    # Train simple models with demo data
    try:
        vectors = vectorizer.fit_transform(demo_corpus)
        anomaly_detector.fit(vectors.toarray())
        is_trained = True
        logger.info("✅ Demo models initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize models: {e}")
    
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down StackLens AI Demo Service...")

app = FastAPI(
    title="StackLens AI Demo Service", 
    version="1.0.0",
    description="Lightweight demo of AI microservices for error analysis",
    lifespan=lifespan
)

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "stacklens_ai_demo",
        "timestamp": time.time(),
        "models_trained": is_trained
    }

@app.get("/")
def root():
    """Root endpoint with service info"""
    return {
        "message": "StackLens AI Demo Service",
        "version": "1.0.0",
        "capabilities": [
            "Text Embeddings (TF-IDF)",
            "Clustering (K-Means)",
            "Semantic Search",
            "Anomaly Detection", 
            "Error Classification",
            "Pattern Analysis"
        ],
        "endpoints": [
            "/health", "/embed", "/cluster", "/search", 
            "/detect-anomaly", "/analyze-error", "/get-patterns"
        ]
    }

@app.post("/embed")
def generate_embeddings(data: Dict[str, List[str]]):
    """Generate embeddings using TF-IDF"""
    try:
        sentences = data.get("sentences", [])
        if not sentences:
            raise HTTPException(status_code=400, detail="No sentences provided")
        
        # Generate TF-IDF vectors
        vectors = vectorizer.transform(sentences)
        embeddings = vectors.toarray().tolist()
        
        return {
            "embeddings": embeddings,
            "dimensions": vectors.shape[1],
            "method": "TF-IDF",
            "count": len(sentences)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/cluster")
def cluster_embeddings(data: Dict[str, Any]):
    """Cluster embeddings using K-Means"""
    try:
        embeddings = data.get("embeddings", [])
        n_clusters = data.get("n_clusters", 3)
        
        if not embeddings:
            raise HTTPException(status_code=400, detail="No embeddings provided")
        
        # Perform clustering
        kmeans = KMeans(n_clusters=min(n_clusters, len(embeddings)), random_state=42)
        labels = kmeans.fit_predict(embeddings).tolist()
        
        return {
            "labels": labels,
            "n_clusters": n_clusters,
            "centers": kmeans.cluster_centers_.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
def semantic_search(data: Dict[str, Any]):
    """Semantic search using cosine similarity"""
    try:
        query = data.get("query", "")
        corpus = data.get("corpus", demo_corpus)
        k = data.get("k", 3)
        
        if not query:
            raise HTTPException(status_code=400, detail="No query provided")
        
        # Create vectors for query and corpus
        all_texts = [query] + corpus
        vectors = vectorizer.transform(all_texts)
        
        # Calculate similarities
        query_vector = vectors[0:1]
        corpus_vectors = vectors[1:]
        
        similarities = (corpus_vectors * query_vector.T).toarray().flatten()
        
        # Get top k results
        top_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_indices:
            results.append({
                "text": corpus[idx],
                "similarity": float(similarities[idx]),
                "index": int(idx)
            })
        
        return {
            "query": query,
            "results": results,
            "total_corpus_size": len(corpus)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-anomaly")
def detect_anomaly(data: Dict[str, List[str]]):
    """Detect anomalies in text using Isolation Forest"""
    try:
        sentences = data.get("sentences", [])
        if not sentences:
            raise HTTPException(status_code=400, detail="No sentences provided")
        
        # Transform to vectors
        vectors = vectorizer.transform(sentences)
        
        # Predict anomalies
        predictions = anomaly_detector.predict(vectors.toarray())
        scores = anomaly_detector.score_samples(vectors.toarray())
        
        # Convert predictions (1 = normal, -1 = anomaly) - ensure proper types
        anomaly_labels = [bool(pred == -1) for pred in predictions]
        
        return {
            "sentences": sentences,
            "anomaly_labels": anomaly_labels,
            "anomaly_scores": scores.tolist(),
            "anomaly_count": int(sum(anomaly_labels))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-error")
def analyze_error(data: Dict[str, str]):
    """Comprehensive error analysis"""
    try:
        error_text = data.get("error_text", "")
        if not error_text:
            raise HTTPException(status_code=400, detail="No error text provided")
        
        # Generate embedding
        vector = vectorizer.transform([error_text])
        embedding = vector.toarray()[0].tolist()
        
        # Check if anomaly
        is_anomaly = anomaly_detector.predict(vector.toarray())[0] == -1
        anomaly_score = anomaly_detector.score_samples(vector.toarray())[0]
        
        # Find similar errors
        similarities = (vectorizer.transform(demo_corpus) * vector.T).toarray().flatten()
        top_similar_idx = np.argmax(similarities)
        
        # Mock classification
        error_categories = ["Database", "Network", "Memory", "Security", "File System"]
        predicted_category = random.choice(error_categories)
        confidence = random.uniform(0.7, 0.95)
        
        return {
            "error_text": error_text,
            "analysis": {
                "is_anomaly": bool(is_anomaly),
                "anomaly_score": float(anomaly_score),
                "predicted_category": predicted_category,
                "confidence": confidence,
                "most_similar_error": demo_corpus[top_similar_idx],
                "similarity_score": float(similarities[top_similar_idx])
            },
            "embedding": embedding[:10],  # First 10 dimensions
            "timestamp": time.time()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-patterns")
def get_error_patterns():
    """Get discovered error patterns"""
    return {
        "patterns": [
            {
                "pattern": "Database Connection Issues",
                "frequency": 45,
                "examples": ["Database timeout", "Connection pool exhausted", "SQL connection failed"],
                "severity": "High"
            },
            {
                "pattern": "Memory Allocation Errors", 
                "frequency": 23,
                "examples": ["Out of memory", "Memory allocation failed", "Heap overflow"],
                "severity": "Critical"
            },
            {
                "pattern": "Network Connectivity",
                "frequency": 18,
                "examples": ["Network timeout", "Socket error", "Connection refused"],
                "severity": "Medium"
            },
            {
                "pattern": "Authentication Failures",
                "frequency": 12,
                "examples": ["Invalid credentials", "Token expired", "Access denied"],
                "severity": "High"
            }
        ],
        "total_patterns": 4,
        "analysis_date": time.strftime("%Y-%m-%d %H:%M:%S")
    }

@app.post("/train-model")
def train_model(data: Dict[str, Any]):
    """Mock model training endpoint"""
    training_data = data.get("training_data", [])
    epochs = data.get("epochs", 5)
    
    # Simulate training
    time.sleep(1)  # Simulate training time
    
    return {
        "status": "training_complete",
        "samples_trained": len(training_data),
        "epochs": epochs,
        "accuracy": random.uniform(0.85, 0.95),
        "loss": random.uniform(0.1, 0.3),
        "training_time": "1.2 seconds"
    }

if __name__ == "__main__":
    logger.info("🎯 Starting StackLens AI Demo Service on port 8888")
    uvicorn.run(app, host="0.0.0.0", port=8888, log_level="info")
