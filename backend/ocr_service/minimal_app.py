"""
Minimal FastAPI app for VLM testing
Includes mock OCR batch-upload and SSE event endpoints
"""

import os
import json
import uuid
import asyncio
import shutil
import tempfile
from pathlib import Path
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from supabase import create_client

from src.ocr_engine.vlm import VLMEngine
from src.preprocessor.pdf_preprocessor import PDFPreprocessor
from src.parser import extract_transcript, to_unified_output

load_dotenv()

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
    """Save VLM credentials (in-memory for this session)"""
    key_map = {
        "anthropic_claude": "ANTHROPIC_API_KEY",
        "openai_gpt4v": "OPENAI_API_KEY",
        "google_gemini": "GOOGLE_API_KEY",
    }
    
    env_var = key_map.get(provider)
    if env_var:
        os.environ[env_var] = api_key
        # Also update dotenv if possible, or write to .env? 
        # For now, just memory is safer/easier for a "minimal" app without breaking things.
        
        return {
            "status": "success",
            "message": f"Credentials saved for {provider}",
            "provider": provider,
        }
    else:
        return {
            "status": "error",
            "message": f"Unknown provider: {provider}",
            "provider": provider
        }, 400


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
# OCR Batch Upload & SSE Events (real VLM parsing; ensure API keys are set)
# ---------------------------------------------------------------------------

