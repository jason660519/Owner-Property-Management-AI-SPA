from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pathlib import Path

class OCREngine(ABC):
    """Abstract base class for OCR engines (VLM or traditional)"""
    
    @abstractmethod
    async def process(self, image_path: Path) -> Dict[str, Any]:
        """
        Process an image and return structured data.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Dictionary containing the extracted structured data
        """
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the name of the engine"""
        pass
