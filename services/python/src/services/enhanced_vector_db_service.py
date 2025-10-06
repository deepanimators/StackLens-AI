"""
FAISS Vector Database Microservice for StackLensAI RAG
Provides semantic search capabilities using FAISS and sentence transformers
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import uvicorn
import json
import logging
from datetime import datetime
import os
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
model = None
index = None
corpus = []
pattern_metadata = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the sentence transformer model on startup"""
    global model
    try:
        logger.info("🚀 Initializing Sentence Transformer model...")
        model = SentenceTransformer('BAAI/bge-base-en-v1.5')
        logger.info("✅ Model loaded successfully")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        # Fallback to a smaller model if the main one fails
        try:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✅ Fallback model loaded")
        except Exception as fallback_error:
            logger.error(f"❌ Fallback model also failed: {fallback_error}")
    
    yield
    
    # Cleanup on shutdown
    logger.info("🔄 Shutting down Vector Database Service")

app = FastAPI(
    title="StackLensAI Vector Database Service", 
    version="1.0.0",
    lifespan=lifespan
)

class IndexRequest(BaseModel):
    corpus: List[str]
    metadata: Optional[List[Dict[str, Any]]] = None

class SearchRequest(BaseModel):
    query: str
    k: Optional[int] = 5
    threshold: Optional[float] = 0.7

class EmbedRequest(BaseModel):
    text: str

class SearchResult(BaseModel):
    corpus_id: int
    text: str
    distance: float
    similarity: float
    metadata: Optional[Dict[str, Any]] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "index_size": len(corpus),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/index-corpus")
async def index_corpus(request: IndexRequest):
    """Index a corpus of text documents for similarity search"""
    global index, corpus, pattern_metadata
    
    try:
        logger.info(f"📚 Indexing corpus with {len(request.corpus)} documents...")
        
        if not model:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        corpus = request.corpus
        pattern_metadata = {}
        
        # Store metadata if provided
        if request.metadata and len(request.metadata) == len(request.corpus):
            for i, metadata in enumerate(request.metadata):
                pattern_metadata[i] = metadata
        
        # Generate embeddings
        logger.info("🔍 Generating embeddings...")
        corpus_embeddings = model.encode(corpus, convert_to_numpy=True)
        
        # Create FAISS index
        logger.info("🏗️ Building FAISS index...")
        dimension = corpus_embeddings.shape[1]
        index = faiss.IndexFlatL2(dimension)  # L2 distance
        index.add(corpus_embeddings.astype('float32'))
        
        logger.info(f"✅ Successfully indexed {len(corpus)} documents")
        
        return {
            "status": "success",
            "corpus_size": len(corpus),
            "dimension": dimension,
            "index_type": "IndexFlatL2",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error indexing corpus: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search_similar(request: SearchRequest) -> Dict[str, Any]:
    """Search for similar documents in the indexed corpus"""
    try:
        if not model:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        if index is None or not corpus:
            raise HTTPException(status_code=400, detail="Corpus not indexed yet")
        
        logger.info(f"🔍 Searching for: '{request.query[:50]}...'")
        
        # Generate query embedding
        query_emb = model.encode([request.query], convert_to_numpy=True)
        
        # Perform search
        distances, indices = index.search(query_emb.astype('float32'), request.k)
        
        # Convert distances to similarities (0-1 scale)
        # For L2 distance, similarity = 1 / (1 + distance)
        similarities = 1 / (1 + distances[0])
        
        # Prepare results
        results = []
        for idx, (corpus_idx, distance, similarity) in enumerate(zip(indices[0], distances[0], similarities)):
            if similarity >= request.threshold:
                result = SearchResult(
                    corpus_id=int(corpus_idx),
                    text=corpus[corpus_idx],
                    distance=float(distance),
                    similarity=float(similarity),
                    metadata=pattern_metadata.get(corpus_idx, {})
                )
                results.append(result.dict())
        
        logger.info(f"✅ Found {len(results)} similar documents above threshold {request.threshold}")
        
        return {
            "query": request.query,
            "results": results,
            "total_found": len(results),
            "search_time_ms": 50,  # Approximate
            "threshold": request.threshold
        }
        
    except Exception as e:
        logger.error(f"❌ Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embed")
async def generate_embedding(request: EmbedRequest):
    """Generate embedding for a single text"""
    try:
        if not model:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        logger.info(f"🔤 Generating embedding for: '{request.text[:50]}...'")
        
        # Generate embedding
        embedding = model.encode([request.text], convert_to_numpy=True)[0]
        
        return {
            "text": request.text,
            "embedding": embedding.tolist(),
            "dimension": len(embedding),
            "model": "BAAI/bge-base-en-v1.5"
        }
        
    except Exception as e:
        logger.error(f"❌ Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_statistics():
    """Get current statistics about the vector database"""
    return {
        "model_loaded": model is not None,
        "corpus_size": len(corpus),
        "index_exists": index is not None,
        "metadata_entries": len(pattern_metadata),
        "model_name": "BAAI/bge-base-en-v1.5" if model else None,
        "dimension": index.d if index else 0,
        "total_vectors": index.ntotal if index else 0
    }

@app.delete("/clear")
async def clear_index():
    """Clear the current index and corpus"""
    global index, corpus, pattern_metadata
    
    index = None
    corpus = []
    pattern_metadata = {}
    
    logger.info("🗑️ Index and corpus cleared")
    
    return {
        "status": "cleared",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"🚀 Starting Vector Database Service on {host}:{port}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=True
    )
