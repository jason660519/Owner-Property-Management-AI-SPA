"""
ID132 integration tests for people-db API contract.
"""
from unittest.mock import AsyncMock, MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.routes import people_db
from src.core.people_db_client import get_people_db_client
from src.core.supabase_client import get_supabase_client


def _build_test_client(mock_db_client: MagicMock, mock_supabase_client: MagicMock) -> TestClient:
    app = FastAPI()
    app.include_router(people_db.router)

    app.dependency_overrides[get_people_db_client] = lambda: mock_db_client
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase_client
    return TestClient(app)


def test_search_contract_supports_quality_dataset_and_pagination():
    mock_db = MagicMock()
    mock_db.search_documents = AsyncMock(
        return_value={
            "hits": {
                "total": {"value": 1},
                "hits": [
                    {
                        "_score": 31.5,
                        "_source": {
                            "record_id": "rec-132-1",
                            "name": "闕貴卿",
                            "id_number": "A123456789",
                            "phone": "27851310",
                            "address": "重陽路504巷弄9號",
                            "data_source": "台北市里長樣本",
                            "quality_score": 0.93,
                            "ocr_confidence": 0.97,
                            "import_batch_id": "batch-132",
                            "source_file_path": "samples/taipei/11051723680.pdf",
                            "source_document_id": "doc-132",
                            "created_at": "2026-04-13T12:00:00Z",
                        },
                    }
                ],
            },
            "took": 12,
        }
    )
    mock_db.get_data_source_facets = AsyncMock(return_value=[])
    mock_db.get_stats = AsyncMock(return_value={})

    mock_supabase = MagicMock()
    mock_supabase.list_recent_import_batches = AsyncMock(return_value=[])

    client = _build_test_client(mock_db, mock_supabase)

    response = client.get(
        "/api/v1/people-db/search",
        params=[
            ("q", "27851310"),
            ("data_sources", "台北市里長樣本"),
            ("quality", "high"),
            ("page", "2"),
            ("page_size", "20"),
        ],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["page"] == 2
    assert body["page_size"] == 20
    assert body["results"][0]["full_name"] == "闕貴卿"
    assert body["results"][0]["source_file_path"] == "samples/taipei/11051723680.pdf"
    assert body["results"][0]["import_batch_id"] == "batch-132"

    assert mock_db.search_documents.await_count == 1
    kwargs = mock_db.search_documents.await_args.kwargs
    assert kwargs["query_text"] == "27851310"
    assert kwargs["limit"] == 20
    assert kwargs["offset"] == 20
    assert kwargs["filters"]["data_sources"] == ["台北市里長樣本"]
    assert kwargs["filters"]["min_quality_score"] == 0.8
    assert kwargs["filters"]["max_quality_score"] is None


def test_datasets_endpoint_returns_facet_list():
    mock_db = MagicMock()
    mock_db.search_documents = AsyncMock(return_value={})
    mock_db.get_data_source_facets = AsyncMock(
        return_value=[
            {"key": "台北市里長樣本", "count": 10},
            {"key": "企業名錄", "count": 7},
        ]
    )
    mock_db.get_stats = AsyncMock(return_value={})
    mock_supabase = MagicMock()
    mock_supabase.list_recent_import_batches = AsyncMock(return_value=[])

    client = _build_test_client(mock_db, mock_supabase)
    response = client.get("/api/v1/people-db/datasets")

    assert response.status_code == 200
    body = response.json()
    assert len(body["datasets"]) == 2
    assert body["datasets"][0] == {"key": "台北市里長樣本", "count": 10}


def test_import_batches_endpoint_returns_history_for_visualization():
    mock_db = MagicMock()
    mock_db.search_documents = AsyncMock(return_value={})
    mock_db.get_data_source_facets = AsyncMock(return_value=[])
    mock_db.get_stats = AsyncMock(return_value={})
    mock_supabase = MagicMock()
    mock_supabase.list_recent_import_batches = AsyncMock(
        return_value=[
            {
                "id": "batch-132",
                "label": "2026Q2 台北市里長樣本",
                "data_source": "台北市里長樣本",
                "status": "completed",
                "total_records": 120,
                "processed_records": 120,
                "skipped_records": 0,
                "imported_by": "00000000-0000-0000-0000-000000000132",
                "created_at": "2026-04-13T12:00:00Z",
                "updated_at": "2026-04-13T12:30:00Z",
                "error_message": None,
            }
        ]
    )

    client = _build_test_client(mock_db, mock_supabase)
    response = client.get("/api/v1/people-db/import/batches?limit=8")

    assert response.status_code == 200
    body = response.json()
    assert len(body["batches"]) == 1
    assert body["batches"][0]["batch_id"] == "batch-132"
    assert body["batches"][0]["status"] == "completed"
    assert body["batches"][0]["processed_records"] == 120
