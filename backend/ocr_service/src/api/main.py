"""
FastAPI main application for OCR VLM service
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import uuid
import asyncio
from datetime import datetime
import json

from loguru import logger
from .routes import ocr, health
from ..core.ocr_processor import OCRProcessor
from ..core.cache import CacheManager
from ..core.monitoring import MetricsCollector

app = FastAPI(
    title="OCR VLM Service",
    description="Comprehensive OCR with Vision Language Model for document processing",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ocr.router, prefix="/api/v1", tags=["ocr"])
app.include_router(health.router, prefix="/api/v1", tags=["health"])

# Global instances
ocr_processor = OCRProcessor()
cache_manager = CacheManager()
metrics = MetricsCollector()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await ocr_processor.initialize()
    await cache_manager.initialize()
    logger.info("OCR VLM Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await ocr_processor.shutdown()
    await cache_manager.shutdown()
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
    return metrics.get_metrics()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)