"""
OEHA-3/4: FastAPI backend — Email analysis endpoint with Ollama
"""

import time
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import EmailRequest, AnalyzeResponse
from services.analyzer import EmailAnalyzer

MODEL_NAME = "qwen2.5-3b-instruct (embedded GGUF)"

app = FastAPI(title="Email Helper Agent Backend", version="1.0.0")

# CORS — allow Outlook Add-in (localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://localhost:3000",
        "http://localhost:3000",
        "null",  # Office Add-in iframe origin
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = EmailAnalyzer()


@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/api/analyze-email")
async def analyze_email(req: EmailRequest):
    """Analyze email: generate summary + suggested replies."""
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="Email body is empty")

    start_time = time.time()

    try:
        result = analyzer.analyze(req.subject, req.body)
    except Exception as e:
        error_msg = str(e)
        if "connection" in error_msg.lower() or "refused" in error_msg.lower():
            raise HTTPException(
                status_code=500,
                detail="AI model unavailable. Kiểm tra Ollama đang chạy (ollama serve).",
            )
        raise HTTPException(status_code=500, detail=f"AI processing error: {error_msg}")

    processing_time = int((time.time() - start_time) * 1000)

    return AnalyzeResponse(
        summary=result.get("summary", []),
        suggestedReplies=result.get("suggestedReplies", []),
        processingTime=processing_time,
        model=MODEL_NAME,
    )