async def _process_batch(batch_id: str, file_paths: List[str], batch_dir: str):
    """Background task: Process OCR batch and push SSE events."""
    queue = sse_queues.get(batch_id)
    if not queue:
        return

    # Initialize Engines
    # Determine provider based on env vars
    provider = "openai"
    model = "gpt-4o"
    if os.getenv("ANTHROPIC_API_KEY"):
        provider = "anthropic"
        model = "claude-3-5-sonnet-20240620"
    elif os.getenv("OPENAI_API_KEY"):
        provider = "openai"
        model = "gpt-4o"
    elif os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
        provider = "google"
        model = "gemini-1.5-pro"

    api_key = (
        os.getenv("ANTHROPIC_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
    )
    if not api_key:
        await queue.put({
            "type": "BATCH_FAILED",
            "error": "請先設定至少一個 VLM API Key：ANTHROPIC_API_KEY、OPENAI_API_KEY 或 GOOGLE_API_KEY（可在 .env 或環境變數中設定）",
        })
        await queue.put("END")
        return

    try:
        vlm_engine = VLMEngine(provider=provider, model=model)
        pdf_processor = PDFPreprocessor()
        await pdf_processor.initialize()

        await queue.put({
            "type": "BATCH_STARTED",
            "total": len(file_paths),
            "timestamp": datetime.now().isoformat(),
            "provider": provider
        })

        for i, file_path_str in enumerate(file_paths):
            file_path = Path(file_path_str)
            filename = file_path.name
            
            await queue.put({
                "type": "FILE_PROCESSING",
                "file_id": str(uuid.uuid4()),
                "filename": filename,
                "index": i,
                "progress": int((i / len(file_paths)) * 100),
            })

            start_time = datetime.now()
            try:
                # Process file
                image_path = file_path
                
                # If PDF, convert first page to image
                if file_path.suffix.lower() == ".pdf":
                    # Read PDF file
                    with open(file_path, "rb") as f:
                        pdf_data = f.read()
                    
                    images = await pdf_processor.convert_to_images(pdf_data, page_range="1")
                    if images:
                        # Save temp image
                        image_path = Path(batch_dir) / f"{file_path.stem}_page1.png"
                        with open(image_path, "wb") as f:
                            f.write(images[0])
                    else:
                        raise ValueError("Could not extract images from PDF")

                # Call VLM (ensure Path for engine)
                result = await vlm_engine.process(
                    image_path=Path(image_path),
                    document_type="建物登記謄本"
                )
                
                # Detect if model returned the prompt example instead of real content
                ownership = result.get("ownership_info") or {}
                basic = result.get("building_basic_info") or {}
                doc_info = result.get("document_info") or {}
                is_example_echo = (
                    ownership.get("owner") == "詹琬"
                    and "敦化南路586" in str(basic.get("address", ""))
                ) or (
                    doc_info.get("certificate_number") == "大安電腾字第007104號"
                    and basic.get("building_number") == "02069-000建號"
                )
                if is_example_echo:
                    await queue.put({
                        "type": "FILE_FAILED",
                        "filename": filename,
                        "error": "解析結果與系統範例相同，可能未正確辨識您的圖片。請確認：1) API Key 有效 2) 上傳的檔案為謄本圖片/PDF 3) 圖片清晰可讀。",
                    })
                    continue
                
                # Add metadata
                processing_time = (datetime.now() - start_time).total_seconds() * 1000
                result["processing_time_ms"] = int(processing_time)
                result["provider"] = provider

                await queue.put({
                    "type": "FILE_COMPLETED",
                    "file_id": str(uuid.uuid4()),
                    "filename": filename,
                    "result": result,
                })

            except Exception as e:
                await queue.put({
                    "type": "FILE_FAILED",
                    "filename": filename,
                    "error": str(e)
                })

        await queue.put({
            "type": "BATCH_COMPLETED",
            "batch_id": batch_id,
            "results_count": len(file_paths),
        })

    except Exception as e:
        await queue.put({
            "type": "BATCH_FAILED",
            "error": str(e),
        })
    finally:
        # Cleanup
        try:
            shutil.rmtree(batch_dir, ignore_errors=True)
        except Exception:
            pass
            
        await queue.put("END")
        await asyncio.sleep(60)
        sse_queues.pop(batch_id, None)


@app.post("/api/v1/ocr/batch-upload")
async def upload_batch_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """
    Upload multiple files for batch OCR processing.
    Returns a batch_id; connect to /api/v1/ocr/events/{batch_id} for progress.
    """
    batch_id = str(uuid.uuid4())
    sse_queues[batch_id] = asyncio.Queue()

    # Create a temp directory for this batch
    batch_dir = Path(tempfile.gettempdir()) / "ocr_batches" / batch_id
    batch_dir.mkdir(parents=True, exist_ok=True)

    valid_extensions = {"jpg", "jpeg", "png", "pdf", "tif", "tiff", "bmp", "gif"}
    saved_files: List[str] = []

    for file in files:
        ext = (file.filename or "unknown").rsplit(".", 1)[-1].lower()
        if ext not in valid_extensions:
            continue
        
        file_path = batch_dir / (file.filename or f"unnamed.{ext}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_files.append(str(file_path))

    if not saved_files:
        shutil.rmtree(batch_dir, ignore_errors=True)
        return {"detail": "No valid files provided"}, 400

    # Start background processing
    background_tasks.add_task(_process_batch, batch_id, saved_files, str(batch_dir))

    return {
        "batch_id": batch_id,
        "message": "Batch uploaded and processing started",
        "file_count": len(saved_files),
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


@app.post("/api/v1/documents/{document_id}/parse-local")
async def parse_document_locally(document_id: str):
    """
    Parse a transcript PDF using the local deterministic Python regex parser.
    Downloads the file from Supabase Storage, extracts the text layer, and
    returns structured JSON in the TranscriptParseOutput unified schema —
    no external AI API is called.
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase 環境變數未設定（SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）")

    supabase = create_client(supabase_url, supabase_key)

    # 1. Fetch document record
    result = supabase.table("property_documents").select("id, file_path").eq("id", document_id).eq("is_active", True).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="找不到該文件或文件已刪除")

    file_path: str = result.data[0]["file_path"]

    # 2. Download from Supabase Storage
    try:
        response = supabase.storage.from_("property-documents").download(file_path)
        file_bytes: bytes = response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"無法從儲存空間下載文件：{e}")

    # 3. Write to temp file and parse
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        parsed = extract_transcript(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"本地解析失敗：{e}")
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    if parsed is None:
        raise HTTPException(
            status_code=422,
            detail="PDF 無可提取的文字層（可能是掃描影像），請改用雲端解析。"
        )

    # Convert to the TranscriptParseOutput unified schema, including field_confidences.
    unified = to_unified_output(parsed)
    return {
        "document_id": document_id,
        "local_parse": True,
        **unified,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8819)
