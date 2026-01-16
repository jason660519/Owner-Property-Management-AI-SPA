"""
pytest configuration and shared fixtures
"""

import json
from pathlib import Path
from typing import Any, Dict

import pytest


@pytest.fixture
def project_root() -> Path:
    """Return the project root directory"""
    return Path(__file__).parent.parent.parent.parent


@pytest.fixture
def sample_pdf_dir(project_root: Path) -> Path:
    """Return the sample PDF directory"""
    return project_root / "resources" / "samples" / "建物謄本PDF範例"


@pytest.fixture
def test_fixtures_dir() -> Path:
    """Return the test fixtures directory"""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_jason_json() -> Dict[str, Any]:
    """
    Sample Jason JSON structure based on OCR規劃報告.md

    This fixture provides a valid Jason JSON structure for testing
    """
    return {
        "metadata": {
            "document_id": "123e4567-e89b-12d3-a456-426614174000",
            "property_id": "123e4567-e89b-12d3-a456-426614174001",
            "source_file": "102AF006705REG0A2576B0A7DBC47979B11B77DF4B1E4FE.pdf",
            "processed_at": "2026-01-16T08:00:00Z",
            "ocr_engine": {
                "name": "DeepSeek-OCR",
                "version": "v2025.12-int4",
                "confidence": 0.94,
            },
        },
        "register_office": "臺北市松山地政事務所",
        "document_type": "建物所有權狀謄本",
        "sections": {
            "basic": {
                "build_register_number": "松山建字第000000號",
                "land_register_numbers": ["松山段一小段0000地號"],
                "survey_date": "2023-11-15",
                "registration_date": "2023-12-01",
                "registration_reason": "繼承",
            },
            "ownerships": [
                {
                    "holder": {
                        "name": "王大明",
                        "id_number_masked": "A123***789",
                        "address": "臺北市松山區XXX",
                        "contact": None,
                    },
                    "share_ratio": "1/1",
                    "acquisition_reason": "繼承",
                    "acquisition_date": "2023-12-01",
                }
            ],
            "building_profile": {
                "location": "臺北市松山區八德路四段200號",
                "structure": "鋼筋混凝土造",
                "main_use": "住家用",
                "floors": {"above_ground": 12, "underground": 0},
                "completion_date": "2015-07-30",
            },
            "area_summary": {
                "units": "square_meter",
                "main_building": 84.32,
                "accessory_building": 6.51,
                "balcony": 8.03,
                "public_facilities": 24.11,
                "total": 122.97,
                "converted_ping": {"total": 37.2, "main_building": 25.5},
            },
            "encumbrances": [
                {
                    "type": "抵押權",
                    "creditor": "臺灣銀行",
                    "amount_twd": 5000000,
                    "registration_date": "2023-12-15",
                }
            ],
            "raw_text": "...",
            "confidence_notes": [
                {
                    "field": "ownerships[0].address",
                    "confidence": 0.72,
                    "status": "needs_review",
                }
            ],
        },
        "audit": {
            "processed_by": "ocr_pipeline_v1",
            "review_status": "pending",
            "checksum": "sha256:...",
        },
    }


@pytest.fixture
def minimal_jason_json() -> Dict[str, Any]:
    """Minimal valid Jason JSON for testing"""
    return {
        "metadata": {
            "document_id": "00000000-0000-0000-0000-000000000001",
            "property_id": "00000000-0000-0000-0000-000000000002",
            "source_file": "test.pdf",
            "processed_at": "2026-01-16T00:00:00Z",
            "ocr_engine": {"name": "Test", "version": "1.0", "confidence": 1.0},
        },
        "register_office": "測試地政事務所",
        "document_type": "建物所有權狀謄本",
        "sections": {
            "basic": {
                "build_register_number": "測試建字第000000號",
                "land_register_numbers": ["測試段0000地號"],
                "survey_date": "2023-01-01",
                "registration_date": "2023-01-01",
                "registration_reason": "買賣",
            },
            "ownerships": [],
            "building_profile": {
                "location": "測試市測試區測試路1號",
                "structure": "鋼筋混凝土造",
                "main_use": "住家用",
                "floors": {"above_ground": 1, "underground": 0},
                "completion_date": "2023-01-01",
            },
            "area_summary": {
                "units": "square_meter",
                "main_building": 0.0,
                "accessory_building": 0.0,
                "balcony": 0.0,
                "public_facilities": 0.0,
                "total": 0.0,
                "converted_ping": {"total": 0.0, "main_building": 0.0},
            },
            "encumbrances": [],
            "raw_text": "",
            "confidence_notes": [],
        },
        "audit": {"processed_by": "test", "review_status": "pending", "checksum": ""},
    }
