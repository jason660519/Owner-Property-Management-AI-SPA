"""
Minimal FastAPI app for VLM testing
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="VLM OCR Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "VLM OCR Service", "version": "1.0.0"}


@app.get("/api/v1/vlm/status")
async def vlm_status():
    """VLM services status"""
    return {
        "anthropic_claude": {"status": "available", "latency_ms": 500},
        "openai_gpt4v": {"status": "available", "latency_ms": 800},
        "google_gemini": {"status": "available", "latency_ms": 600},
    }


@app.post("/api/v1/vlm/credentials")
async def save_credentials(provider: str, api_key: str):
    """Save VLM credentials (mock)"""
    return {
        "status": "success",
        "message": f"Credentials saved for {provider}",
        "provider": provider,
    }


@app.post("/api/v1/documents/upload")
async def upload_document():
    """Upload document for VLM processing (mock)"""
    return {
        "status": "success",
        "document_id": "doc_test_123",
        "message": "Document uploaded successfully",
    }


@app.post("/api/v1/documents/process")
async def process_document():
    """Process document with VLM (mock)"""
    return {
        "status": "success",
        "results": {
            "owner_name": "王小明",
            "property_address": "台北市大安區忠孝東路四段123號",
            "building_number": "0531-000123",
            "confidence": 0.95,
            "provider": "anthropic_claude",
            "processing_time_ms": 1500,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
