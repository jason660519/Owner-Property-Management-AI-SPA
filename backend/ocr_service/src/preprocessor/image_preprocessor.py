"""
Image preprocessing and enhancement module
"""
import cv2
import numpy as np
from typing import Optional, Tuple
import asyncio
from loguru import logger

class ImagePreprocessor:
    def __init__(self):
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize preprocessing components"""
        if self.is_initialized:
            return
        
        # Check OpenCV availability
        try:
            cv2.__version__
            self.is_initialized = True
            logger.info("Image preprocessor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize image preprocessor: {e}")
            raise
    
    async def preprocess(
        self,
        image_data: bytes,
        enhance_quality: bool = True,
        remove_noise: bool = True,
        resize_to: Optional[Tuple[int, int]] = None,
        target_dpi: int = 300
    ) -> bytes:
        """
        Preprocess image for optimal OCR results
        
        Args:
            image_data: Raw image bytes
            enhance_quality: Enable quality enhancement
            remove_noise: Enable noise removal
            resize_to: Target size (width, height)
            target_dpi: Target DPI for resolution
            
        Returns:
            Preprocessed image bytes
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Failed to decode image")
            
            # Convert to grayscale for OCR
            if len(image.shape) == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Resize if specified
            if resize_to:
                image = cv2.resize(image, resize_to, interpolation=cv2.INTER_CUBIC)
            
            # Enhance quality
            if enhance_quality:
                image = await self._enhance_image_quality(image)
            
            # Remove noise
            if remove_noise:
                image = await self._remove_noise(image)
            
            # Adjust contrast and brightness
            image = await self._adjust_contrast(image)
            
            # Convert back to bytes
            success, encoded_image = cv2.imencode('.png', image)
            if not success:
                raise ValueError("Failed to encode processed image")
            
            return encoded_image.tobytes()
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            raise
    
    async def _enhance_image_quality(self, image: np.ndarray) -> np.ndarray:
        """Enhance image quality for better OCR"""
        try:
            # Apply histogram equalization
            if len(image.shape) == 2:  # Grayscale
                image = cv2.equalizeHist(image)
            else:  # Color
                # Convert to YUV and equalize Y channel
                yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
                yuv[:,:,0] = cv2.equalizeHist(yuv[:,:,0])
                image = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
            
            # Apply unsharp masking
            blurred = cv2.GaussianBlur(image, (0, 0), 3.0)
            image = cv2.addWeighted(image, 1.5, blurred, -0.5, 0)
            
            return image
            
        except Exception as e:
            logger.warning(f"Image quality enhancement failed: {e}")
            return image
    
    async def _remove_noise(self, image: np.ndarray) -> np.ndarray:
        """Remove noise from image"""
        try:
            # Apply bilateral filter for noise reduction while preserving edges
            if len(image.shape) == 2:  # Grayscale
                image = cv2.bilateralFilter(image, 9, 75, 75)
            else:  # Color
                image = cv2.bilateralFilter(image, 9, 75, 75)
            
            # Apply morphological operations to remove small noise
            kernel = np.ones((2, 2), np.uint8)
            image = cv2.morphologyEx(image, cv2.MORPH_CLOSE, kernel)
            image = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel)
            
            return image
            
        except Exception as e:
            logger.warning(f"Noise removal failed: {e}")
            return image
    
    async def _adjust_contrast(self, image: np.ndarray) -> np.ndarray:
        """Adjust contrast and brightness"""
        try:
            # Calculate image statistics
            if len(image.shape) == 2:  # Grayscale
                min_val = np.min(image)
                max_val = np.max(image)
                
                # Auto contrast adjustment
                if max_val > min_val:
                    image = ((image - min_val) * 255.0 / (max_val - min_val)).astype(np.uint8)
                
                # Apply CLAHE for local contrast enhancement
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                image = clahe.apply(image)
            
            return image
            
        except Exception as e:
            logger.warning(f"Contrast adjustment failed: {e}")
            return image
    
    async def extract_regions(
        self,
        image_data: bytes,
        regions: list,
        padding: int = 5
    ) -> list:
        """Extract specific regions from image"""
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            extracted_regions = []
            for region in regions:
                x, y, w, h = region
                
                # Add padding
                x = max(0, x - padding)
                y = max(0, y - padding)
                w = min(image.shape[1] - x, w + 2 * padding)
                h = min(image.shape[0] - y, h + 2 * padding)
                
                # Extract region
                roi = image[y:y+h, x:x+w]
                
                # Encode to bytes
                success, encoded = cv2.imencode('.png', roi)
                if success:
                    extracted_regions.append(encoded.tobytes())
            
            return extracted_regions
            
        except Exception as e:
            logger.error(f"Region extraction failed: {e}")
            raise
    
    async def health_check(self) -> dict:
        """Perform health check"""
        try:
            # Test basic OpenCV functionality
            test_image = np.zeros((100, 100, 3), dtype=np.uint8)
            cv2.cvtColor(test_image, cv2.COLOR_BGR2GRAY)
            
            return {
                'status': 'healthy',
                'message': 'Image preprocessor functioning normally'
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'message': f'Image preprocessor error: {e}'
            }