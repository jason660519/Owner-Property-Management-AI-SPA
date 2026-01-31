"""
Integration tests for API endpoints using TestClient
"""
import pytest
import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.routes.ocr import router


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
                "status": "success",
                "data": {
                    "building_info": {
                        "building_number": "123456",
                        "address": "測試地址",
                        "construction_date": "2023-01-01"
                    }
                },
                "processing_time": 1.5,
                "request_id": "test_request_123"
            })
            mock_instance.process_batch_documents = AsyncMock(return_value=[
                {"status": "success", "data": {"doc": 1}, "processing_time": 1.0},
                {"status": "success", "data": {"doc": 2}, "processing_time": 1.2}
            ])
            mock_instance.health_check = AsyncMock(return_value={
                "status": "healthy",
                "components": {"cache": "healthy", "vlm": "healthy"},
                "system_metrics": {"uptime": 3600, "requests_processed": 100}
            })
            mock.return_value = mock_instance
            yield mock_instance
    
    def test_health_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
    
    def test_health_detailed_endpoint(self, client, mock_ocr_processor):
        """Test detailed health check endpoint"""
        response = client.get("/health/detailed")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "components" in data
        assert "system_metrics" in data
    
    @pytest.mark.asyncio
    async def test_ocr_single_endpoint(self, client, mock_ocr_processor, sample_pdf_data):
        """Test single document OCR endpoint"""
        # Create test file
        files = {"file": ("test.pdf", sample_pdf_data, "application/pdf")}
        data = {
            "document_type": "building_title",
            "language": "zh-TW",
            "enhance_quality": "true"
        }
        
        response = client.post("/ocr/single", files=files, data=data)
        
        assert response.status_code == 200
        result = response.json()
        
        assert "status" in result
        assert "data" in result
        assert "processing_time" in result
        assert "request_id" in result
        assert result["status"] == "success"
        
        # Verify processor was called with correct parameters
        mock_ocr_processor.process_document.assert_called_once()
        call_args = mock_ocr_processor.process_document.call_args
        assert call_args[0][1] == "test.pdf"  # filename
        assert call_args[1]["document_type"] == "building_title"
        assert call_args[1]["language"] == "zh-TW"
    
    @pytest.mark.asyncio
    async def test_ocr_single_endpoint_invalid_file(self, client):
        """Test single document endpoint with invalid file"""
        files = {"file": ("test.txt", b"invalid content", "text/plain")}
        
        response = client.post("/ocr/single", files=files)
        
        assert response.status_code == 400
        error = response.json()
        assert "detail" in error
        assert "Unsupported file type" in error["detail"]
    
    @pytest.mark.asyncio
    async def test_ocr_single_endpoint_empty_file(self, client):
        """Test single document endpoint with empty file"""
        files = {"file": ("empty.pdf", b"", "application/pdf")}
        
        response = client.post("/ocr/single", files=files)
        
        assert response.status_code == 400
        error = response.json()
        assert "detail" in error
        assert "Empty file content" in error["detail"]
    
    @pytest.mark.asyncio
    async def test_ocr_batch_endpoint(self, client, mock_ocr_processor, sample_pdf_data):
        """Test batch document OCR endpoint"""
        # Create multiple test files
        files = [
            ("files", ("doc1.pdf", sample_pdf_data, "application/pdf")),
            ("files", ("doc2.pdf", sample_pdf_data, "application/pdf"))
        ]
        
        data = {
            "document_type": "building_register",
            "language": "zh-TW"
        }
        
        response = client.post("/ocr/batch", files=files, data=data)
        
        assert response.status_code == 200
        results = response.json()
        
        assert isinstance(results, list)
        assert len(results) == 2
        assert all(result["status"] == "success" for result in results)
        
        # Verify batch processor was called
        mock_ocr_processor.process_batch_documents.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ocr_batch_endpoint_too_many_files(self, client, sample_pdf_data):
        """Test batch endpoint with too many files"""
        # Create more files than the limit (default 10)
        files = []
        for i in range(11):
            files.append(("files", (f"doc{i}.pdf", sample_pdf_data, "application/pdf")))
        
        response = client.post("/ocr/batch", files=files)
        
        assert response.status_code == 400
        error = response.json()
        assert "detail" in error
        assert "exceeds maximum" in error["detail"]
    
    def test_metrics_endpoint(self, client):
        """Test metrics endpoint"""
        response = client.get("/metrics")
        
        assert response.status_code == 200
        data = response.json()
        assert "system" in data
        assert "performance" in data
        assert "errors" in data
    
    def test_document_types_endpoint(self, client):
        """Test document types endpoint"""
        response = client.get("/document-types")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check that each type has required fields
        for doc_type in data:
            assert "id" in doc_type
            assert "name" in doc_type
            assert "description" in doc_type
            assert "supported_formats" in doc_type
    
    def test_languages_endpoint(self, client):
        """Test supported languages endpoint"""
        response = client.get("/languages")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Should include common languages
        language_codes = [lang["code"] for lang in data]
        assert "zh-TW" in language_codes
        assert "en" in language_codes
    
    @pytest.mark.asyncio
    async def test_async_processing_status(self, client, mock_ocr_processor):
        """Test async processing status endpoint"""
        # First submit a job
        files = {"file": ("test.pdf", b"fake pdf content", "application/pdf")}
        response = client.post("/ocr/async", files=files)
        
        assert response.status_code == 202
        data = response.json()
        assert "job_id" in data
        assert "status_url" in data
        
        job_id = data["job_id"]
        
        # Check status
        status_response = client.get(f"/ocr/async/{job_id}/status")
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert "job_id" in status_data
        assert "status" in status_data
        assert "progress" in status_data
    
    def test_invalid_endpoint(self, client):
        """Test invalid endpoint returns 404"""
        response = client.get("/invalid-endpoint")
        assert response.status_code == 404
    
    def test_rate_limiting(self, client):
        """Test rate limiting (if implemented)"""
        # Make multiple rapid requests
        for _ in range(5):
            response = client.get("/health")
            assert response.status_code == 200
        
        # If rate limiting is enabled, the 6th request might be limited
        response = client.get("/health")
        # Should still be 200 unless rate limiting is very strict
        assert response.status_code in [200, 429]
    
    def test_cors_headers(self, client):
        """Test CORS headers are present"""
        response = client.options("/health")
        
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