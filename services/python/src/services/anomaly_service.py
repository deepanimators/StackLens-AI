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
