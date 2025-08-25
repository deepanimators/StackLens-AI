from fastapi import FastAPI, Request
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

app = FastAPI()
model = SentenceTransformer('BAAI/bge-base-en-v1.5')
index = None
corpus = []

@app.post("/index-corpus")
async def index_corpus(request: Request):
    global index, corpus
    data = await request.json()
    corpus = data["corpus"]
    corpus_embeddings = model.encode(corpus, convert_to_numpy=True)
    index = faiss.IndexFlatL2(corpus_embeddings.shape[1])
    index.add(corpus_embeddings)
    return {"status": "corpus indexed", "size": len(corpus)}

@app.post("/search")
async def search(request: Request):
    global index, corpus
    data = await request.json()
    query = data["query"]
    k = data.get("k", 5)
    if index is None or not corpus:
        return {"error": "Corpus not indexed yet."}
    query_emb = model.encode([query], convert_to_numpy=True)
    D, I = index.search(query_emb, k)
    results = [{"corpus_id": int(idx), "text": corpus[int(idx)], "distance": float(dist)} for idx, dist in zip(I[0], D[0])]
    return {"results": results}

@app.get("/health")
async def health():
    return {"status": "healthy", "corpus_size": len(corpus), "index_ready": index is not None}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
