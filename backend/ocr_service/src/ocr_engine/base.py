from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, Optional


class OCREngine(ABC):
    """Abstract base class for OCR engines (VLM or traditional)"""

    @abstractmethod
    async def process(
        self,
        image_path: Path,
        text_content: Optional[str] = None,
        document_type: Optional[str] = None,
        language: str = "zh-TW",
    ) -> Dict[str, Any]:
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
