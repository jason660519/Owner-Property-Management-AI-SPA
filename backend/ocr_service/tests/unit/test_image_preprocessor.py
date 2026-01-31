"""
Unit tests for ImagePreprocessor module
"""
import pytest
import numpy as np
from unittest.mock import AsyncMock, patch
from src.preprocessor.image_preprocessor import ImagePreprocessor


class TestImagePreprocessor:
    @pytest.fixture
    def preprocessor(self):
        return ImagePreprocessor()
    
    @pytest.mark.asyncio
    async def test_initialize(self, preprocessor):
        """Test initialization"""
        await preprocessor.initialize()
        assert preprocessor.is_initialized is True
    
    @pytest.mark.asyncio
    async def test_preprocess_basic(self, preprocessor):
        """Test basic preprocessing"""
        # Create a simple test image
        test_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        _, encoded_image = cv2.imencode('.png', test_image)
        image_data = encoded_image.tobytes()
        
        result = await preprocessor.preprocess(image_data)
        
        assert isinstance(result, bytes)
        assert len(result) > 0
    
    @pytest.mark.asyncio
    async def test_preprocess_with_options(self, preprocessor):
        """Test preprocessing with various options"""
        test_image = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        _, encoded_image = cv2.imencode('.png', test_image)
        image_data = encoded_image.tobytes()
        
        # Test with different options
        result1 = await preprocessor.preprocess(image_data, enhance_quality=True)
        result2 = await preprocessor.preprocess(image_data, enhance_quality=False)
        result3 = await preprocessor.preprocess(image_data, resize_to=(200, 200))
        
        assert len(result1) > 0
        assert len(result2) > 0
        assert len(result3) > 0
    
    @pytest.mark.asyncio
    async def test_enhance_image_quality(self, preprocessor):
        """Test image quality enhancement"""
        test_image = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        enhanced = await preprocessor._enhance_image_quality(test_image)
        
        assert enhanced.shape == test_image.shape
        assert enhanced.dtype == np.uint8
    
    @pytest.mark.asyncio
    async def test_remove_noise(self, preprocessor):
        """Test noise removal"""
        test_image = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        denoised = await preprocessor._remove_noise(test_image)
        
        assert denoised.shape == test_image.shape
    
    @pytest.mark.asyncio
    async def test_adjust_contrast(self, preprocessor):
        """Test contrast adjustment"""
        test_image = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        contrasted = await preprocessor._adjust_contrast(test_image)
        
        assert contrasted.shape == test_image.shape
    
    @pytest.mark.asyncio
    async def test_extract_regions(self, preprocessor):
        """Test region extraction"""
        # Create an image with some contours
        test_image = np.zeros((200, 200), dtype=np.uint8)
        cv2.rectangle(test_image, (50, 50), (150, 150), 255, -1)
        
        regions = await preprocessor.extract_regions(test_image)
        
        assert isinstance(regions, list)
        # Should find at least one region
        assert len(regions) >= 1
    
    @pytest.mark.asyncio
    async def test_invalid_image_data(self, preprocessor):
        """Test handling of invalid image data"""
        with pytest.raises(ValueError):
            await preprocessor.preprocess(b"invalid image data")
    
    @pytest.mark.asyncio
    async def test_empty_image_data(self, preprocessor):
        """Test handling of empty image data"""
        with pytest.raises(ValueError):
            await preprocessor.preprocess(b"")
    
    @pytest.mark.asyncio
    async def test_health_check(self, preprocessor):
        """Test health check"""
        health_status = await preprocessor.health_check()
        
        assert "status" in health_status
        assert "message" in health_status
        assert health_status["status"] in ["healthy", "unhealthy"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])