"""
filepath: backend/ocr_service/src/core/document_validator.py
description: Validator for VLM parsing results of property documents
created: 2026-02-04
creator: Claude Sonnet 4.5
"""

import re
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class FieldValidation(BaseModel):
    """Validation result for a single field"""
    is_valid: bool
    error_message: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)


class DocumentValidationResult(BaseModel):
    """Overall validation result for document"""
    is_valid: bool
    field_validations: Dict[str, FieldValidation]
    overall_confidence: float = Field(ge=0.0, le=1.0)
    warnings: list[str] = Field(default_factory=list)


class DocumentValidator:
    """
    Validates VLM parsing results for property documents.

    Checks formats and patterns for:
    - Owner names (Chinese characters, 2-10 chars)
    - Property addresses (Taiwan address format)
    - Building numbers, lot numbers, etc.
    """

    # Regex patterns
    CHINESE_NAME_PATTERN = re.compile(r'^[\u4e00-\u9fff]{2,10}$')
    TAIWAN_ADDRESS_PATTERN = re.compile(
        r'^[\u4e00-\u9fff]{2,5}[縣市]'  # County/City
        r'[\u4e00-\u9fff]{1,5}[鄉鎮市區]'  # Township/District
        r'[\u4e00-\u9fff]{1,10}[路街]'  # Road/Street
        r'.*'  # Remaining address parts
    )
    BUILDING_NUMBER_PATTERN = re.compile(r'^\d{4}-\d{6}$')  # e.g., 0531-000123

    def __init__(self):
        logger.info("DocumentValidator initialized")

    def validate_owner_name(self, name: Optional[str], confidence: float = 1.0) -> FieldValidation:
        """
        Validate owner name format.

        Args:
            name: Owner name to validate
            confidence: VLM confidence score

        Returns:
            FieldValidation result
        """
        if not name:
            return FieldValidation(
                is_valid=False,
                error_message="Owner name is empty",
                confidence=0.0
            )

        if not self.CHINESE_NAME_PATTERN.match(name):
            return FieldValidation(
                is_valid=False,
                error_message="Owner name must be 2-10 Chinese characters",
                confidence=confidence
            )

        return FieldValidation(is_valid=True, confidence=confidence)

    def validate_property_address(self, address: Optional[str], confidence: float = 1.0) -> FieldValidation:
        """
        Validate property address format (Taiwan).

        Args:
            address: Property address to validate
            confidence: VLM confidence score

        Returns:
            FieldValidation result
        """
        if not address:
            return FieldValidation(
                is_valid=False,
                error_message="Property address is empty",
                confidence=0.0
            )

        # Basic length check
        if len(address) < 10:
            return FieldValidation(
                is_valid=False,
                error_message="Address too short (minimum 10 characters)",
                confidence=confidence
            )

        # Check Taiwan address format
        if not self.TAIWAN_ADDRESS_PATTERN.match(address):
            return FieldValidation(
                is_valid=False,
                error_message="Address does not match Taiwan format (e.g., 台北市大安區忠孝東路...)",
                confidence=confidence * 0.7  # Lower confidence for format mismatch
            )

        return FieldValidation(is_valid=True, confidence=confidence)

    def validate_building_number(self, building_number: Optional[str], confidence: float = 1.0) -> FieldValidation:
        """
        Validate building number format.

        Args:
            building_number: Building number (e.g., 0531-000123)
            confidence: VLM confidence score

        Returns:
            FieldValidation result
        """
        if not building_number:
            # Building number is optional
            return FieldValidation(is_valid=True, confidence=1.0)

        if not self.BUILDING_NUMBER_PATTERN.match(building_number):
            return FieldValidation(
                is_valid=False,
                error_message="Building number format should be XXXX-XXXXXX (e.g., 0531-000123)",
                confidence=confidence * 0.8
            )

        return FieldValidation(is_valid=True, confidence=confidence)

    def validate_document(self, extracted_data: Dict[str, Any]) -> DocumentValidationResult:
        """
        Validate entire document parsing result.

        Args:
            extracted_data: Dict with keys like 'owner_name', 'property_address', etc.

        Returns:
            DocumentValidationResult with field-level validations
        """
        field_validations = {}
        warnings = []

        # Validate owner name
        owner_name = extracted_data.get('owner_name')
        owner_confidence = extracted_data.get('owner_name_confidence', 1.0)
        field_validations['owner_name'] = self.validate_owner_name(owner_name, owner_confidence)

        # Validate property address
        property_address = extracted_data.get('property_address')
        address_confidence = extracted_data.get('property_address_confidence', 1.0)
        field_validations['property_address'] = self.validate_property_address(
            property_address, address_confidence
        )

        # Validate building number (optional)
        building_number = extracted_data.get('building_number')
        building_confidence = extracted_data.get('building_number_confidence', 1.0)
        field_validations['building_number'] = self.validate_building_number(
            building_number, building_confidence
        )

        # Check overall confidence
        all_confidences = [
            v.confidence for v in field_validations.values()
            if v.confidence is not None
        ]
        overall_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        # Low confidence warning
        if overall_confidence < 0.85:
            warnings.append(f"Low overall confidence: {overall_confidence:.2f}")

        # Check if all required fields are valid
        is_valid = all(
            field_validations[key].is_valid
            for key in ['owner_name', 'property_address']
        )

        return DocumentValidationResult(
            is_valid=is_valid,
            field_validations=field_validations,
            overall_confidence=overall_confidence,
            warnings=warnings
        )


# Singleton instance
_validator_instance = None


def get_validator() -> DocumentValidator:
    """
    Get or create DocumentValidator singleton instance.

    Returns:
        DocumentValidator instance
    """
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = DocumentValidator()
    return _validator_instance
