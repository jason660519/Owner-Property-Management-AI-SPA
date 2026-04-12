"""
Unit tests for People Database functionality
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
import uuid
import fitz
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.routes.people_db import (
    parse_column_reference,
    extract_excel_preview,
    extract_csv_preview,
    extract_pdf_preview,
    ImportSubmitRequest,
    FieldMapping,
)


class TestParseColumnReference:
    """Test column reference parsing (Excel format)"""
    
    def test_parse_integer_column(self):
        """Should return integer column as is"""
        assert parse_column_reference(0) == 0
        assert parse_column_reference(5) == 5
        assert parse_column_reference(25) == 25
    
    def test_parse_string_column_single_letter(self):
        """Should convert A->0, B->1, etc."""
        assert parse_column_reference("A") == 0
        assert parse_column_reference("B") == 1
        assert parse_column_reference("Z") == 25
    
    def test_parse_string_column_double_letter(self):
        """Should convert AA->26, AB->27, etc."""
        assert parse_column_reference("AA") == 26
        assert parse_column_reference("AB") == 27
        assert parse_column_reference("BA") == 52
    
    def test_parse_lowercase_column(self):
        """Should handle lowercase letters"""
        assert parse_column_reference("a") == 0
        assert parse_column_reference("z") == 25
        assert parse_column_reference("aa") == 26


class TestExtractExcelPreview:
    """Test Excel file preview extraction"""
    
    def test_extract_valid_excel(self):
        """Should extract rows from valid Excel file"""
        # This requires a mock Excel file
        # For now, test the error handling
        invalid_content = b"not an excel file"
        
        with pytest.raises(HTTPException) as exc_info:
            extract_excel_preview(invalid_content)
        
        assert exc_info.value.status_code == 400
    
    def test_extract_empty_excel(self):
        """Should handle empty Excel file"""
        invalid_content = b""
        
        with pytest.raises(HTTPException):
            extract_excel_preview(invalid_content)


class TestExtractCsvPreview:
    """Test CSV file preview extraction"""
    
    def test_extract_valid_csv(self):
        """Should extract rows from valid CSV"""
        csv_content = b"name,age,city\nJohn,30,NYC\nJane,28,LA"
        
        rows, total, empty = extract_csv_preview(csv_content)
        
        assert len(rows) == 3
        assert rows[0] == ["name", "age", "city"]
        assert rows[1] == ["John", "30", "NYC"]
        assert empty == 0
    
    def test_extract_csv_with_empty_lines(self):
        """Should count empty lines"""
        csv_content = b"name,age\nJohn,30\n\nJane,28"
        
        rows, total, empty = extract_csv_preview(csv_content)
        
        assert empty >= 1
    
    def test_extract_csv_invalid_encoding(self):
        """Should handle encoding errors"""
        # Invalid UTF-8 sequence
        csv_content = b"\xff\xfe"
        
        with pytest.raises(HTTPException) as exc_info:
            extract_csv_preview(csv_content)
        
        assert exc_info.value.status_code == 400


class TestExtractPdfPreview:
    """Test PDF file preview extraction"""

    def test_extract_valid_pdf(self):
        """Should extract text lines from valid PDF"""
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "name,phone\nAlice,0912345678")
        pdf_content = doc.tobytes()
        doc.close()

        rows, total, empty = extract_pdf_preview(pdf_content)

        assert total >= 2
        assert empty >= 0
        assert rows[0] == ["name", "phone"]
        assert rows[1] == ["Alice", "0912345678"]

    def test_extract_invalid_pdf(self):
        """Should raise HTTPException for invalid PDF bytes"""
        invalid_content = b"this is not a pdf"

        with pytest.raises(HTTPException) as exc_info:
            extract_pdf_preview(invalid_content)

        assert exc_info.value.status_code == 400


class TestImportSubmitRequest:
    """Test import submit request validation"""
    
    def test_valid_request(self):
        """Should accept valid request"""
        field_mapping = FieldMapping(
            nameColumn="A",
            idNumberColumn="B",
            phoneColumn="C",
            addressColumn="D"
        )
        
        request = ImportSubmitRequest(
            importBatchLabel="Test Batch",
            dataSource="excel",
            fieldMapping=field_mapping
        )
        
        assert request.importBatchLabel == "Test Batch"
        assert request.dataSource == "excel"
        assert request.fieldMapping.nameColumn == "A"
    
    def test_missing_required_fields(self):
        """Should fail without required fields"""
        with pytest.raises(Exception):
            ImportSubmitRequest(
                importBatchLabel="Test",
                dataSource="excel",
                fieldMapping=None  # Missing FieldMapping
            )
    
    def test_field_mapping_with_integer_columns(self):
        """Should accept integer column references"""
        field_mapping = FieldMapping(
            nameColumn=0,
            idNumberColumn=1,
            phoneColumn=2
        )
        
        assert field_mapping.nameColumn == 0
        assert field_mapping.idNumberColumn == 1
