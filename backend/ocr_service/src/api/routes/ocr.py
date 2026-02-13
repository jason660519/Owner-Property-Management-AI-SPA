"""
OCR processing endpoints
"""
import asyncio
import hashlib
import json
import os
import shutil
import uuid
from datetime import datetime
from typing import Dict, List

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from loguru import logger
from supabase import Client, create_client

from ...core.ocr_processor import OCRProcessor
from ...core.storage_client import get_storage_client
from ...models.schemas import (
    BatchOCRRequest,
    DocumentType,
    OCRResponse,
    ProcessingStatus,
)
from ...utils.cache_manager import CacheManager
from ...utils.metrics_collector import MetricsCollector

router = APIRouter()

# Global instances (will be injected)
ocr_processor: OCRProcessor = None
cache_manager: CacheManager = None
metrics: MetricsCollector = None

# In-memory SSE queues: batch_id -> asyncio.Queue
sse_queues: Dict[str, asyncio.Queue] = {}

# Temp directory for uploads
TEMP_DIR = "/tmp/ocr_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

def get_supabase_client() -> Client:
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing")

    return create_client(supabase_url, supabase_key)

@router.post("/ocr/single", response_model=OCRResponse)
async def process_single_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Query(DocumentType.BUILDING_TITLE),
    language: str = Query("zh-TW", description="Document language code"),
    enable_cache: bool = Query(True, description="Enable response caching")
):
    """
    Process a single document with OCR VLM

    Supports: JPG, PNG, PDF formats
    """
    try:
        # Generate request ID
        request_id = str(uuid.uuid4())

        # Read file content
        content = await file.read()
        filename = file.filename or "upload"
        allowed_extensions = {".jpg", ".jpeg", ".png", ".pdf", ".tif", ".tiff", ".bmp", ".gif"}
        if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {filename}")
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file content")

        # Check cache first
        content_hash = hashlib.sha256(content).hexdigest()
        cache_key = f"ocr:{document_type}:{language}:{content_hash}"
        if enable_cache:
            cached_result = await cache_manager.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for request {request_id}")
                await metrics.increment("cache_hit")
                return OCRResponse(
                    request_id=request_id,
                    status=ProcessingStatus.COMPLETED,
                    result=cached_result,
                    processing_time=0.0,
                    cached=True
                )
        else:
            await metrics.increment("cache_miss")

        # Process document
        start_time = datetime.now()

        result = await ocr_processor.process_document(
            content=content,
            filename=file.filename,
            document_type=document_type,
            language=language,
            request_id=request_id
        )

        processing_time = (datetime.now() - start_time).total_seconds()

        # Cache result
        if enable_cache:
            await cache_manager.set(cache_key, result, ttl=3600)

        await metrics.timing("ocr_processing_time", processing_time * 1000)
        await metrics.increment("ocr_success")

        return OCRResponse(
            request_id=request_id,
            status=ProcessingStatus.COMPLETED,
            result=result,
            processing_time=processing_time,
            cached=False
        )

    except HTTPException as e:
        await metrics.increment("ocr_error")
        raise e
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        await metrics.increment("ocr_error")
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.post("/ocr/batch", response_model=List[OCRResponse])
async def process_batch_documents(
    request: BatchOCRRequest,
    background_tasks: BackgroundTasks
):
    """
    Process multiple documents in batch mode

    Returns immediately with task IDs, processes in background
    """
    try:
        task_ids = []
        responses = []

        for file_info in request.files:
            task_id = str(uuid.uuid4())
            task_ids.append(task_id)

            # Create immediate response
            responses.append(OCRResponse(
                request_id=task_id,
                status=ProcessingStatus.QUEUED,
                result=None,
                processing_time=0.0,
                cached=False
            ))

            # Add to background processing
            background_tasks.add_task(
                process_single_background,
                file_info,
                request.document_type,
                request.language,
                request.enable_cache,
                task_id
            )

        return responses

    except Exception as e:
        logger.error(f"Error starting batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e

async def process_single_background(
    file_info: dict,
    document_type: DocumentType,
    language: str,
    enable_cache: bool,
    task_id: str
):
    """Background task for processing single document"""
    try:
        # TODO: Implement actual background processing
        # This would involve saving the file, updating database status, etc.
        logger.info(f"Background processing started for task {task_id}")

    except Exception as e:
        logger.error(f"Background processing failed for task {task_id}: {e}")

@router.get("/ocr/status/{request_id}")
async def get_processing_status(request_id: str):
    """
    Get processing status for a specific request
    """
    # TODO: Implement status tracking
    return {
        "request_id": request_id,
        "status": ProcessingStatus.COMPLETED,
        "progress": 100
    }

@router.get("/ocr/supported-formats")
async def get_supported_formats():
    """
    Get list of supported file formats
    """
    return {
        "supported_formats": ["jpg", "jpeg", "png", "pdf", "tiff", "bmp"],
        "max_file_size": "10MB",
        "recommended_resolution": "300 DPI minimum"
    }

async def process_batch_upload_background(batch_id: str, files: List[dict], document_type: DocumentType):
    """
    Process files in background and emit events
    """
    queue = sse_queues.get(batch_id)
    if not queue:
        return

    try:
        storage_client = get_storage_client()
        supabase = get_supabase_client()

        # Emit started event
        await queue.put({
            "type": "BATCH_STARTED",
            "total": len(files),
            "timestamp": datetime.now().isoformat()
        })

        results = []

        for i, file_info in enumerate(files):
            try:
                file_start_time = datetime.now()

                # Emit processing event
                await queue.put({
                    "type": "FILE_PROCESSING",
                    "file_id": file_info["file_id"],
                    "filename": file_info["original_name"],
                    "index": i,
                    "progress": int((i / len(files)) * 100)
                })

                with open(file_info["file_path"], "rb") as f:
                    content = f.read()

                # Use the global ocr_processor
                result = await ocr_processor.process_document(
                    content=content,
                    filename=file_info["original_name"],
                    document_type=document_type,
                    language="zh-TW",
                    request_id=file_info["file_id"]
                )

                processing_time_ms = int((datetime.now() - file_start_time).total_seconds() * 1000)
                json_path = f"transcripts/{batch_id}/{file_info['file_id']}.json"
                json_bytes = json.dumps(result, ensure_ascii=False).encode("utf-8")

                await storage_client.upload_bytes(
                    file_data=json_bytes,
                    storage_path=json_path,
                    content_type="application/json"
                )

                log_payload = {
                    "document_type": document_type.value,
                    "file_path": json_path,
                    "file_name": file_info["original_name"],
                    "ocr_engine": "vlm",
                    "status": "completed",
                    "confidence_score": result.get("confidence_score"),
                    "structured_data": result,
                    "processing_time_ms": processing_time_ms,
                    "completed_at": datetime.utcnow().isoformat()
                }

                log_result = supabase.table('ocr_parsing_logs').insert(log_payload).execute()
                log_id = None
                if log_result.data:
                    log_id = log_result.data[0].get("id")

                results.append(result)

                await queue.put({
                    "type": "FILE_COMPLETED",
                    "file_id": file_info["file_id"],
                    "filename": file_info["original_name"],
                    "result": result,
                    "json_path": json_path,
                    "log_id": log_id
                })

            except Exception as e:
                logger.error(f"Error processing {file_info['original_name']}: {e}")
                await queue.put({
                    "type": "FILE_FAILED",
                    "file_id": file_info["file_id"],
                    "filename": file_info["original_name"],
                    "error": str(e)
                })

        # Emit completed event
        await queue.put({
            "type": "BATCH_COMPLETED",
            "batch_id": batch_id,
            "results_count": len(results)
        })

        # Send END signal
        await queue.put("END")

    except Exception as e:
        logger.error(f"Batch processing failed: {e}")
        await queue.put({
            "type": "BATCH_FAILED",
            "error": str(e)
        })
        await queue.put("END")
    finally:
        # Cleanup temp files
        for file_info in files:
            try:
                if os.path.exists(file_info["file_path"]):
                    os.remove(file_info["file_path"])
            except Exception:
                pass

        # Remove queue after some delay to allow client to disconnect gracefully
        await asyncio.sleep(60)
        if batch_id in sse_queues:
            del sse_queues[batch_id]

@router.post("/ocr/batch-upload")
async def upload_batch_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    document_type: DocumentType = Query(DocumentType.BUILDING_TITLE)
):
    """
    Upload multiple files for batch processing and return a batch_id.
    Connect to /ocr/events/{batch_id} for progress updates.
    """
    batch_id = str(uuid.uuid4())
    sse_queues[batch_id] = asyncio.Queue()

    saved_files = []

    try:
        for file in files:
            # Validate file extension
            ext = file.filename.split('.')[-1].lower()
            if ext not in ["jpg", "jpeg", "png", "pdf", "tif", "tiff", "bmp", "gif"]:
                continue

            # Validate file size (e.g., skip empty files)
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(0)

            if size == 0:
                logger.warning(f"Skipping empty file: {file.filename}")
                continue

            if size > 10 * 1024 * 1024: # 10MB limit check on backend too
                logger.warning(f"Skipping large file: {file.filename} ({size} bytes)")
                continue

            # Save to temp
            file_id = str(uuid.uuid4())
            file_path = os.path.join(TEMP_DIR, f"{file_id}.{ext}")

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            saved_files.append({
                "file_path": file_path,
                "original_name": file.filename,
                "file_id": file_id
            })

        if not saved_files:
            raise HTTPException(status_code=400, detail="No valid files provided")

        # Start background processing
        # Note: We must ensure ocr_processor is initialized
        if ocr_processor is None:
             logger.error("OCR Processor is not initialized")
             raise HTTPException(status_code=500, detail="OCR Service not ready")

        background_tasks.add_task(
            process_batch_upload_background,
            batch_id,
            saved_files,
            document_type
        )

        return {"batch_id": batch_id, "message": "Batch uploaded and processing started", "file_count": len(saved_files)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.get("/ocr/events/{batch_id}")
async def get_batch_events(batch_id: str):
    """
    SSE endpoint for batch progress
    """
    if batch_id not in sse_queues:
        # If queue doesn't exist, try to create one if it's a valid recent batch
        # But here we just assume 404 if not found
        raise HTTPException(status_code=404, detail="Batch ID not found or expired")

    async def event_generator():
        queue = sse_queues[batch_id]
        try:
            while True:
                # Wait for next event
                data = await queue.get()

                # If end of stream signal
                if data == "END":
                    break

                yield f"data: {json.dumps(data)}\\n\\n"
        except asyncio.CancelledError:
            logger.info(f"Client disconnected from batch {batch_id}")

    return StreamingResponse(event_generator(), media_type="text/event-stream")
