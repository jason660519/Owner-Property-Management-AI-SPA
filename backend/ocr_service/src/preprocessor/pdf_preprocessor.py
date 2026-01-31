"""
PDF preprocessing module for document extraction and conversion
"""
import fitz  # PyMuPDF
import io
from typing import List, Dict, Any, Optional
import asyncio
from loguru import logger
from PIL import Image
import numpy as np

class PDFPreprocessor:
    def __init__(self, target_dpi: int = 300, max_pages: int = 50):
        self.target_dpi = target_dpi
        self.max_pages = max_pages
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize PDF preprocessor"""
        if self.is_initialized:
            return
        
        try:
            # Check PyMuPDF availability
            fitz.__version__
            self.is_initialized = True
            logger.info("PDF preprocessor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PDF preprocessor: {e}")
            raise
    
    async def extract_pages(
        self, 
        pdf_data: bytes, 
        page_range: Optional[str] = None,
        extract_text: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Extract pages from PDF with optional text extraction
        
        Args:
            pdf_data: PDF file bytes
            page_range: Page range (e.g., "1-5,7,9-12")
            extract_text: Whether to extract text content
            
        Returns:
            List of page information with images and optional text
        """
        try:
            # Open PDF from memory
            pdf_document = fitz.open(stream=pdf_data, filetype="pdf")
            
            # Parse page range
            pages_to_process = self._parse_page_range(page_range, pdf_document.page_count)
            
            if not pages_to_process:
                raise ValueError("No valid pages to process")
            
            if len(pages_to_process) > self.max_pages:
                raise ValueError(f"PDF contains too many pages ({len(pages_to_process)} > {self.max_pages})")
            
            extracted_pages = []
            
            for page_num in pages_to_process:
                page_info = await self._process_page(
                    pdf_document, page_num, extract_text
                )
                extracted_pages.append(page_info)
            
            pdf_document.close()
            
            logger.info(f"Extracted {len(extracted_pages)} pages from PDF")
            return extracted_pages
            
        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            raise
    
    async def convert_to_images(
        self, 
        pdf_data: bytes, 
        page_range: Optional[str] = None
    ) -> List[bytes]:
        """
        Convert PDF pages to images
        
        Args:
            pdf_data: PDF file bytes
            page_range: Page range to convert
            
        Returns:
            List of image bytes for each page
        """
        try:
            pages = await self.extract_pages(pdf_data, page_range, extract_text=False)
            return [page['image_data'] for page in pages]
            
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            raise
    
    async def get_metadata(self, pdf_data: bytes) -> Dict[str, Any]:
        """Extract metadata from PDF"""
        try:
            pdf_document = fitz.open(stream=pdf_data, filetype="pdf")
            
            metadata = {
                'page_count': pdf_document.page_count,
                'metadata': pdf_document.metadata,
                'is_encrypted': pdf_document.is_encrypted,
                'is_repaired': pdf_document.is_repaired
            }
            
            pdf_document.close()
            return metadata
            
        except Exception as e:
            logger.error(f"PDF metadata extraction failed: {e}")
            raise
    
    async def _process_page(
        self, 
        pdf_document: fitz.Document, 
        page_num: int, 
        extract_text: bool
    ) -> Dict[str, Any]:
        """Process individual PDF page"""
        try:
            page = pdf_document[page_num - 1]  # 0-based index
            
            # Get page dimensions
            rect = page.rect
            width = rect.width
            height = rect.height
            
            # Calculate zoom factor for target DPI
            zoom = self.target_dpi / 72  # PDF uses 72 DPI
            matrix = fitz.Matrix(zoom, zoom)
            
            # Render page to image
            pix = page.get_pixmap(matrix=matrix)
            
            # Convert to bytes
            image_data = pix.tobytes("png")
            
            # Extract text if requested
            text_content = None
            if extract_text:
                text_content = page.get_text()
            
            page_info = {
                'page_number': page_num,
                'image_data': image_data,
                'dimensions': {
                    'width': int(width * zoom),
                    'height': int(height * zoom),
                    'dpi': self.target_dpi
                },
                'text_content': text_content,
                'has_images': len(page.get_images()) > 0,
                'rotation': page.rotation
            }
            
            return page_info
            
        except Exception as e:
            logger.error(f"Failed to process page {page_num}: {e}")
            raise
    
    def _parse_page_range(self, page_range: Optional[str], total_pages: int) -> List[int]:
        """Parse page range string into list of page numbers"""
        if not page_range:
            # Return all pages up to max_pages
            return list(range(1, min(total_pages, self.max_pages) + 1))
        
        try:
            pages = []
            ranges = page_range.split(',')
            
            for r in ranges:
                r = r.strip()
                if '-' in r:
                    start, end = r.split('-')
                    start = int(start.strip())
                    end = int(end.strip())
                    
                    if start < 1 or end > total_pages or start > end:
                        raise ValueError(f"Invalid page range: {r}")
                    
                    pages.extend(range(start, end + 1))
                else:
                    page_num = int(r)
                    if page_num < 1 or page_num > total_pages:
                        raise ValueError(f"Invalid page number: {page_num}")
                    pages.append(page_num)
            
            # Remove duplicates and sort
            pages = sorted(set(pages))
            
            # Limit to max_pages
            if len(pages) > self.max_pages:
                pages = pages[:self.max_pages]
            
            return pages
            
        except ValueError as e:
            logger.error(f"Invalid page range format: {page_range}")
            raise ValueError(f"Invalid page range format: {e}")
    
    async def extract_tables(
        self, 
        pdf_data: bytes, 
        page_range: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract tables from PDF pages
        (Placeholder for future table extraction functionality)
        """
        try:
            pages = await self.extract_pages(pdf_data, page_range, extract_text=True)
            
            tables = []
            for page in pages:
                # Simple table detection based on text layout
                page_tables = self._detect_tables_from_text(page['text_content'])
                for table in page_tables:
                    table['page_number'] = page['page_number']
                    tables.append(table)
            
            return tables
            
        except Exception as e:
            logger.warning(f"Table extraction failed: {e}")
            return []
    
    def _detect_tables_from_text(self, text_content: Optional[str]) -> List[Dict[str, Any]]:
        """Simple table detection from text content"""
        if not text_content:
            return []
        
        # Basic table detection logic
        lines = text_content.split('\n')
        tables = []
        
        # Look for tabular patterns
        current_table = []
        for line in lines:
            # Check if line has multiple columns (tabs or multiple spaces)
            if '\t' in line or line.count('  ') >= 2:
                current_table.append(line)
            elif current_table:
                # End of table
                if len(current_table) >= 2:  # At least header and one row
                    tables.append({
                        'row_count': len(current_table),
                        'content': current_table.copy()
                    })
                current_table = []
        
        # Add last table if any
        if current_table and len(current_table) >= 2:
            tables.append({
                'row_count': len(current_table),
                'content': current_table.copy()
            })
        
        return tables
    
    async def optimize_for_ocr(
        self, 
        pdf_data: bytes, 
        page_range: Optional[str] = None
    ) -> List[bytes]:
        """
        Optimize PDF pages for OCR processing
        """
        try:
            # Extract pages as images
            pages = await self.extract_pages(pdf_data, page_range, extract_text=False)
            
            optimized_images = []
            
            for page in pages:
                # Convert to PIL Image for processing
                image = Image.open(io.BytesIO(page['image_data']))
                
                # Convert to grayscale for better OCR
                if image.mode != 'L':
                    image = image.convert('L')
                
                # Enhance contrast
                from PIL import ImageEnhance
                enhancer = ImageEnhance.Contrast(image)
                image = enhancer.enhance(1.5)
                
                # Convert back to bytes
                output_buffer = io.BytesIO()
                image.save(output_buffer, format='PNG', optimize=True)
                optimized_images.append(output_buffer.getvalue())
            
            return optimized_images
            
        except Exception as e:
            logger.error(f"PDF optimization failed: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Create test PDF
            import tempfile
            
            # Simple test with a small PDF
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 50), "PDF Test 測試", fontsize=12)
            
            # Get PDF as bytes
            pdf_data = doc.tobytes()
            doc.close()
            
            # Test extraction
            pages = await self.extract_pages(pdf_data, extract_text=True)
            
            return {
                'status': 'healthy',
                'message': f'PDF preprocessor functioning normally, processed {len(pages)} pages',
                'page_count': len(pages)
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'PDF preprocessor error: {e}'
            }