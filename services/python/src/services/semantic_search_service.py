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
