"""
OCR processing endpoints
"""
from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List, Optional
import uuid
import json
from datetime import datetime

from loguru import logger
from ...core.ocr_processor import OCRProcessor
from ...core.cache import CacheManager
from ...core.monitoring import MetricsCollector
from ...models.schemas import (
    OCRRequest, OCRResponse, BatchOCRRequest, 
    ProcessingStatus, DocumentType
)

router = APIRouter()

# Global instances (will be injected)
ocr_processor: OCRProcessor = None
cache_manager: CacheManager = None
metrics: MetricsCollector = None

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
        
        # Check cache first
        cache_key = f"ocr:{document_type}:{language}:{hash(content)}"
        if enable_cache:
            cached_result = await cache_manager.get(cache_key)
            if cached_result:
                logger.info(f"Cache hit for request {request_id}")
                metrics.record_cache_hit()
                return OCRResponse(
                    request_id=request_id,
                    status=ProcessingStatus.COMPLETED,
                    result=json.loads(cached_result),
                    processing_time=0.0,
                    cached=True
                )
        
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
            await cache_manager.set(cache_key, json.dumps(result), expire=3600)  # 1 hour
        
        metrics.record_processing_time(processing_time)
        metrics.record_success()
        
        return OCRResponse(
            request_id=request_id,
            status=ProcessingStatus.COMPLETED,
            result=result,
            processing_time=processing_time,
            cached=False
        )
        
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        metrics.record_error()
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

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