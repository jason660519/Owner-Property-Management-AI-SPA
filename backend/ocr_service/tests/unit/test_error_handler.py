"""
Unit tests for ErrorHandler module
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from src.utils.error_handler import ErrorHandler, OCRVLMError, ValidationError, ProcessingError


class TestErrorHandler:
    @pytest.fixture
    def error_handler(self):
        return ErrorHandler()
    
    @pytest.fixture
    def metrics_collector(self):
        mock_collector = AsyncMock()
        mock_collector.increment = AsyncMock()
        return mock_collector
    
    @pytest.fixture
    def error_handler_with_metrics(self, metrics_collector):
        return ErrorHandler(metrics_collector=metrics_collector)
    
    def test_custom_exceptions(self):
        """Test custom exception classes"""
        # Test OCRVLMError
        error = OCRVLMError("Test error", "TEST_ERROR", {"detail": "test"})
        assert error.message == "Test error"
        assert error.error_code == "TEST_ERROR"
        assert error.details == {"detail": "test"}
        assert isinstance(error.timestamp, datetime)
        
        # Test ValidationError
        validation_error = ValidationError("Validation failed", {"field": "invalid"})
        assert validation_error.message == "Validation failed"
        assert validation_error.error_code == "VALIDATION_ERROR"
        
        # Test ProcessingError
        processing_error = ProcessingError("Processing failed", {"step": "ocr"})
        assert processing_error.message == "Processing failed"
        assert processing_error.error_code == "PROCESSING_ERROR"
    
    @pytest.mark.asyncio
    async def test_handle_error_custom_exception(self, error_handler):
        """Test handling custom exceptions"""
        error = ValidationError("Invalid document", {"size": "too_large"})
        
        result = await error_handler.handle_error(error, {"operation": "validation"}, "validation")
        
        assert "error" in result
        error_info = result["error"]
        assert error_info["code"] == "VALIDATION_ERROR"
        assert error_info["message"] == "Invalid document"
        assert error_info["details"] == {"size": "too_large"}
        assert "timestamp" in error_info
    
    @pytest.mark.asyncio
    async def test_handle_error_generic_exception(self, error_handler):
        """Test handling generic exceptions"""
        error = ValueError("Invalid value")
        
        result = await error_handler.handle_error(error, {"param": "test"}, "processing")
        
        assert "error" in result
        error_info = result["error"]
        assert error_info["code"] == "INTERNAL_ERROR"
        assert error_info["message"] == "Invalid value"
        assert error_info["details"] == {"param": "test"}
    
    @pytest.mark.asyncio
    async def test_handle_error_with_metrics(self, error_handler_with_metrics, metrics_collector):
        """Test error handling with metrics collection"""
        error = ProcessingError("OCR failed", {"model": "tesseract"})
        
        result = await error_handler_with_metrics.handle_error(error, {}, "ocr_processing")
        
        # Verify metrics were recorded
        metrics_collector.increment.assert_called_once_with(
            "ocr_error", 
            tags={"operation": "ocr_processing", "error_type": "ProcessingError"}
        )
        
        # Verify error response
        assert result["error"]["code"] == "PROCESSING_ERROR"
    
    @pytest.mark.asyncio
    async def test_execute_with_retry_success(self, error_handler):
        """Test successful execution with retry"""
        async def successful_operation():
            return "success"
        
        result = await error_handler.execute_with_retry(
            successful_operation, "test_operation"
        )
        
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_execute_with_retry_retryable_error(self, error_handler):
        """Test execution with retryable error"""
        call_count = 0
        
        async def failing_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("Temporary failure")
            return "success after retry"
        
        result = await error_handler.execute_with_retry(
            failing_operation, 
            "test_operation",
            max_attempts=3,
            retry_exceptions=(ConnectionError,)
        )
        
        assert result == "success after retry"
        assert call_count == 3
    
    @pytest.mark.asyncio
    async def test_execute_with_retry_non_retryable_error(self, error_handler):
        """Test execution with non-retryable error"""
        async def failing_operation():
            raise ValueError("Permanent failure")
        
        result = await error_handler.execute_with_retry(
            failing_operation, 
            "test_operation",
            max_attempts=3,
            retry_exceptions=(ConnectionError,)
        )
        
        # Should return error response instead of raising
        assert "error" in result
        assert result["error"]["code"] == "INTERNAL_ERROR"
    
    @pytest.mark.asyncio
    async def test_execute_with_retry_max_attempts(self, error_handler):
        """Test execution reaching max retry attempts"""
        call_count = 0
        
        async def always_failing_operation():
            nonlocal call_count
            call_count += 1
            raise ConnectionError(f"Failure {call_count}")
        
        result = await error_handler.execute_with_retry(
            always_failing_operation, 
            "test_operation",
            max_attempts=2,
            retry_exceptions=(ConnectionError,)
        )
        
        # Should return the last error
        assert "error" in result
        assert result["error"]["code"] == "INTERNAL_ERROR"
        assert call_count == 2
    
    @pytest.mark.asyncio
    async def test_validate_document_success(self, error_handler):
        """Test successful document validation"""
        content = b"test image content"
        filename = "test.jpg"
        
        # Should not raise any exception
        await error_handler.validate_document(content, filename)
    
    @pytest.mark.asyncio
    async def test_validate_document_size_exceeded(self, error_handler):
        """Test document size validation"""
        # Create content larger than default limit (10MB)
        content = b"x" * (11 * 1024 * 1024)  # 11MB
        filename = "test.jpg"
        
        with pytest.raises(ValidationError) as exc_info:
            await error_handler.validate_document(content, filename)
        
        assert "exceeds maximum" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_validate_document_unsupported_format(self, error_handler):
        """Test unsupported file format validation"""
        content = b"test content"
        filename = "test.txt"
        
        with pytest.raises(ValidationError) as exc_info:
            await error_handler.validate_document(content, filename)
        
        assert "Unsupported file type" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_validate_document_empty_content(self, error_handler):
        """Test empty content validation"""
        content = b""
        filename = "test.jpg"
        
        with pytest.raises(ValidationError) as exc_info:
            await error_handler.validate_document(content, filename)
        
        assert "Empty file content" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_create_timeout_handler(self, error_handler):
        """Test timeout handler creation"""
        timeout_handler = await error_handler.create_timeout_handler(timeout_seconds=0.1)
        
        async def slow_operation():
            await asyncio.sleep(1)
            return "done"
        
        with pytest.raises(Exception) as exc_info:
            await timeout_handler(slow_operation)
        
        assert "timed out" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_get_error_stats(self, error_handler_with_metrics, metrics_collector):
        """Test error statistics retrieval"""
        # Mock metrics collector response
        mock_metrics = {
            "ocr_error_ValidationError": {"values": [(datetime.now(), 1), (datetime.now(), 2)]},
            "ocr_error_ProcessingError": {"values": [(datetime.now(), 1)]},
            "ocr_success": {"values": [(datetime.now(), 5), (datetime.now(), 3)]}
        }
        metrics_collector.get_metrics = AsyncMock(return_value=mock_metrics)
        
        stats = await error_handler_with_metrics.get_error_stats(time_window_minutes=60)
        
        assert "total_operations" in stats
        assert "total_errors" in stats
        assert "total_success" in stats
        assert "error_rate" in stats
        assert "error_types" in stats
        
        # Should have 3 errors and 8 successful operations
        assert stats["total_errors"] == 3
        assert stats["total_success"] == 8
        assert stats["total_operations"] == 11
        assert 0 <= stats["error_rate"] <= 100
    
    @pytest.mark.asyncio
    async def test_health_check(self, error_handler):
        """Test health check"""
        health_status = await error_handler.health_check()
        
        assert "status" in health_status
        assert "message" in health_status
        assert "error_stats" in health_status
        assert health_status["status"] in ["healthy", "unhealthy"]
    
    @pytest.mark.asyncio
    async def test_handle_error_nested_failure(self, error_handler):
        """Test error handling when the handler itself fails"""
        # This tests the error handling's own error handling
        result = await error_handler.handle_error(
            Exception("Original error"), 
            {}, 
            "test_operation"
        )
        
        # Should still return a structured error response
        assert "error" in result
        assert result["error"]["code"] == "INTERNAL_ERROR"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])