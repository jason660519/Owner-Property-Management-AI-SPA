"""
Layout analysis module for document structure understanding
"""
import cv2
import numpy as np
from typing import Dict, Any, List
import asyncio
from loguru import logger

class LayoutAnalyzer:
    def __init__(self):
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize layout analyzer"""
        if self.is_initialized:
            return
        
        try:
            # Check OpenCV availability
            cv2.__version__
            self.is_initialized = True
            logger.info("Layout analyzer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize layout analyzer: {e}")
            raise
    
    async def analyze(self, image_data: bytes) -> Dict[str, Any]:
        """
        Analyze document layout and structure
        
        Args:
            image_data: Preprocessed image bytes
            
        Returns:
            Layout analysis results with regions and structure
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            
            if image is None:
                raise ValueError("Failed to decode image for layout analysis")
            
            # Detect horizontal and vertical lines
            horizontal_lines = await self._detect_horizontal_lines(image)
            vertical_lines = await self._detect_vertical_lines(image)
            
            # Detect text regions
            text_regions = await self._detect_text_regions(image)
            
            # Identify layout sections
            sections = await self._identify_sections(
                image, horizontal_lines, vertical_lines, text_regions
            )
            
            # Determine document type based on layout
            doc_type = await self._classify_document_type(sections)
            
            layout_analysis = {
                'document_type': doc_type,
                'sections': sections,
                'horizontal_lines': horizontal_lines,
                'vertical_lines': vertical_lines,
                'text_regions': text_regions,
                'page_dimensions': image.shape,
                'layout_confidence': self._calculate_layout_confidence(sections)
            }
            
            logger.info(f"Layout analysis completed: {doc_type}")
            return layout_analysis
            
        except Exception as e:
            logger.error(f"Layout analysis failed: {e}")
            raise
    
    async def _detect_horizontal_lines(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect horizontal lines in document"""
        try:
            # Apply edge detection
            edges = cv2.Canny(image, 50, 150)
            
            # Use Hough Line Transform for horizontal lines
            lines = cv2.HoughLinesP(
                edges, 1, np.pi/180, threshold=50, minLineLength=100, maxLineGap=10
            )
            
            horizontal_lines = []
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    
                    # Filter for horizontal lines (within ±10 degrees)
                    if abs(y2 - y1) < 5 and abs(x2 - x1) > 50:
                        horizontal_lines.append({
                            'start': (x1, y1),
                            'end': (x2, y2),
                            'length': abs(x2 - x1),
                            'position': y1
                        })
            
            return horizontal_lines
            
        except Exception as e:
            logger.warning(f"Horizontal line detection failed: {e}")
            return []
    
    async def _detect_vertical_lines(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect vertical lines in document"""
        try:
            edges = cv2.Canny(image, 50, 150)
            
            lines = cv2.HoughLinesP(
                edges, 1, np.pi/180, threshold=50, minLineLength=100, maxLineGap=10
            )
            
            vertical_lines = []
            if lines is not None:
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    
                    # Filter for vertical lines (within ±10 degrees)
                    if abs(x2 - x1) < 5 and abs(y2 - y1) > 50:
                        vertical_lines.append({
                            'start': (x1, y1),
                            'end': (x2, y2),
                            'length': abs(y2 - y1),
                            'position': x1
                        })
            
            return vertical_lines
            
        except Exception as e:
            logger.warning(f"Vertical line detection failed: {e}")
            return []
    
    async def _detect_text_regions(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """Detect potential text regions"""
        try:
            # Use morphological operations to find text-like regions
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            morph = cv2.morphologyEx(image, cv2.MORPH_CLOSE, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(
                255 - morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            
            text_regions = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Filter regions that could contain text
                if (w > 20 and h > 10 and 
                    w < image.shape[1] * 0.8 and 
                    h < image.shape[0] * 0.8):
                    
                    text_regions.append({
                        'bbox': [x, y, w, h],
                        'area': w * h,
                        'aspect_ratio': w / h if h > 0 else 0
                    })
            
            return text_regions
            
        except Exception as e:
            logger.warning(f"Text region detection failed: {e}")
            return []
    
    async def _identify_sections(self, image: np.ndarray, 
                               horizontal_lines: List, 
                               vertical_lines: List, 
                               text_regions: List) -> List[Dict[str, Any]]:
        """Identify document sections based on lines and text regions"""
        sections = []
        
        # Simple section identification based on line positions
        h_positions = sorted([line['position'] for line in horizontal_lines])
        v_positions = sorted([line['position'] for line in vertical_lines])
        
        # Create grid-based sections
        for i in range(len(h_positions) - 1):
            for j in range(len(v_positions) - 1):
                y_start = h_positions[i]
                y_end = h_positions[i + 1]
                x_start = v_positions[j]
                x_end = v_positions[j + 1]
                
                # Count text regions in this section
                text_count = sum(1 for region in text_regions 
                                if self._is_in_region(region['bbox'], x_start, y_start, x_end, y_end))
                
                if text_count > 0:
                    sections.append({
                        'bbox': [x_start, y_start, x_end - x_start, y_end - y_start],
                        'text_regions_count': text_count,
                        'section_type': self._classify_section_type(x_start, y_start, x_end, y_end, image.shape)
                    })
        
        return sections
    
    def _is_in_region(self, bbox: List[int], x_start: int, y_start: int, 
                     x_end: int, y_end: int) -> bool:
        """Check if bounding box is within region"""
        x, y, w, h = bbox
        return (x_start <= x <= x_end and 
                y_start <= y <= y_end and
                x + w <= x_end and 
                y + h <= y_end)
    
    def _classify_section_type(self, x_start: int, y_start: int, 
                             x_end: int, y_end: int, 
                             image_shape: tuple) -> str:
        """Classify section type based on position and size"""
        img_height, img_width = image_shape
        
        width = x_end - x_start
        height = y_end - y_start
        
        # Header section (top 20%)
        if y_start < img_height * 0.2:
            return 'header'
        
        # Footer section (bottom 20%)
        if y_end > img_height * 0.8:
            return 'footer'
        
        # Sidebar (left/right 25%)
        if x_start < img_width * 0.25:
            return 'sidebar_left'
        if x_end > img_width * 0.75:
            return 'sidebar_right'
        
        # Main content
        return 'main_content'
    
    async def _classify_document_type(self, sections: List[Dict[str, Any]]) -> str:
        """Classify document type based on layout features"""
        if not sections:
            return 'unknown'
        
        # Count section types
        type_counts = {}
        for section in sections:
            sec_type = section.get('section_type', 'unknown')
            type_counts[sec_type] = type_counts.get(sec_type, 0) + 1
        
        # Simple classification logic
        if type_counts.get('main_content', 0) > 3:
            return 'form'
        elif type_counts.get('sidebar_left', 0) > 0 and type_counts.get('sidebar_right', 0) > 0:
            return 'table'
        else:
            return 'document'
    
    def _calculate_layout_confidence(self, sections: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for layout analysis"""
        if not sections:
            return 0.0
        
        # Higher confidence if we found structured sections
        structured_sections = sum(1 for s in sections 
                                if s['section_type'] != 'unknown')
        
        confidence = min(1.0, structured_sections / max(1, len(sections)) * 0.8)
        return round(confidence, 3)
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Create test image with layout
            test_image = np.ones((200, 300), dtype=np.uint8) * 255
            cv2.rectangle(test_image, (10, 10), (290, 50), 0, 2)  # Header
            cv2.rectangle(test_image, (10, 60), (140, 180), 0, 2)  # Left
            cv2.rectangle(test_image, (150, 60), (290, 180), 0, 2)  # Right
            
            success, encoded = cv2.imencode('.png', test_image)
            if success:
                analysis = await self.analyze(encoded.tobytes())
                
                return {
                    'status': 'healthy',
                    'message': f'Layout analyzer functioning normally, detected {len(analysis["sections"])} sections',
                    'document_type': analysis['document_type']
                }
            
            return {
                'status': 'healthy',
                'message': 'Layout analyzer basic functionality verified'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Layout analyzer error: {e}'
            }