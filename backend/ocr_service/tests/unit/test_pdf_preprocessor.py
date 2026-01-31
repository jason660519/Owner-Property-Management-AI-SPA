"""
Unit tests for PDFPreprocessor module
"""
import pytest
import io
from unittest.mock import AsyncMock, patch, MagicMock
from src.preprocessor.pdf_preprocessor import PDFPreprocessor


class TestPDFPreprocessor:
    @pytest.fixture
    def preprocessor(self):
        return PDFPreprocessor()
    
    @pytest.fixture
    def sample_pdf_data(self):
        """Create a simple PDF for testing"""
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), "Test PDF Content 測試內容", fontsize=12)
        page.insert_text((50, 100), "第二行文字", fontsize=10)
        
        # Add a simple table-like structure
        page.insert_text((50, 150), "欄位1\t欄位2\t欄位3", fontsize=9)
        page.insert_text((50, 170), "值1\t值2\t值3", fontsize=9)
        
        pdf_data = doc.tobytes()
        doc.close()
        return pdf_data
    
    @pytest.mark.asyncio
    async def test_initialize(self, preprocessor):
        """Test initialization"""
        await preprocessor.initialize()
        assert preprocessor.is_initialized is True
    
    @pytest.mark.asyncio
    async def test_extract_pages_basic(self, preprocessor, sample_pdf_data):
        """Test basic page extraction"""
        pages = await preprocessor.extract_pages(sample_pdf_data)
        
        assert isinstance(pages, list)
        assert len(pages) == 1  # Should have 1 page
        
        page_info = pages[0]
        assert "page_number" in page_info
        assert "image_data" in page_info
        assert "text_content" in page_info
        assert "dimensions" in page_info
        
        assert page_info["page_number"] == 1
        assert len(page_info["image_data"]) > 0
        assert "Test PDF Content" in page_info["text_content"]
    
    @pytest.mark.asyncio
    async def test_extract_pages_without_text(self, preprocessor, sample_pdf_data):
        """Test page extraction without text content"""
        pages = await preprocessor.extract_pages(sample_pdf_data, extract_text=False)
        
        assert pages[0]["text_content"] is None
        assert len(pages[0]["image_data"]) > 0
    
    @pytest.mark.asyncio
    async def test_convert_to_images(self, preprocessor, sample_pdf_data):
        """Test PDF to image conversion"""
        images = await preprocessor.convert_to_images(sample_pdf_data)
        
        assert isinstance(images, list)
        assert len(images) == 1
        assert isinstance(images[0], bytes)
        assert len(images[0]) > 0
    
    @pytest.mark.asyncio
    async def test_get_metadata(self, preprocessor, sample_pdf_data):
        """Test metadata extraction"""
        metadata = await preprocessor.get_metadata(sample_pdf_data)
        
        assert isinstance(metadata, dict)
        assert "page_count" in metadata
        assert "metadata" in metadata
        assert "is_encrypted" in metadata
        assert "is_repaired" in metadata
        
        assert metadata["page_count"] == 1
        assert metadata["is_encrypted"] is False
    
    @pytest.mark.asyncio
    async def test_parse_page_range(self, preprocessor):
        """Test page range parsing"""
        # Test single page
        pages = preprocessor._parse_page_range("5", 10)
        assert pages == [5]
        
        # Test range
        pages = preprocessor._parse_page_range("1-3", 10)
        assert pages == [1, 2, 3]
        
        # Test multiple ranges
        pages = preprocessor._parse_page_range("1,3-5,7", 10)
        assert pages == [1, 3, 4, 5, 7]
        
        # Test empty range (all pages)
        pages = preprocessor._parse_page_range(None, 3)
        assert pages == [1, 2, 3]
        
        # Test max pages limit
        pages = preprocessor._parse_page_range(None, 100)
        assert len(pages) == preprocessor.max_pages
        
        # Test invalid ranges
        with pytest.raises(ValueError):
            preprocessor._parse_page_range("invalid", 10)
        
        with pytest.raises(ValueError):
            preprocessor._parse_page_range("15", 10)  # Page out of range
    
    @pytest.mark.asyncio
    async def test_extract_tables(self, preprocessor, sample_pdf_data):
        """Test table extraction"""
        tables = await preprocessor.extract_tables(sample_pdf_data)
        
        assert isinstance(tables, list)
        # Should detect the simple table we created
        assert len(tables) >= 1
        
        if tables:
            table = tables[0]
            assert "row_count" in table
            assert "content" in table
            assert "page_number" in table
            assert table["page_number"] == 1
    
    @pytest.mark.asyncio
    async def test_optimize_for_ocr(self, preprocessor, sample_pdf_data):
        """Test PDF optimization for OCR"""
        optimized_images = await preprocessor.optimize_for_ocr(sample_pdf_data)
        
        assert isinstance(optimized_images, list)
        assert len(optimized_images) == 1
        assert isinstance(optimized_images[0], bytes)
        assert len(optimized_images[0]) > 0
    
    @pytest.mark.asyncio
    async def test_invalid_pdf_data(self, preprocessor):
        """Test handling of invalid PDF data"""
        with pytest.raises(Exception):
            await preprocessor.extract_pages(b"invalid pdf data")
    
    @pytest.mark.asyncio
    async def test_empty_pdf_data(self, preprocessor):
        """Test handling of empty PDF data"""
        with pytest.raises(Exception):
            await preprocessor.extract_pages(b"")
    
    @pytest.mark.asyncio
    async def test_health_check(self, preprocessor):
        """Test health check"""
        health_status = await preprocessor.health_check()
        
        assert "status" in health_status
        assert "message" in health_status
        assert "page_count" in health_status
        assert health_status["status"] in ["healthy", "unhealthy"]
    
    @pytest.mark.asyncio
    async def test_max_pages_limit(self, preprocessor):
        """Test maximum pages limit"""
        # Create a PDF with more pages than the limit
        import fitz
        doc = fitz.open()
        for i in range(preprocessor.max_pages + 10):
            page = doc.new_page()
            page.insert_text((50, 50), f"Page {i+1}", fontsize=12)
        
        pdf_data = doc.tobytes()
        doc.close()
        
        # Should only extract up to max_pages
        pages = await preprocessor.extract_pages(pdf_data)
        assert len(pages) == preprocessor.max_pages


if __name__ == "__main__":
    pytest.main([__file__, "-v"])