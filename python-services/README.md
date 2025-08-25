# StackLens AI - Advanced ML Microservices

A comprehensive suite of AI-powered microservices for advanced error pattern analysis, featuring deep learning models, active learning, and self-improvement capabilities.

## 🚀 Architecture Overview

This system provides 8 specialized microservices that work together to deliver state-of-the-art error analysis:

```
┌─────────────────────────────────────────────────────────────┐
│                    StackLens AI Platform                    │
├─────────────────────────────────────────────────────────────┤
│  🧠 Embeddings     │  🔍 NER Analysis   │  📝 Summarization │
│     (Port 8000)    │     (Port 8001)    │     (Port 8002)   │
├─────────────────────────────────────────────────────────────┤
│  🔎 Semantic Search │  ⚠️  Anomaly Detect │  💾 Vector DB    │
│     (Port 8003)     │     (Port 8004)     │     (Port 8005)   │
├─────────────────────────────────────────────────────────────┤
│  🤖 Deep Learning  │  📚 Active Learning │                   │
│     (Port 8006)     │     (Port 8007)     │                   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features

### Advanced NLP Capabilities

- **Sentence Transformers**: BAAI/bge-base-en-v1.5 for high-quality embeddings
- **Named Entity Recognition**: BERT-based model for entity extraction
- **Text Summarization**: BART model for error summary generation
- **Semantic Search**: Vector-based similarity search with FAISS

### Deep Learning & Self-Training

- **Custom Transformer**: Advanced transformer architecture for error classification
- **Variational Autoencoder**: Unsupervised anomaly detection
- **Graph Neural Networks**: Relationship modeling between error patterns
- **Reinforcement Learning**: Dynamic feature selection optimization
- **Active Learning**: Continuous model improvement with uncertainty estimation

### Production Features

- **Docker Containerization**: Complete Docker Compose setup
- **Health Monitoring**: Health endpoints for all services
- **Scalable Architecture**: Independent service scaling
- **Comprehensive Testing**: Integration test suite
  ├── ner_service.py
  ├── summarization_service.py
  ├── requirements.txt
  └── Dockerfile

```

---

## 3. requirements.txt

```

fastapi
uvicorn
transformers
sentence-transformers
scikit-learn
pydantic

````

---

## 4. Embeddings/Clustering Service (embeddings_service.py)

```python
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
````

---

## 5. Semantic Search Service (bge-base-en-v1.5)

```python
from fastapi import FastAPI, Request
from sentence_transformers import SentenceTransformer, util

app = FastAPI()
model = SentenceTransformer('BAAI/bge-base-en-v1.5')

@app.post("/semantic-search")
async def semantic_search(request: Request):
    data = await request.json()
    query = data["query"]
    corpus = data["corpus"]
    corpus_embeddings = model.encode(corpus, convert_to_tensor=True)
    query_embedding = model.encode(query, convert_to_tensor=True)
    hits = util.semantic_search(query_embedding, corpus_embeddings, top_k=5)[0]
    results = [{"corpus_id": hit["corpus_id"], "score": float(hit["score"])} for hit in hits]
    return {"results": results}
```

---

## 6. NER/Token Classification Service (ner_service.py)

```python
from fastapi import FastAPI, Request
from transformers import pipeline

app = FastAPI()
ner = pipeline("token-classification", model="dslim/bert-base-NER")  # Replace with your fine-tuned model

@app.post("/ner")
async def ner_endpoint(request: Request):
    data = await request.json()
    text = data["text"]
    result = ner(text)
    return {"entities": result}
```

---

## 7. Summarization Service (summarization_service.py)

```python
from fastapi import FastAPI, Request
from transformers import pipeline

app = FastAPI()
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")  # or philschmid/bart-large-cnn-samsum

@app.post("/summarize")
async def summarize(request: Request):
    data = await request.json()
    text = data["text"]
    summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
    return {"summary": summary[0]["summary_text"]}
```

---

## 8. Dockerfile (for all services)

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "embeddings_service:app", "--host", "0.0.0.0", "--port", "8000"]  # Change script for each service
```

---

## 9. How to Run Each Service

````sh
# Install dependencies

# Start each service (in separate terminals or as Docker containers)
uvicorn embeddings_service:app --host 0.0.0.0 --port 8000
uvicorn ner_service:app --host 0.0.0.0 --port 8001
---

## 7a. Anomaly Detection Service (embeddings + IsolationForest/Autoencoders)

You can run anomaly detection as a microservice using embeddings and models like IsolationForest or Autoencoders. Example (IsolationForest):

```python
from fastapi import FastAPI, Request
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import IsolationForest
import numpy as np

app = FastAPI()
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
anomaly_model = IsolationForest(contamination=0.05, random_state=42)

@app.post("/fit-anomaly")
async def fit_anomaly(request: Request):
    data = await request.json()
    sentences = data["sentences"]
    embeddings = model.encode(sentences)
    anomaly_model.fit(embeddings)
    return {"status": "model trained"}

@app.post("/detect-anomaly")
async def detect_anomaly(request: Request):
    data = await request.json()
    sentences = data["sentences"]
    embeddings = model.encode(sentences)
    preds = anomaly_model.predict(embeddings)
    return {"anomaly_labels": preds.tolist()}
````

For deep anomaly detection, use an autoencoder (e.g., with PyTorch or TensorFlow) and expose similar endpoints.

---

## 7b. Fine-tuning Transformers on Internal Logs

To improve log understanding, fine-tune a transformer (e.g., BERT, RoBERTa) on your labeled logs. Steps:

1. Prepare your logs with error labels (CSV/JSON).
2. Use HuggingFace `Trainer` or `transformers` for fine-tuning.
3. Save and deploy the model as a microservice (see NER example above).

Example fine-tuning script: [HuggingFace docs](https://huggingface.co/docs/transformers/training)

---

## 7c. Vector DB + Similarity Search Engine (FAISS, Pinecone, Weaviate)

For scalable semantic search, use a vector database. Example (FAISS):

```python
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('BAAI/bge-base-en-v1.5')
corpus = ["log entry 1", "log entry 2", ...]
corpus_embeddings = model.encode(corpus, convert_to_numpy=True)
index = faiss.IndexFlatL2(corpus_embeddings.shape[1])
index.add(corpus_embeddings)

# Query
query = "error message"
query_emb = model.encode([query], convert_to_numpy=True)
D, I = index.search(query_emb, k=5)
print("Top 5 results:", I[0])
```

For production, use Pinecone or Weaviate for managed, distributed vector search. Expose REST endpoints for search and indexing.
uvicorn summarization_service:app --host 0.0.0.0 --port 8002

# ...and so on

````

---

## 10. How to Call from Main App (Node.js Example)

```js
// Example: Call embeddings microservice
const axios = require("axios");
const sentences = ["Error: Connection timeout", "Warning: Disk space low"];
const res = await axios.post("http://localhost:8000/embed", { sentences });
console.log(res.data.embeddings);
````

---

## 11. RUN the CMD

```cmd
chmod +x launch_all.sh
```

## 12. Notes

- You can deploy each service on a different EC2 instance, Docker container, or as separate processes.
- For production, use a process manager (e.g., systemd, PM2, Docker Compose, or Kubernetes).
- Adjust model names to your fine-tuned or preferred models as needed.

---

**This script and guide will help you modularize and scale your AI features as microservices.**
