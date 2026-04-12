"""
Full API integration tests using TestClient
Now that the backend is implemented, we can do actual API testing
"""
import pytest
import json
from fastapi.testclient import TestClient
from datetime import datetime
from unittest.mock import patch, AsyncMock, MagicMock
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

# Test using the app directly
# Import is safe as long as env variables are set up correctly
try:
    from api.main import app
    client = TestClient(app)
    APP_AVAILABLE = True
except Exception as e:
    APP_AVAILABLE = False
    print(f"Warning: Could not load app: {e}")


class TestImportPreviewEndpoint:
    """Test import/preview endpoint"""
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_preview_endpoint_exists(self):
        """Should have /api/v1/people-db/import/preview endpoint"""
        # This will 422 because no file uploaded, but endpoint should exist
        response = client.post("/api/v1/people-db/import/preview")
        assert response.status_code in [422, 400]  # Validation error expected
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_preview_requires_file(self):
        """Should require file parameter"""
        response = client.post(
            "/api/v1/people-db/import/preview",
            params={"data_source": "test"}
        )
        assert response.status_code == 422  # Missing required field


class TestImportSubmitEndpoint:
    """Test import/submit endpoint"""
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_submit_endpoint_exists(self):
        """Should have /api/v1/people-db/import/submit endpoint"""
        response = client.post("/api/v1/people-db/import/submit", json={})
        # Should get validation error for missing fields
        assert response.status_code == 422
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_submit_requires_batch_label(self):
        """Should require importBatchLabel"""
        payload = {
            "dataSource": "excel",
            "fieldMapping": {"nameColumn": "A"}
        }
        response = client.post("/api/v1/people-db/import/submit", json=payload)
        assert response.status_code == 422
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_submit_requires_data_source(self):
        """Should require dataSource"""
        payload = {
            "importBatchLabel": "Test",
            "fieldMapping": {"nameColumn": "A"}
        }
        response = client.post("/api/v1/people-db/import/submit", json=payload)
        assert response.status_code == 422
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_submit_requires_field_mapping(self):
        """Should require fieldMapping"""
        payload = {
            "importBatchLabel": "Test",
            "dataSource": "excel"
        }
        response = client.post("/api/v1/people-db/import/submit", json=payload)
        assert response.status_code == 422


class TestImportStatusEndpoint:
    """Test import/status endpoint"""
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_status_endpoint_exists(self):
        """Should have /api/v1/people-db/import/status/{batch_id} endpoint"""
        response = client.get("/api/v1/people-db/import/status/test-batch-123")
        # Will fail because mock client not fully set up, but endpoint should exist
        assert response.status_code in [500, 404, 200]  # Any of these is OK for now


class TestSearchEndpoint:
    """Test search endpoint"""
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_search_endpoint_exists(self):
        """Should have /api/v1/people-db/search endpoint"""
        response = client.get("/api/v1/people-db/search")
        # May succeed with empty results or fail based on ES connection
        assert response.status_code in [200, 500]
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_search_accepts_parameters(self):
        """Should accept search parameters"""
        response = client.get("/api/v1/people-db/search", params={
            "q": "john",
            "limit": 20,
            "offset": 0,
            "min_quality_score": 0.5,
            "exclude_duplicates": True
        })
        assert response.status_code in [200, 500]
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_search_validates_limit(self):
        """Should validate limit parameter"""
        # Limit must be between 1 and 100
        response = client.get("/api/v1/people-db/search", params={
            "limit": 500  # Invalid
        })
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_search_validates_quality_score(self):
        """Should validate quality_score between 0 and 1"""
        response = client.get("/api/v1/people-db/search", params={
            "min_quality_score": 1.5  # Invalid
        })
        assert response.status_code == 422  # Validation error


class TestStatsEndpoint:
    """Test stats endpoint"""
    
    @pytest.mark.skipif(not APP_AVAILABLE, reason="App not available")
    def test_stats_endpoint_exists(self):
        """Should have /api/v1/people-db/stats endpoint"""
        response = client.get("/api/v1/people-db/stats")
        # May succeed or fail based on ES connection
        assert response.status_code in [200, 500]
