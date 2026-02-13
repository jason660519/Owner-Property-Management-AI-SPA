"""
FastAPI main application for OCR VLM service
"""
import asyncio
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from ..core.ocr_processor import OCRProcessor
from ..core.search_client import get_search_client
from ..utils.cache_manager import CacheManager
from ..utils.log_archiver import LogArchiver
from ..utils.logger import LOG_ROOT, SystemLogger
from ..utils.metrics_collector import MetricsCollector
from .routes import documents, es_admin, health, integrations, logs, ocr, search

app = FastAPI(
    title="OCR VLM Service",
    description="Comprehensive OCR with Vision Language Model for document processing",
    version="1.0.0"
)

# Initialize System Logger
system_logger = SystemLogger()
log_archiver = LogArchiver(str(LOG_ROOT))

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def user_context_middleware(request: Request, call_next):
    """
    Middleware to extract user_id from headers and bind to logger context.
    """
    # Extract user_id from header (e.g. X-User-ID or from Authorization token)
    # For now, we look for X-User-ID header
    user_id = request.headers.get("X-User-ID", "anonymous")

    # Bind user_id to the logger context for this request
    with logger.contextualize(user_id=user_id):
        response = await call_next(request)
        return response

# Include routers
app.include_router(ocr.router, prefix="/api/v1", tags=["ocr"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(logs.router, prefix="/api/v1/logs", tags=["logs"])
app.include_router(integrations.router, tags=["integrations"])
app.include_router(documents.router, tags=["documents"])
app.include_router(search.router, tags=["search"])
app.include_router(es_admin.router, tags=["admin-es"])

# Global instances
ocr_processor = OCRProcessor()
cache_manager = CacheManager()
metrics = MetricsCollector()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global ocr_processor, cache_manager, metrics

    # Initialize Logger
    system_logger.initialize()
    system_logger.setup_dynamic_sink()

    ocr_processor.cache_manager = cache_manager
    await cache_manager.initialize()
    await metrics.initialize()
    await ocr_processor.initialize()

    # Inject dependencies into routers
    ocr.ocr_processor = ocr_processor
    ocr.cache_manager = cache_manager
    ocr.metrics = metrics
    health.ocr_processor = ocr_processor
    health.cache_manager = cache_manager

    # Initialize Search Client
    search_client = get_search_client()
    try:
        await search_client.initialize()
    except Exception as e:
        logger.error(f"Failed to initialize Elasticsearch client: {e}")

    logger.info("OCR VLM Service started successfully")

    # Start Log Archiver in background
    asyncio.create_task(run_periodic_archiver())

    # Start Temp File Cleanup
    asyncio.create_task(run_temp_cleanup())

async def run_periodic_archiver():
    """Run log archiver periodically (every 24 hours)"""
    while True:
        try:
            logger.info("Running scheduled log archiving...")
            await log_archiver.run_cleanup()
        except Exception as e:
            logger.error(f"Archiver task failed: {e}")

        # Wait for 24 hours
        await asyncio.sleep(24 * 3600)

async def run_temp_cleanup():
    """Clean up temp files older than 24 hours"""
    temp_dir = "/tmp/ocr_uploads"
    while True:
        try:
            logger.info("Running scheduled temp file cleanup...")
            if os.path.exists(temp_dir):
                now = time.time()
                for f in os.listdir(temp_dir):
                    f_path = os.path.join(temp_dir, f)
                    try:
                        if os.stat(f_path).st_mtime < now - 24 * 3600:
                            os.remove(f_path)
                            logger.info(f"Deleted old temp file: {f}")
                    except Exception as e:
                        logger.warning(f"Failed to delete temp file {f}: {e}")
        except Exception as e:
            logger.error(f"Temp cleanup failed: {e}")

        # Check every hour
        await asyncio.sleep(3600)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await ocr_processor.shutdown()
    await cache_manager.close()
    await get_search_client().close()
    logger.info("OCR VLM Service shutdown complete")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OCR VLM Service",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/metrics")
async def get_metrics():
    """Get performance metrics"""
    return await metrics.get_metrics()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
