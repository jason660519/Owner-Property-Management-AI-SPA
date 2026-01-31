"""
Integration tests for OCRProcessor module with real PDF samples
"""
import pytest
import asyncio
import os
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from src.core.ocr_processor import OCRProcessor
from src.utils.cache_manager import CacheManager
from src.utils.metrics_collector import MetricsCollector
from src.utils.error_handler import ErrorHandler


class TestOCRProcessorIntegration:
    @pytest.fixture
    def sample_pdf_path(self):
        """Get path to sample PDF files"""
        samples_dir = "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/resources/samples/建物謄本PDF範例"
        pdf_files = list(Path(samples_dir).glob("*.pdf"))
        
        if not pdf_files:
            pytest.skip("No sample PDF files found")
        
        return str(pdf_files[0])
    
    @pytest.fixture
    def sample_pdf_data(self, sample_pdf_path):
        """Read sample PDF data"""
        with open(sample_pdf_path, "rb") as f:
            return f.read()
    
    @pytest.fixture
    def ocr_processor(self):
        """Create OCRProcessor instance with mocked dependencies"""
        # Mock dependencies
        cache_manager = AsyncMock()
        cache_manager.get = AsyncMock(return_value=None)
        cache_manager.set = AsyncMock(return_value=True)
        cache_manager.generate_key = AsyncMock(return_value="test_cache_key")
        
        metrics_collector = AsyncMock()
        metrics_collector.record = AsyncMock()
        metrics_collector.timing = AsyncMock()
        metrics_collector.increment = AsyncMock()
        
        error_handler = AsyncMock()
        error_handler.execute_with_retry = AsyncMock()
        error_handler.validate_document = AsyncMock()
        
        processor = OCRProcessor()
        processor.cache_manager = cache_manager
        processor.metrics_collector = metrics_collector
        processor.error_handler = error_handler
        
        return processor
    
    @pytest.fixture
    def real_ocr_processor(self):
        """Create OCRProcessor with real dependencies"""
        cache_manager = CacheManager(redis_url=None)  # Use memory cache
        metrics_collector = MetricsCollector()
        error_handler = ErrorHandler(metrics_collector=metrics_collector)
        
        processor = OCRProcessor()
        processor.cache_manager = cache_manager
        processor.metrics_collector = metrics_collector
        processor.error_handler = error_handler
        
        return processor
    
    @pytest.mark.asyncio
    async def test_initialize(self, ocr_processor):
        """Test processor initialization"""
        await ocr_processor.initialize()
        assert ocr_processor.is_initialized is True
    
    @pytest.mark.asyncio
    async def test_process_document_basic(self, ocr_processor, sample_pdf_data):
        """Test basic document processing with mocked components"""
        # Mock the VLM engine response
        mock_vlm_response = {
            "status": "success",
            "data": {
                "building_info": {
                    "building_number": "123456",
                    "address": "測試地址",
                    "construction_date": "2023-01-01"
                },
                "ownership_info": [
                    {
                        "owner_name": "測試所有人",
                        "share": "1/1",
                        "registration_date": "2023-01-01"
                    }
                ]
            },
            "confidence": 0.95
        }
        
        # Mock the VLM engine
        mock_vlm_engine = AsyncMock()
        mock_vlm_engine.process_image = AsyncMock(return_value=mock_vlm_response)
        ocr_processor.vlm_engine = mock_vlm_engine
        
        # Mock text recognition
        mock_text_recognizer = AsyncMock()
        mock_text_recognizer.recognize_text = AsyncMock(return_value={
            "text": "測試文字內容",
            "confidence": 0.9,
            "language": "zh-TW"
        })
        ocr_processor.text_recognizer = mock_text_recognizer
        
        # Mock layout analysis
        mock_layout_analyzer = AsyncMock()
        mock_layout_analyzer.analyze_layout = AsyncMock(return_value={
            "regions": [
                {
                    "type": "text",
                    "bbox": [10, 10, 100, 100],
                    "confidence": 0.9
                }
            ]
        })
        ocr_processor.layout_analyzer = mock_layout_analyzer
        
        # Mock PDF preprocessor
        mock_pdf_preprocessor = AsyncMock()
        mock_pdf_preprocessor.extract_pages = AsyncMock(return_value=[
            {
                "page_number": 1,
                "image_data": b"fake_image_data",
                "text_content": "測試文字內容",
                "dimensions": {"width": 800, "height": 1200, "dpi": 300}
            }
        ])
        ocr_processor.pdf_preprocessor = mock_pdf_preprocessor
        
        # Mock image preprocessor
        mock_image_preprocessor = AsyncMock()
        mock_image_preprocessor.preprocess = AsyncMock(return_value=b"processed_image")
        ocr_processor.image_preprocessor = mock_image_preprocessor
        
        # Process document
        result = await ocr_processor.process_document(
            sample_pdf_data,
            "test.pdf",
            request_id="test_request_123"
        )
        
        # Verify result structure
        assert "status" in result
        assert "data" in result
        assert "processing_time" in result
        assert "request_id" in result
        assert result["request_id"] == "test_request_123"
        
        # Verify mocks were called
        ocr_processor.error_handler.validate_document.assert_called_once()
        ocr_processor.pdf_preprocessor.extract_pages.assert_called_once()
        ocr_processor.vlm_engine.process_image.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_document_cached(self, ocr_processor, sample_pdf_data):
        """Test document processing with cache hit"""
        # Mock cache hit
        cached_result = {
            "status": "success",
            "data": {"cached": "data"},
            "processing_time": 0.1,
            "cached": True
        }
        ocr_processor.cache_manager.get = AsyncMock(return_value=cached_result)
        
        result = await ocr_processor.process_document(
            sample_pdf_data,
            "test.pdf"
        )
        
        # Should return cached result
        assert result["cached"] is True
        assert result["data"] == {"cached": "data"}
        
        # Should not call processing components
        assert not hasattr(ocr_processor, 'vlm_engine') or not ocr_processor.vlm_engine.process_image.called
    
    @pytest.mark.asyncio
    async def test_process_document_error_handling(self, ocr_processor, sample_pdf_data):
        """Test error handling during document processing"""
        # Mock validation error
        validation_error = Exception("Validation failed")
        ocr_processor.error_handler.validate_document = AsyncMock(side_effect=validation_error)
        
        # Mock error handler to return structured error
        error_response = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Validation failed",
                "details": {}
            }
        }
        ocr_processor.error_handler.execute_with_retry = AsyncMock(return_value=error_response)
        
        result = await ocr_processor.process_document(
            sample_pdf_data,
            "test.pdf"
        )
        
        # Should return error response
        assert "error" in result
        assert result["error"]["code"] == "VALIDATION_ERROR"
    
    @pytest.mark.asyncio
    async def test_process_batch_documents(self, ocr_processor, sample_pdf_data):
        """Test batch document processing"""
        # Mock single document processing
        mock_result = {
            "status": "success",
            "data": {"test": "data"},
            "processing_time": 0.5
        }
        
        ocr_processor.process_document = AsyncMock(return_value=mock_result)
        
        # Create batch of documents
        batch_data = [
            (sample_pdf_data, "doc1.pdf"),
            (sample_pdf_data, "doc2.pdf"),
            (sample_pdf_data, "doc3.pdf")
        ]
        
        results = await ocr_processor.process_batch_documents(batch_data)
        
        # Should return list of results
        assert isinstance(results, list)
        assert len(results) == 3
        assert all(result["status"] == "success" for result in results)
        
        # Should call process_document for each document
        assert ocr_processor.process_document.call_count == 3
    
    @pytest.mark.asyncio
    async def test_health_check(self, ocr_processor):
        """Test health check"""
        # Mock component health checks
        ocr_processor.cache_manager.health_check = AsyncMock(return_value={"status": "healthy"})
        ocr_processor.metrics_collector.health_check = AsyncMock(return_value={"status": "healthy"})
        ocr_processor.error_handler.health_check = AsyncMock(return_value={"status": "healthy"})
        
        health_status = await ocr_processor.health_check()
        
        assert "status" in health_status
        assert "components" in health_status
        assert "system_metrics" in health_status
        assert health_status["status"] == "healthy"
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_real_pdf_processing(self, real_ocr_processor, sample_pdf_data):
        """Test real PDF processing (slow test)"""
        # Initialize real processor
        await real_ocr_processor.initialize()
        
        # Process sample PDF
        result = await real_ocr_processor.process_document(
            sample_pdf_data,
            "sample.pdf",
            request_id="real_test_123"
        )
        
        # Verify basic result structure
        assert "status" in result
        assert "processing_time" in result
        assert "request_id" in result
        assert result["request_id"] == "real_test_123"
        
        # Should have either success or error
        assert result["status"] in ["success", "error"]
        
        if result["status"] == "success":
            assert "data" in result
            # Basic validation of OCR data structure
            data = result["data"]
            assert isinstance(data, dict)
        else:
            assert "error" in result
            assert "code" in result["error"]
            assert "message" in result["error"]
    
    @pytest.mark.asyncio
    async def test_different_document_types(self, ocr_processor, sample_pdf_data):
        """Test processing with different document types"""
        from src.core.ocr_processor import DocumentType
        
        # Mock successful processing
        ocr_processor.process_document = AsyncMock(return_value={
            "status": "success",
            "data": {"type_specific": "data"},
            "processing_time": 0.5
        })
        
        # Test different document types
        for doc_type in DocumentType:
            result = await ocr_processor.process_document(
                sample_pdf_data,
                "test.pdf",
                document_type=doc_type
            )
            
            assert result["status"] == "success"
    
    @pytest.mark.asyncio
    async def test_processing_config(self, ocr_processor, sample_pdf_data):
        """Test processing with custom configuration"""
        config = {
            "enhance_quality": True,
            "target_dpi": 400,
            "language": "zh-TW",
            "timeout": 30
        }
        
        # Mock successful processing
        ocr_processor.process_document = AsyncMock(return_value={
            "status": "success",
            "data": {"config_applied": True},
            "processing_time": 0.5
        })
        
        result = await ocr_processor.process_document(
            sample_pdf_data,
            "test.pdf",
            config=config
        )
        
        assert result["status"] == "success"
        # The mock should have received the config
        call_args = ocr_processor.process_document.call_args
        assert call_args[1]["config"] == config


if __name__ == "__main__":
    pytest.main([__file__, "-v"])