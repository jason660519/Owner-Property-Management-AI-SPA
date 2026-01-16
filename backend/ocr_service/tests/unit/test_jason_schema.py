"""
Unit tests for Jason JSON Schema validation

Following TDD approach:
1. Write failing tests first (Red)
2. Implement minimum code to pass (Green)
3. Refactor (Refactor)
"""

from datetime import datetime
from typing import Any, Dict

import pytest

# Will be implemented
from src.models.jason_schema import (
    AreaSummary,
    AuditInfo,
    BasicInfo,
    BuildingProfile,
    ConfidenceNote,
    Encumbrance,
    Holder,
    Metadata,
    OCREngine,
    Ownership,
    Sections,
    TranscriptPayload,
)


class TestOCREngine:
    """Test OCR Engine metadata structure"""

    def test_valid_ocr_engine(self):
        """Valid OCR engine metadata should be accepted"""
        engine = OCREngine(name="DeepSeek-OCR", version="v2025.12-int4", confidence=0.94)

        assert engine.name == "DeepSeek-OCR"
        assert engine.version == "v2025.12-int4"
        assert engine.confidence == 0.94

    def test_confidence_range_validation(self):
        """Confidence must be between 0 and 1"""
        # Valid range
        OCREngine(name="Test", version="1.0", confidence=0.0)
        OCREngine(name="Test", version="1.0", confidence=1.0)

        # Invalid range
        with pytest.raises(ValueError):
            OCREngine(name="Test", version="1.0", confidence=1.5)

        with pytest.raises(ValueError):
            OCREngine(name="Test", version="1.0", confidence=-0.1)


class TestMetadata:
    """Test Metadata structure"""

    def test_valid_metadata(self):
        """Valid metadata should be accepted"""
        metadata = Metadata(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            property_id="123e4567-e89b-12d3-a456-426614174001",
            source_file="test.pdf",
            processed_at=datetime(2026, 1, 16, 8, 0, 0),
            ocr_engine=OCREngine(name="Test", version="1.0", confidence=0.95),
        )

        assert metadata.document_id == "123e4567-e89b-12d3-a456-426614174000"
        assert metadata.source_file == "test.pdf"

    def test_uuid_format_validation(self):
        """Document ID and Property ID should be valid UUIDs"""
        # Valid UUID
        Metadata(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            property_id="123e4567-e89b-12d3-a456-426614174001",
            source_file="test.pdf",
            processed_at=datetime.now(),
            ocr_engine=OCREngine(name="Test", version="1.0", confidence=0.95),
        )

        # Invalid UUID format should raise error
        with pytest.raises(ValueError):
            Metadata(
                document_id="not-a-uuid",
                property_id="123e4567-e89b-12d3-a456-426614174001",
                source_file="test.pdf",
                processed_at=datetime.now(),
                ocr_engine=OCREngine(name="Test", version="1.0", confidence=0.95),
            )


class TestAreaSummary:
    """Test Area Summary structure and calculations"""

    def test_valid_area_summary(self):
        """Valid area summary should be accepted"""
        area = AreaSummary(
            units="square_meter",
            main_building=84.32,
            accessory_building=6.51,
            balcony=8.03,
            public_facilities=24.11,
            total=122.97,
            converted_ping={"total": 37.2, "main_building": 25.5},
        )

        assert area.main_building == 84.32
        assert area.total == 122.97

    def test_area_values_non_negative(self):
        """Area values must be non-negative"""
        # Valid
        AreaSummary(
            units="square_meter",
            main_building=0.0,
            accessory_building=0.0,
            balcony=0.0,
            public_facilities=0.0,
            total=0.0,
            converted_ping={"total": 0.0, "main_building": 0.0},
        )

        # Invalid negative value
        with pytest.raises(ValueError):
            AreaSummary(
                units="square_meter",
                main_building=-10.0,
                accessory_building=0.0,
                balcony=0.0,
                public_facilities=0.0,
                total=0.0,
                converted_ping={"total": 0.0, "main_building": 0.0},
            )

    def test_total_area_calculation(self):
        """Total area should approximately equal sum of parts"""
        area = AreaSummary(
            units="square_meter",
            main_building=84.32,
            accessory_building=6.51,
            balcony=8.03,
            public_facilities=24.11,
            total=122.97,
            converted_ping={"total": 37.2, "main_building": 25.5},
        )

        # Calculate expected total
        expected_total = (
            area.main_building
            + area.accessory_building
            + area.balcony
            + area.public_facilities
        )

        # Allow small floating point difference
        assert abs(area.total - expected_total) < 0.01


