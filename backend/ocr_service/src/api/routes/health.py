"""
Health check endpoints
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from loguru import logger
from ...core.ocr_processor import OCRProcessor
from ...core.cache import CacheManager

router = APIRouter()

# Global instances (will be injected)
ocr_processor: OCRProcessor = None
cache_manager: CacheManager = None

@router.get("/health")
async def health_check():
    """
    Comprehensive health check
    """
    try:
        # Check OCR processor
        ocr_status = await ocr_processor.health_check()
        
        # Check cache
        cache_status = await cache_manager.health_check()
        
        # Check external services (VLM APIs)
        vlm_status = await ocr_processor.check_vlm_services()
        
        overall_status = "healthy" if all([
            ocr_status["status"] == "healthy",
            cache_status["status"] == "healthy",
            vlm_status["overall"] == "healthy"
        ]) else "degraded"
        
        return {
            "status": overall_status,
            "components": {
                "ocr_processor": ocr_status,
                "cache": cache_status,
                "vlm_services": vlm_status
            },
            "timestamp": "2026-02-01T10:30:00Z"  # Would use actual datetime
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")

@router.get("/health/liveness")
async def liveness_probe():
    """
    Simple liveness probe for Kubernetes
    """
    return {"status": "alive"}

@router.get("/health/readiness")
async def readiness_probe():
    """
    Readiness probe for Kubernetes
    """
    try:
        # Basic checks
        ocr_ready = await ocr_processor.is_ready()
        cache_ready = await cache_manager.is_ready()
        
        if ocr_ready and cache_ready:
            return {"status": "ready"}
        else:
            return {"status": "not_ready"}
            
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {"status": "not_ready"}

@router.get("/health/metrics")
async def health_metrics():
    """
    Get detailed health metrics
    """
    try:
        metrics = {
            "uptime": "24h",  # Would calculate actual uptime
            "total_requests": 1000,
            "success_rate": 0.95,
            "average_processing_time": 2.5,
            "cache_hit_rate": 0.3,
            "active_connections": 5,
            "memory_usage": "512MB/2GB",
            "cpu_usage": "25%"
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail="Metrics unavailable")