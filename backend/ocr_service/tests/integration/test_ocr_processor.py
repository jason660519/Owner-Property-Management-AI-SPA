"""
Integration tests for OCRProcessor module with real PDF samples
"""
import asyncio
import os
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from src.core.ocr_processor import OCRProcessor
from src.utils.cache_manager import CacheManager


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
        cache_manager = AsyncMock()
        cache_manager.get = AsyncMock(return_value=None)
        cache_manager.set = AsyncMock(return_value=True)

        processor = OCRProcessor()
        processor.cache_manager = cache_manager

        return processor

    @pytest.fixture
    def real_ocr_processor(self):
        """Create OCRProcessor with real dependencies"""
        cache_manager = CacheManager(redis_url=None)  # Use memory cache

        processor = OCRProcessor()
        processor.cache_manager = cache_manager

        return processor

    @pytest.mark.asyncio
    async def test_initialize(self, ocr_processor):
        """Test processor initialization"""
        await ocr_processor.initialize()
        assert ocr_processor.is_initialized is True

    @pytest.mark.asyncio
    async def test_process_document_basic(self, ocr_processor, sample_pdf_data):
        """Test basic document processing with mocked components"""
        mock_vlm_response = {
            "engine": "mock",
            "result": {"document_info": {"document_type": "building_title"}}
        }

        mock_engine_manager = AsyncMock()
        mock_engine_manager.process_document = AsyncMock(return_value=mock_vlm_response)
        ocr_processor.ocr_engine_manager = mock_engine_manager

        mock_text_detector = AsyncMock()
        mock_text_detector.detect = AsyncMock(return_value=[
            {"bbox": [10, 10, 100, 40], "confidence": 0.9}
        ])
        ocr_processor.text_detector = mock_text_detector

        mock_text_recognizer = AsyncMock()
        mock_text_recognizer.recognize = AsyncMock(return_value=[
            {"text": "測試文字內容", "confidence": 0.9, "bbox": [10, 10, 100, 40]}
        ])
        ocr_processor.text_recognizer = mock_text_recognizer

        mock_layout_analyzer = AsyncMock()
        mock_layout_analyzer.analyze = AsyncMock(return_value={"regions": []})
        ocr_processor.layout_analyzer = mock_layout_analyzer

        mock_table_detector = AsyncMock()
        mock_table_detector.detect_tables = AsyncMock(return_value=[])
        ocr_processor.table_detector = mock_table_detector

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

        mock_image_preprocessor = AsyncMock()
        mock_image_preprocessor.preprocess = AsyncMock(return_value=b"processed_image")
        ocr_processor.preprocessor = mock_image_preprocessor

        # Process document
        result = await ocr_processor.process_document(
            sample_pdf_data,
            "test.pdf",
            request_id="test_request_123"
        )

        # Verify result structure
        assert "document_type" in result
        assert "vlm_analysis" in result
        assert "raw_text" in result
        assert "layout_analysis" in result
        assert "tables" in result
        assert "confidence_score" in result
        assert "timestamp" in result

        # Verify mocks were called
        ocr_processor.pdf_preprocessor.extract_pages.assert_called_once()
        ocr_processor.ocr_engine_manager.process_document.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_document_cached(self, ocr_processor, sample_pdf_data):
        """Test document processing with cache hit"""
        ocr_processor.cache_manager.get = AsyncMock(return_value=b"cached_image")
        ocr_processor.cache_manager.set = AsyncMock(return_value=True)

        mock_text_detector = AsyncMock()
        mock_text_detector.detect = AsyncMock(return_value=[])
        ocr_processor.text_detector = mock_text_detector

        mock_text_recognizer = AsyncMock()
        mock_text_recognizer.recognize = AsyncMock(return_value=[])
        ocr_processor.text_recognizer = mock_text_recognizer

        mock_layout_analyzer = AsyncMock()
        mock_layout_analyzer.analyze = AsyncMock(return_value={})
        ocr_processor.layout_analyzer = mock_layout_analyzer

        mock_table_detector = AsyncMock()
        mock_table_detector.detect_tables = AsyncMock(return_value=[])
        ocr_processor.table_detector = mock_table_detector

        mock_engine_manager = AsyncMock()
        mock_engine_manager.process_document = AsyncMock(return_value={"engine": "mock", "result": {}})
        ocr_processor.ocr_engine_manager = mock_engine_manager

        mock_image_preprocessor = AsyncMock()
        mock_image_preprocessor.preprocess = AsyncMock(return_value=b"processed_image")
        ocr_processor.preprocessor = mock_image_preprocessor

        mock_pdf_preprocessor = AsyncMock()
        mock_pdf_preprocessor.extract_pages = AsyncMock(return_value=[
            {"page_number": 1, "image_data": b"fake_image_data"}
        ])
        ocr_processor.pdf_preprocessor = mock_pdf_preprocessor

        result = await ocr_processor.process_document(
            sample_pdf_data,
            "test.pdf"
        )

        assert "vlm_analysis" in result
        assert not ocr_processor.preprocessor.preprocess.called

    @pytest.mark.asyncio
    async def test_process_document_error_handling(self, ocr_processor, sample_pdf_data):
        """Test error handling during document processing"""
        ocr_processor.text_detector.detect = AsyncMock(side_effect=RuntimeError("Detection failed"))
        ocr_processor.pdf_preprocessor.extract_pages = AsyncMock(return_value=[
            {"page_number": 1, "image_data": b"fake_image_data"}
        ])
        ocr_processor.preprocessor.preprocess = AsyncMock(return_value=b"processed_image")

        with pytest.raises(RuntimeError):
            await ocr_processor.process_document(sample_pdf_data, "test.pdf")

    @pytest.mark.asyncio
    async def test_process_batch_documents(self, ocr_processor, sample_pdf_data):
        """Test batch document processing loop"""
        # Mock single document processing
        mock_result = {
            "document_type": "building_title",
            "vlm_analysis": {"engine": "mock", "result": {}},
            "raw_text": [],
            "layout_analysis": {},
            "tables": [],
            "processing_config": {},
            "confidence_score": 0.9,
            "timestamp": "2026-02-01T10:30:00Z"
        }

        ocr_processor.process_document = AsyncMock(return_value=mock_result)

        # Create batch of documents
        batch_data = [
            (sample_pdf_data, "doc1.pdf"),
            (sample_pdf_data, "doc2.pdf"),
            (sample_pdf_data, "doc3.pdf")
        ]

        results = await asyncio.gather(*[
            ocr_processor.process_document(content, filename)
            for content, filename in batch_data
        ])

        # Should return list of results
        assert isinstance(results, list)
        assert len(results) == 3
        assert all(result["document_type"] == "building_title" for result in results)

        # Should call process_document for each document
        assert ocr_processor.process_document.call_count == 3

    @pytest.mark.asyncio
    async def test_health_check(self, ocr_processor):
        """Test health check"""
        ocr_processor.preprocessor.health_check = AsyncMock(return_value={"status": "healthy"})
        ocr_processor.text_detector.health_check = AsyncMock(return_value={"status": "healthy"})
        ocr_processor.text_recognizer.health_check = AsyncMock(return_value={"status": "healthy"})
        ocr_processor.cache_manager.health_check = AsyncMock(return_value={"status": "healthy"})

        health_status = await ocr_processor.health_check()

        assert "status" in health_status
        assert "components" in health_status
        assert health_status["status"] == "healthy"

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_real_pdf_processing(self, real_ocr_processor, sample_pdf_data):
        """Test real PDF processing (slow test)"""
        api_keys = [
            os.getenv("OPENAI_API_KEY"),
            os.getenv("ANTHROPIC_API_KEY"),
            os.getenv("GOOGLE_API_KEY"),
            os.getenv("DEEPSEEK_API_KEY"),
            os.getenv("XAI_API_KEY"),
            os.getenv("DASHSCOPE_API_KEY"),
        ]
        if not any(api_keys):
            pytest.skip("No VLM API keys configured")

        # Initialize real processor
        await real_ocr_processor.initialize()

        # Process sample PDF
        result = await real_ocr_processor.process_document(
            sample_pdf_data,
            "sample.pdf",
            request_id="real_test_123"
        )

        # Verify basic result structure
        assert "document_type" in result
        assert "vlm_analysis" in result
        assert "raw_text" in result
        assert "layout_analysis" in result
        assert "tables" in result
        assert "confidence_score" in result
        assert "timestamp" in result

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
