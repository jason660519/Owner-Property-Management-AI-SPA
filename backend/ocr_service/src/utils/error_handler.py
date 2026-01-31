"""
Error handling and retry mechanism for OCR VLM system
"""
from typing import Dict, Any, Optional, Callable, Type
import asyncio
from datetime import datetime
from loguru import logger
from tenacity import (
    retry, 
    stop_after_attempt, 
    wait_exponential, 
    retry_if_exception_type,
    before_sleep_log
)

class OCRVLMError(Exception):
    """Base exception for OCR VLM system"""
    def __init__(self, message: str, error_code: str = "INTERNAL_ERROR", 
                 details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.timestamp = datetime.now()
        super().__init__(message)

class ValidationError(OCRVLMError):
    """Validation related errors"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VALIDATION_ERROR", details)

class ProcessingError(OCRVLMError):
    """Document processing errors"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "PROCESSING_ERROR", details)

class VLMError(OCRVLMError):
    """VLM service errors"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "VLM_ERROR", details)

class CacheError(OCRVLMError):
    """Cache related errors"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "CACHE_ERROR", details)

class TimeoutError(OCRVLMError):
    """Timeout errors"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, "TIMEOUT_ERROR", details)

class ErrorHandler:
    def __init__(self, metrics_collector: Optional[Any] = None):
        self.metrics_collector = metrics_collector
    
    def create_retry_decorator(
        self, 
        max_attempts: int = 3,
        min_wait: float = 1.0,
        max_wait: float = 10.0,
        retry_exceptions: Optional[tuple] = None
    ) -> Callable:
        """Create a retry decorator with custom parameters"""
        if retry_exceptions is None:
            retry_exceptions = (Exception,)
        
        return retry(
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=1, min=min_wait, max=max_wait),
            retry=retry_if_exception_type(retry_exceptions),
            reraise=True,
            before_sleep=before_sleep_log(logger, "WARNING")
        )
    
    async def handle_error(
        self, 
        error: Exception, 
        context: Optional[Dict[str, Any]] = None,
        operation: str = "unknown"
    ) -> Dict[str, Any]:
        """Handle error and return structured error response"""
        try:
            # Log error
            logger.error(f"Error in {operation}: {error}")
            
            # Record metrics
            if self.metrics_collector:
                await self.metrics_collector.increment("ocr_error", tags={
                    "operation": operation,
                    "error_type": error.__class__.__name__
                })
            
            # Create structured error response
            if isinstance(error, OCRVLMError):
                error_response = {
                    "error": {
                        "code": error.error_code,
                        "message": error.message,
                        "details": error.details,
                        "timestamp": error.timestamp.isoformat()
                    }
                }
            else:
                error_response = {
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": str(error),
                        "details": context or {},
                        "timestamp": datetime.now().isoformat()
                    }
                }
            
            return error_response
            
        except Exception as e:
            logger.critical(f"Error handling failed: {e}")
            return {
                "error": {
                    "code": "ERROR_HANDLING_FAILED",
                    "message": "Failed to handle error",
                    "details": {"original_error": str(error), "handling_error": str(e)},
                    "timestamp": datetime.now().isoformat()
                }
            }
    
    async def execute_with_retry(
        self, 
        operation: Callable,
        operation_name: str,
        max_attempts: int = 3,
        retry_exceptions: Optional[tuple] = None,
        **kwargs
    ) -> Any:
        """Execute operation with retry mechanism"""
        retry_decorator = self.create_retry_decorator(
            max_attempts=max_attempts,
            retry_exceptions=retry_exceptions
        )
        
        @retry_decorator
        async def _execute():
            return await operation(**kwargs)
        
        try:
            result = await _execute()
            
            # Record success
            if self.metrics_collector:
                await self.metrics_collector.increment("ocr_success", tags={
                    "operation": operation_name
                })
            
            return result
            
        except Exception as e:
            # Handle error and re-raise or return error response
            error_response = await self.handle_error(e, {"operation": operation_name}, operation_name)
            
            # For retryable errors, re-raise to trigger retry
            if retry_exceptions and isinstance(e, retry_exceptions):
                raise
            
            # For non-retryable errors, return error response
            return error_response
    
    async def validate_document(
        self, 
        content: bytes, 
        filename: str, 
        max_size_mb: int = 10
    ) -> None:
        """Validate document before processing"""
        try:
            # Check file size
            if len(content) > max_size_mb * 1024 * 1024:
                raise ValidationError(
                    f"File size exceeds maximum allowed size of {max_size_mb}MB",
                    {"file_size": len(content), "max_size": max_size_mb * 1024 * 1024}
                )
            
            # Check file type
            allowed_extensions = {'.jpg', '.jpeg', '.png', '.pdf'}
            file_ext = filename.lower()
            if not any(file_ext.endswith(ext) for ext in allowed_extensions):
                raise ValidationError(
                    f"Unsupported file type: {filename}. Allowed types: {allowed_extensions}",
                    {"filename": filename, "allowed_extensions": list(allowed_extensions)}
                )
            
            # Check if content is valid
            if len(content) == 0:
                raise ValidationError("Empty file content", {"filename": filename})
            
            logger.info(f"Document validation passed: {filename}")
            
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Document validation failed: {e}", {"filename": filename})
    
    async def create_timeout_handler(
        self, 
        timeout_seconds: float = 30.0,
        timeout_error_type: Type[Exception] = TimeoutError
    ) -> Callable:
        """Create a timeout handler for async operations"""
        async def _with_timeout(operation: Callable, *args, **kwargs):
            try:
                return await asyncio.wait_for(
                    operation(*args, **kwargs),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                raise timeout_error_type(
                    f"Operation timed out after {timeout_seconds} seconds",
                    {"timeout_seconds": timeout_seconds}
                )
        
        return _with_timeout
    
    async def get_error_stats(
        self, 
        time_window_minutes: Optional[int] = 60
    ) -> Dict[str, Any]:
        """Get error statistics"""
        if not self.metrics_collector:
            return {}
        
        try:
            error_metrics = await self.metrics_collector.get_metrics(
                "ocr_error", time_window_minutes=time_window_minutes
            )
            
            success_metrics = await self.metrics_collector.get_metrics(
                "ocr_success", time_window_minutes=time_window_minutes
            )
            
            total_errors = sum(
                len(metric_data['values']) 
                for metric_data in error_metrics.values()
            ) if error_metrics else 0
            
            total_success = sum(
                len(metric_data['values']) 
                for metric_data in success_metrics.values()
            ) if success_metrics else 0
            
            total_operations = total_errors + total_success
            error_rate = total_errors / total_operations if total_operations > 0 else 0
            
            # Group errors by type
            error_types = {}
            if error_metrics:
                for key, metric_data in error_metrics.items():
                    # Extract error type from key
                    if '_' in key:
                        error_type = key.split('_')[-1]
                        error_types[error_type] = len(metric_data['values'])
            
            return {
                "total_operations": total_operations,
                "total_errors": total_errors,
                "total_success": total_success,
                "error_rate": round(error_rate * 100, 2),
                "error_types": error_types,
                "time_window_minutes": time_window_minutes
            }
            
        except Exception as e:
            logger.warning(f"Failed to get error stats: {e}")
            return {}
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            error_stats = await self.get_error_stats(time_window_minutes=5)
            
            return {
                'status': 'healthy',
                'message': 'Error handler functioning normally',
                'error_stats': error_stats
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Error handler health check failed: {e}'
            }