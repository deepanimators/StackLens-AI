from fastapi import FastAPI, Request
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import numpy as np

app = FastAPI()
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

@app.post("/embed")
async def embed(request: Request):
    data = await request.json()
    sentences = data["sentences"]
    embeddings = model.encode(sentences).tolist()
    return {"embeddings": embeddings}

@app.post("/cluster")
async def cluster(request: Request):
    data = await request.json()
    embeddings = np.array(data["embeddings"])
    n_clusters = data.get("n_clusters", 5)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42).fit(embeddings)
    return {"labels": kmeans.labels_.tolist()}

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "sentence-transformers/all-MiniLM-L6-v2"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)