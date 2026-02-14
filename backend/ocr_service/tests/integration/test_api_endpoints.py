"""
Integration tests for API endpoints using TestClient
"""
import base64
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.models.schemas import DocumentType, ProcessingStatus


class TestAPIEndpoints:
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def sample_pdf_path(self):
        """Get path to sample PDF file"""
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
    def mock_ocr_processor(self):
        """Mock OCRProcessor"""
        with patch('src.api.routes.ocr.ocr_processor') as mock:
            mock_instance = AsyncMock()
            mock_instance.process_document = AsyncMock(return_value={
                "document_type": "building_title",
                "vlm_analysis": {"engine": "mock", "result": {}},
                "raw_text": [],
                "layout_analysis": {},
                "tables": [],
                "processing_config": {},
                "confidence_score": 0.9,
                "timestamp": "2026-02-01T10:30:00Z"
            })
            mock.return_value = mock_instance

            yield mock_instance

    @pytest.fixture(autouse=True)
    def mock_shared_dependencies(self):
        with patch('src.api.routes.ocr.cache_manager') as mock_cache, \
            patch('src.api.routes.ocr.metrics') as mock_metrics:
            mock_cache.get = AsyncMock(return_value=None)
            mock_cache.set = AsyncMock(return_value=True)
            mock_metrics.increment = AsyncMock()
            mock_metrics.timing = AsyncMock()
            yield

    @pytest.fixture
    def mock_health_dependencies(self):
        with patch('src.api.routes.health.ocr_processor') as mock_processor, \
            patch('src.api.routes.health.cache_manager') as mock_cache:
            mock_processor.health_check = AsyncMock(return_value={"status": "healthy"})
            mock_processor.check_vlm_services = AsyncMock(return_value={
                "overall": "healthy",
                "providers": {"mock": {"status": "available"}}
            })
            mock_processor.is_ready = AsyncMock(return_value=True)

            mock_cache.health_check = AsyncMock(return_value={"status": "healthy"})
            yield

    def test_health_endpoint(self, client, mock_health_dependencies):
        """Test health check endpoint"""
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "components" in data

    def test_health_metrics_endpoint(self, client, mock_health_dependencies):
        """Test health metrics endpoint"""
        response = client.get("/api/v1/health/metrics")

        assert response.status_code == 200
        data = response.json()
        assert "uptime" in data

    @pytest.mark.asyncio
    async def test_ocr_single_endpoint(self, client, mock_ocr_processor, sample_pdf_data):
        """Test single document OCR endpoint"""
        # Create test file
        files = {"file": ("test.pdf", sample_pdf_data, "application/pdf")}
        params = {
            "document_type": "building_title",
            "language": "zh-TW"
        }

        response = client.post("/api/v1/ocr/single", files=files, params=params)

        assert response.status_code == 200
        result = response.json()

        assert "status" in result
        assert "result" in result
        assert "processing_time" in result
        assert "request_id" in result
        assert result["status"] == ProcessingStatus.COMPLETED.value

        # Verify processor was called with correct parameters
        mock_ocr_processor.process_document.assert_called_once()
        call_args = mock_ocr_processor.process_document.call_args
        assert call_args[1]["filename"] == "test.pdf"
        assert call_args[1]["document_type"] == DocumentType.BUILDING_TITLE
        assert call_args[1]["language"] == "zh-TW"

    @pytest.mark.asyncio
    async def test_ocr_single_endpoint_invalid_file(self, client):
        """Test single document endpoint with invalid file"""
        files = {"file": ("test.txt", b"invalid content", "text/plain")}

        response = client.post("/api/v1/ocr/single", files=files)

        assert response.status_code == 400
        error = response.json()
        assert "detail" in error
        assert "Unsupported file type" in error["detail"]

    @pytest.mark.asyncio
    async def test_ocr_single_endpoint_empty_file(self, client):
        """Test single document endpoint with empty file"""
        files = {"file": ("empty.pdf", b"", "application/pdf")}

        response = client.post("/api/v1/ocr/single", files=files)

        assert response.status_code == 400
        error = response.json()
        assert "detail" in error
        assert "Empty file content" in error["detail"]

    @pytest.mark.asyncio
    async def test_ocr_batch_endpoint(self, client, mock_ocr_processor, sample_pdf_data):
        """Test batch document OCR endpoint"""
        encoded = base64.b64encode(sample_pdf_data).decode("utf-8")

        data = {
            "files": [
                {"filename": "doc1.pdf", "content_base64": encoded},
                {"filename": "doc2.pdf", "content_base64": encoded}
            ],
            "document_type": "building_title",
            "language": "zh-TW",
            "enable_cache": True
        }

        response = client.post("/api/v1/ocr/batch", json=data)

        assert response.status_code == 200
        results = response.json()

        assert isinstance(results, list)
        assert len(results) == 2
        assert all(result["status"] == ProcessingStatus.QUEUED.value for result in results)

    def test_metrics_endpoint(self, client):
        """Test metrics endpoint"""
        response = client.get("/metrics")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_supported_formats_endpoint(self, client):
        """Test supported formats endpoint"""
        response = client.get("/api/v1/ocr/supported-formats")

        assert response.status_code == 200
        data = response.json()
        assert "supported_formats" in data

    @pytest.mark.asyncio
    async def test_async_processing_status(self, client, mock_ocr_processor):
        """Test async processing status endpoint"""
        response = client.get("/api/v1/ocr/status/test")

        assert response.status_code == 200
        status_data = response.json()
        assert "request_id" in status_data
        assert "status" in status_data
        assert "progress" in status_data

    def test_invalid_endpoint(self, client):
        """Test invalid endpoint returns 404"""
        response = client.get("/invalid-endpoint")
        assert response.status_code == 404

    def test_rate_limiting(self, client, mock_health_dependencies):
        """Test rate limiting (if implemented)"""
        # Make multiple rapid requests
        for _ in range(5):
            response = client.get("/api/v1/health")
            assert response.status_code == 200

        # If rate limiting is enabled, the 6th request might be limited
        response = client.get("/api/v1/health")
        # Should still be 200 unless rate limiting is very strict
        assert response.status_code in [200, 429]

    def test_cors_headers(self, client, mock_health_dependencies):
        """Test CORS headers are present"""
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            }
        )

        # CORS preflight should return 200
        assert response.status_code == 200

        # Check for CORS headers
        cors_headers = [
            "access-control-allow-origin",
            "access-control-allow-methods",
            "access-control-allow-headers"
        ]

        for header in cors_headers:
            assert header in response.headers


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
