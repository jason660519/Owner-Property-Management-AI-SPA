from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.core.search_client import get_search_client as get_search_client_dependency


# Fixture for TestClient
@pytest.fixture
def client():
    return TestClient(app)

# Mock the search client
@pytest.fixture
def mock_search_client():
    # We patch the dependency injection point or the function that returns the client
    # In search.py: search_client: SearchClient = Depends(get_search_client)
    # We can override the dependency
    mock_client = AsyncMock()
    app.dependency_overrides[get_search_client_dependency] = lambda: mock_client
    yield mock_client
    app.dependency_overrides = {}

def test_search_documents(client, mock_search_client):
    # Setup mock response
    mock_search_client.search_documents.return_value = {
        "took": 5,
        "hits": {
            "total": {"value": 1},
            "hits": [
                {
                    "_id": "doc1",
                    "_score": 1.5,
                    "_source": {
                        "document_id": "doc1",
                        "owner_name": "陳大明",
                        "property_address": "台北市信義區...",
                        "ocr_text": "..."
                    },
                    "highlight": {
                        "owner_name": ["<em>陳</em>大明"]
                    }
                }
            ]
        }
    }

    # TestClient runs sync, but calls async app code.
    # The async mock should work fine because the app is running in an event loop managed by Starlette/FastAPI TestClient?
    # Actually TestClient uses a separate thread or sync adapter.
    # For async mocks to work, we usually need AsyncClient with pytest-asyncio.
    # But let's try TestClient first as it's simpler.

    response = client.get("/api/v1/search/documents?q=陳大明")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["results"]) == 1
    assert data["results"][0]["owner_name"] == "陳大明"
    assert data["results"][0]["highlight"]["owner_name"] == ["<em>陳</em>大明"]

def test_get_owner_property_count(client, mock_search_client):
    # Setup mock response
    mock_search_client.count_properties_by_owner.return_value = 5

    response = client.get("/api/v1/search/stats/owner/陳大明")

    assert response.status_code == 200
    data = response.json()
    assert data["owner_name"] == "陳大明"
    assert data["property_count"] == 5

    # Verify client call. Since we are in sync test, we can check the mock.
    # Note: TestClient runs the app, which awaits the mock.
    mock_search_client.count_properties_by_owner.assert_called_with("陳大明")
