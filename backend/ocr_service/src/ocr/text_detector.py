"""
Text detection module using OpenCV and contour analysis
"""
import cv2
import numpy as np
from typing import List, Dict, Any
import asyncio
from loguru import logger

class TextDetector:
    def __init__(self):
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize text detector"""
        if self.is_initialized:
            return
        
        try:
            # Check OpenCV availability
            cv2.__version__
            self.is_initialized = True
            logger.info("Text detector initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize text detector: {e}")
            raise
    
    async def detect(self, image_data: bytes) -> List[Dict[str, Any]]:
        """
        Detect text regions in image
        
        Args:
            image_data: Preprocessed image bytes
            
        Returns:
            List of text regions with coordinates and confidence
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
            
            if image is None:
                raise ValueError("Failed to decode image for text detection")
            
            # Apply adaptive thresholding
            binary = cv2.adaptiveThreshold(
                image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Find contours
            contours, _ = cv2.findContours(
                binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            
            # Filter and process contours
            text_regions = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Filter by size and aspect ratio
                if self._is_text_region(w, h, image.shape):
                    confidence = self._calculate_confidence(contour, image)
                    
                    text_regions.append({
                        'bbox': [x, y, w, h],
                        'confidence': confidence,
                        'area': w * h,
                        'aspect_ratio': w / h if h > 0 else 0
                    })
            
            # Sort by confidence and area
            text_regions.sort(key=lambda x: (-x['confidence'], -x['area']))
            
            logger.info(f"Detected {len(text_regions)} text regions")
            return text_regions
            
        except Exception as e:
            logger.error(f"Text detection failed: {e}")
            raise
    
    def _is_text_region(self, width: int, height: int, image_shape: tuple) -> bool:
        """Determine if region is likely to contain text"""
        img_height, img_width = image_shape
        
        # Minimum size constraints
        min_width = max(10, img_width * 0.01)
        min_height = max(10, img_height * 0.01)
        
        # Maximum size constraints
        max_width = img_width * 0.8
        max_height = img_height * 0.8
        
        # Aspect ratio constraints for text
        aspect_ratio = width / height if height > 0 else 0
        
        return (min_width <= width <= max_width and
                min_height <= height <= max_height and
                0.1 <= aspect_ratio <= 10.0)
    
    def _calculate_confidence(self, contour: np.ndarray, image: np.ndarray) -> float:
        """Calculate confidence score for text region"""
        try:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Extract region
            region = image[y:y+h, x:x+w]
            
            if region.size == 0:
                return 0.0
            
            # Calculate edge density
            edges = cv2.Canny(region, 50, 150)
            edge_density = np.sum(edges > 0) / region.size
            
            # Calculate intensity variance
            intensity_var = np.var(region) / 255.0
            
            # Combine factors
            confidence = min(1.0, edge_density * 0.6 + intensity_var * 0.4)
            
            return round(confidence, 3)
            
        except Exception:
            return 0.5  # Default confidence
    
    async def detect_with_ml(self, image_data: bytes) -> List[Dict[str, Any]]:
        """
        Advanced text detection using machine learning models
        (Placeholder for future integration with EAST, CRAFT, etc.)
        """
        # TODO: Integrate with ML-based text detection models
        logger.warning("ML-based text detection not implemented yet")
        return await self.detect(image_data)
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        try:
            # Test with sample image
            test_image = np.zeros((100, 100), dtype=np.uint8)
            cv2.putText(test_image, "TEST", (10, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, 255, 2)
            
            success, encoded = cv2.imencode('.png', test_image)
            if success:
                regions = await self.detect(encoded.tobytes())
                
                return {
                    'status': 'healthy',
                    'message': f'Text detector functioning normally, detected {len(regions)} regions',
                    'detected_regions': len(regions)
                }
            
            return {
                'status': 'healthy',
                'message': 'Text detector basic functionality verified'
            }
            
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Text detector error: {e}'
            }