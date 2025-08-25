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

@app.get("/health")
async def health():
    return {"status": "healthy", "model": "facebook/bart-large-cnn"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)