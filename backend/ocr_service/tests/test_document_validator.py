"""
filepath: backend/ocr_service/tests/test_document_validator.py
description: Unit tests for DocumentValidator
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import pytest

from src.core.document_validator import DocumentValidator, get_validator


class TestDocumentValidator:
    """Test suite for DocumentValidator"""

    @pytest.fixture
    def validator(self):
        """Create validator instance"""
        return DocumentValidator()

    def test_valid_owner_name(self, validator):
        """Test valid Chinese owner names"""
        valid_names = ["王小明", "陳美華", "林志玲", "蔡依林", "周杰倫"]

        for name in valid_names:
            result = validator.validate_owner_name(name)
            assert result.is_valid, f"Expected {name} to be valid"
            assert result.confidence == 1.0

    def test_invalid_owner_name_too_short(self, validator):
        """Test owner name that is too short"""
        result = validator.validate_owner_name("王")
        assert not result.is_valid
        assert "2-10 Chinese characters" in result.error_message

    def test_invalid_owner_name_too_long(self, validator):
        """Test owner name that is too long"""
        result = validator.validate_owner_name("王" * 11)
        assert not result.is_valid

    def test_invalid_owner_name_contains_english(self, validator):
        """Test owner name with English characters"""
        result = validator.validate_owner_name("王小明ABC")
        assert not result.is_valid

    def test_invalid_owner_name_contains_numbers(self, validator):
        """Test owner name with numbers"""
        result = validator.validate_owner_name("王小123")
        assert not result.is_valid

    def test_empty_owner_name(self, validator):
        """Test empty owner name"""
        result = validator.validate_owner_name("")
        assert not result.is_valid
        assert result.error_message == "Owner name is empty"

    def test_none_owner_name(self, validator):
        """Test None owner name"""
        result = validator.validate_owner_name(None)
        assert not result.is_valid

    def test_valid_property_address(self, validator):
        """Test valid Taiwan addresses"""
        valid_addresses = [
            "台北市大安區忠孝東路四段123號",
            "新北市板橋區中山路一段456號7樓",
            "台中市西屯區台灣大道三段789號",
            "高雄市鳳山區中正路二段321號",
        ]

        for address in valid_addresses:
            result = validator.validate_property_address(address)
            assert result.is_valid, f"Expected {address} to be valid"

    def test_invalid_address_too_short(self, validator):
        """Test address that is too short"""
        result = validator.validate_property_address("台北市")
        assert not result.is_valid
        assert "minimum 10 characters" in result.error_message

    def test_invalid_address_wrong_format(self, validator):
        """Test address with wrong format"""
        result = validator.validate_property_address("123 Main Street")
        assert not result.is_valid
        assert "Taiwan format" in result.error_message

    def test_empty_address(self, validator):
        """Test empty address"""
        result = validator.validate_property_address("")
        assert not result.is_valid
        assert result.error_message == "Property address is empty"

    def test_valid_building_number(self, validator):
        """Test valid building numbers"""
        valid_numbers = ["0531-000123", "1234-567890", "9999-000001"]

        for number in valid_numbers:
            result = validator.validate_building_number(number)
            assert result.is_valid, f"Expected {number} to be valid"

    def test_invalid_building_number_format(self, validator):
        """Test invalid building number formats"""
        invalid_numbers = ["0531-123", "123-000123", "0531000123", "0531-12345A"]

        for number in invalid_numbers:
            result = validator.validate_building_number(number)
            assert not result.is_valid, f"Expected {number} to be invalid"

    def test_empty_building_number(self, validator):
        """Test empty building number (should be valid as optional)"""
        result = validator.validate_building_number("")
        assert result.is_valid

    def test_none_building_number(self, validator):
        """Test None building number (should be valid as optional)"""
        result = validator.validate_building_number(None)
        assert result.is_valid

    def test_validate_document_all_valid(self, validator):
        """Test document validation with all valid fields"""
        extracted_data = {
            "owner_name": "王小明",
            "property_address": "台北市大安區忠孝東路四段123號",
            "building_number": "0531-000123",
        }

        result = validator.validate_document(extracted_data)

        assert result.is_valid
        assert result.field_validations["owner_name"].is_valid
        assert result.field_validations["property_address"].is_valid
        assert result.field_validations["building_number"].is_valid
        assert result.overall_confidence >= 0.85

    def test_validate_document_missing_required_field(self, validator):
        """Test document validation with missing owner name"""
        extracted_data = {
            "property_address": "台北市大安區忠孝東路四段123號",
        }

        result = validator.validate_document(extracted_data)

        assert not result.is_valid
        assert not result.field_validations["owner_name"].is_valid

    def test_validate_document_low_confidence_warning(self, validator):
        """Test low confidence produces warning"""
        extracted_data = {
            "owner_name": "王小明",
            "owner_name_confidence": 0.5,
            "property_address": "台北市大安區忠孝東路四段123號",
            "property_address_confidence": 0.6,
        }

        result = validator.validate_document(extracted_data)

        assert result.overall_confidence < 0.85
        assert len(result.warnings) > 0
        assert "Low overall confidence" in result.warnings[0]

    def test_get_validator_singleton(self):
        """Test get_validator returns singleton"""
        validator1 = get_validator()
        validator2 = get_validator()

        assert validator1 is validator2
