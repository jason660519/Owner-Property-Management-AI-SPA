"""
Pydantic schemas for OCR processing
"""

from enum import Enum
from typing import Optional, Dict, Any, List
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

class ProcessingStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class OCRRequest(BaseModel):
    document_type: DocumentType = DocumentType.BUILDING_TITLE
    language: str = "zh-TW"
    enable_cache: bool = True

class OCRResponse(BaseModel):
    request_id: str
    status: ProcessingStatus
    result: Optional[Dict[str, Any]] = None
    processing_time: float = 0.0
    cached: bool = False
    message: Optional[str] = None

class FileInfo(BaseModel):
    filename: str
    url: Optional[str] = None
    content_base64: Optional[str] = None

class BatchOCRRequest(BaseModel):
    files: List[FileInfo]
    document_type: DocumentType = DocumentType.BUILDING_TITLE
    language: str = "zh-TW"
    enable_cache: bool = True
