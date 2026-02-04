"""
Pydantic schemas for OCR processing
"""

from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel


class DocumentType(str, Enum):
    """Document types that can be processed"""

    BUILDING_TITLE = "building_title"
    LAND_TITLE = "land_title"
    ID_CARD = "id_card"
    CONTRACT = "contract"
    OTHER = "other"


class ProcessingConfig(BaseModel):
    """Configuration for document processing"""

    enable_table_detection: bool = True
    enhance_quality: bool = True
    remove_noise: bool = True
    target_size: Optional[tuple] = (1024, 1024)
    pdf_dpi: int = 300
    max_pages: int = 10

    class Config:
        extra = "allow"