class TestOwnership:
    """Test Ownership structure"""

    def test_valid_ownership(self):
        """Valid ownership record should be accepted"""
        holder = Holder(
            name="王大明", id_number_masked="A123***789", address="臺北市松山區XXX", contact=None
        )

        ownership = Ownership(
            holder=holder,
            share_ratio="1/1",
            acquisition_reason="繼承",
            acquisition_date="2023-12-01",
        )

        assert ownership.holder.name == "王大明"
        assert ownership.share_ratio == "1/1"

    def test_share_ratio_format(self):
        """Share ratio should follow fraction format"""
        holder = Holder(
            name="測試", id_number_masked="A123***789", address="測試地址", contact=None
        )

        # Valid formats
        Ownership(
            holder=holder, share_ratio="1/1", acquisition_reason="買賣", acquisition_date="2023-01-01"
        )
        Ownership(
            holder=holder, share_ratio="1/2", acquisition_reason="買賣", acquisition_date="2023-01-01"
        )
        Ownership(
            holder=holder,
            share_ratio="3/10",
            acquisition_reason="買賣",
            acquisition_date="2023-01-01",
        )


class TestTranscriptPayload:
    """Test complete TranscriptPayload structure"""

    def test_valid_complete_payload(self, sample_jason_json: Dict[str, Any]):
        """Valid complete Jason JSON should be accepted"""
        payload = TranscriptPayload(**sample_jason_json)

        assert payload.register_office == "臺北市松山地政事務所"
        assert payload.document_type == "建物所有權狀謄本"
        assert payload.metadata.ocr_engine.confidence == 0.94

    def test_minimal_valid_payload(self, minimal_jason_json: Dict[str, Any]):
        """Minimal valid Jason JSON should be accepted"""
        payload = TranscriptPayload(**minimal_jason_json)

        assert payload.register_office == "測試地政事務所"
        assert len(payload.sections.ownerships) == 0

    def test_payload_serialization(self, sample_jason_json: Dict[str, Any]):
        """Payload should be serializable to JSON"""
        payload = TranscriptPayload(**sample_jason_json)

        # Convert to dict
        payload_dict = payload.model_dump()

        assert isinstance(payload_dict, dict)
        assert "metadata" in payload_dict
        assert "sections" in payload_dict

    def test_payload_json_export(self, sample_jason_json: Dict[str, Any]):
        """Payload should export to JSON string"""
        payload = TranscriptPayload(**sample_jason_json)

        # Export to JSON string
        json_str = payload.model_dump_json(indent=2)

        assert isinstance(json_str, str)
        assert "metadata" in json_str
        assert "DeepSeek-OCR" in json_str

    def test_missing_required_fields(self):
        """Missing required fields should raise validation error"""
        with pytest.raises(ValueError):
            TranscriptPayload(
                # Missing metadata
                register_office="測試",
                document_type="建物所有權狀謄本",
            )


class TestConfidenceNote:
    """Test confidence notes for fields requiring review"""

    def test_valid_confidence_note(self):
        """Valid confidence note should be accepted"""
        note = ConfidenceNote(
            field="ownerships[0].address", confidence=0.72, status="needs_review"
        )

        assert note.field == "ownerships[0].address"
        assert note.confidence == 0.72
        assert note.status == "needs_review"

    def test_confidence_threshold(self):
        """Low confidence should trigger review status"""
        # High confidence - no review needed
        note1 = ConfidenceNote(field="test_field", confidence=0.95, status="confirmed")
        assert note1.status == "confirmed"

        # Low confidence - needs review
        note2 = ConfidenceNote(field="test_field", confidence=0.60, status="needs_review")
        assert note2.status == "needs_review"
