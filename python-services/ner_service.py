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

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "dslim/bert-base-NER"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)