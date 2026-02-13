"""
Minimal FastAPI app for VLM testing
Includes mock OCR batch-upload and SSE event endpoints
"""

from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List
import asyncio
import json
import os
import uuid
from datetime import datetime

app = FastAPI(title="VLM OCR Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory SSE queues: batch_id -> asyncio.Queue
sse_queues: dict[str, asyncio.Queue] = {}


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


# ---------------------------------------------------------------------------
# OCR Batch Upload & SSE Events (mock implementation for testing)
# ---------------------------------------------------------------------------

async def _mock_process_batch(batch_id: str, filenames: List[str]):
    """Background task: simulate OCR processing and push SSE events."""
    queue = sse_queues.get(batch_id)
    if not queue:
        return

    try:
        await queue.put({
            "type": "BATCH_STARTED",
            "total": len(filenames),
            "timestamp": datetime.now().isoformat(),
        })

        for i, filename in enumerate(filenames):
            # Emit processing event
            await queue.put({
                "type": "FILE_PROCESSING",
                "file_id": str(uuid.uuid4()),
                "filename": filename,
                "index": i,
                "progress": int((i / len(filenames)) * 100),
            })

            # Simulate OCR processing time (0.5-1.5s per file)
            await asyncio.sleep(0.8)

            # Emit completed event with mock result
            await queue.put({
                "type": "FILE_COMPLETED",
                "file_id": str(uuid.uuid4()),
                "filename": filename,
                "result": {
                    "text": f"[Mock OCR] 解析結果 — {filename}",
                    "owner_name": "王小明",
                    "property_address": "台北市大安區忠孝東路四段123號",
                    "confidence": 0.92,
                    "processing_time_ms": 800,
                },
            })

        await queue.put({
            "type": "BATCH_COMPLETED",
            "batch_id": batch_id,
            "results_count": len(filenames),
        })
    except Exception as e:
        await queue.put({
            "type": "BATCH_FAILED",
            "error": str(e),
        })
    finally:
        # Send END signal
        await queue.put("END")
        # Clean up queue after 60s
        await asyncio.sleep(60)
        sse_queues.pop(batch_id, None)


@app.post("/api/v1/ocr/batch-upload")
async def upload_batch_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """
    Upload multiple files for batch OCR processing (mock).
    Returns a batch_id; connect to /api/v1/ocr/events/{batch_id} for progress.
    """
    batch_id = str(uuid.uuid4())
    sse_queues[batch_id] = asyncio.Queue()

    # Collect filenames and validate
    valid_extensions = {"jpg", "jpeg", "png", "pdf", "tif", "tiff", "bmp", "gif"}
    filenames: List[str] = []

    for file in files:
        ext = (file.filename or "unknown").rsplit(".", 1)[-1].lower()
        if ext not in valid_extensions:
            continue

        # Read and discard content (mock — no actual processing)
        await file.read()
        filenames.append(file.filename or f"unnamed.{ext}")

    if not filenames:
        return {"detail": "No valid files provided"}, 400

    # Start mock background processing
    background_tasks.add_task(_mock_process_batch, batch_id, filenames)

    return {
        "batch_id": batch_id,
        "message": "Batch uploaded and processing started",
        "file_count": len(filenames),
    }


@app.get("/api/v1/ocr/events/{batch_id}")
async def get_batch_events(batch_id: str):
    """SSE endpoint for batch OCR progress updates."""
    if batch_id not in sse_queues:
        return {"detail": "Batch ID not found or expired"}, 404

    async def event_generator():
        queue = sse_queues[batch_id]
        try:
            while True:
                data = await asyncio.wait_for(queue.get(), timeout=120)
                if data == "END":
                    break
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'BATCH_FAILED', 'error': 'Timeout'})}\n\n"
        except asyncio.CancelledError:
            pass

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/v1/ocr/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "supported_formats": ["jpg", "jpeg", "png", "pdf", "tiff", "bmp", "gif"],
        "max_file_size": "10MB",
        "recommended_resolution": "300 DPI minimum",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
