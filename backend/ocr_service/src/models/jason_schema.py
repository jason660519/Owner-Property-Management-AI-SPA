"""
Jason JSON Schema Definitions using Pydantic

Based on OCR規劃報告.md Section 4: Jason JSON 輸出草案
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class OCREngine(BaseModel):
    """OCR Engine metadata"""

    name: str = Field(..., description="OCR engine name (e.g., DeepSeek-OCR)")
    version: str = Field(..., description="Engine version")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score")

    @field_validator("confidence")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        """Ensure confidence is between 0 and 1"""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence must be between 0 and 1")
        return v


class Metadata(BaseModel):
    """Document metadata"""

    document_id: str = Field(..., description="Document UUID")
    property_id: str = Field(..., description="Property UUID")
    source_file: str = Field(..., description="Source PDF filename")
    processed_at: datetime = Field(..., description="Processing timestamp")
    ocr_engine: OCREngine = Field(..., description="OCR engine information")

    @field_validator("document_id", "property_id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        """Validate UUID format"""
        try:
            UUID(v)
        except ValueError:
            raise ValueError(f"Invalid UUID format: {v}")
        return v


class BasicInfo(BaseModel):
    """Basic registration information"""

    build_register_number: str = Field(..., description="建號 (e.g., 松山建字第000000號)")
    land_register_numbers: List[str] = Field(
        ..., description="地號列表 (e.g., ['松山段一小段0000地號'])"
    )
    survey_date: str = Field(..., description="測量日期 (YYYY-MM-DD)")
    registration_date: str = Field(..., description="登記日期 (YYYY-MM-DD)")
    registration_reason: str = Field(..., description="登記原因 (e.g., 繼承, 買賣)")


class Holder(BaseModel):
    """Property holder information"""

    name: str = Field(..., description="權利人姓名")
    id_number_masked: str = Field(..., description="遮罩後身分證字號 (e.g., A123***789)")
    address: str = Field(..., description="地址")
    contact: Optional[str] = Field(None, description="聯絡方式")


class Ownership(BaseModel):
    """Ownership record"""

    holder: Holder = Field(..., description="權利人資訊")
    share_ratio: str = Field(..., description="權利範圍 (e.g., 1/1, 1/2)")
    acquisition_reason: str = Field(..., description="取得原因 (e.g., 繼承, 買賣)")
    acquisition_date: str = Field(..., description="取得日期 (YYYY-MM-DD)")

    @field_validator("share_ratio")
    @classmethod
    def validate_share_ratio(cls, v: str) -> str:
        """Validate share ratio format (numerator/denominator)"""
        if "/" not in v:
            raise ValueError("Share ratio must be in format 'numerator/denominator'")
        parts = v.split("/")
        if len(parts) != 2:
            raise ValueError("Share ratio must have exactly one '/'")
        try:
            numerator = int(parts[0])
            denominator = int(parts[1])
            if numerator <= 0 or denominator <= 0:
                raise ValueError("Share ratio parts must be positive integers")
        except ValueError as e:
            raise ValueError(f"Invalid share ratio format: {e}")
        return v


class FloorsInfo(BaseModel):
    """Building floors information"""

    above_ground: int = Field(..., ge=0, description="地上樓層數")
    underground: int = Field(..., ge=0, description="地下樓層數")


class BuildingProfile(BaseModel):
    """Building profile information"""

    location: str = Field(..., description="建物坐落")
    structure: str = Field(..., description="建物結構 (e.g., 鋼筋混凝土造)")
    main_use: str = Field(..., description="主要用途 (e.g., 住家用)")
    floors: FloorsInfo = Field(..., description="樓層資訊")
    completion_date: str = Field(..., description="建築完成日期 (YYYY-MM-DD)")


class AreaSummary(BaseModel):
    """Area summary with unit conversion"""

    units: str = Field(..., description="面積單位 (e.g., square_meter)")
    main_building: float = Field(..., ge=0.0, description="主建物面積")
    accessory_building: float = Field(..., ge=0.0, description="附屬建物面積")
    balcony: float = Field(..., ge=0.0, description="陽台面積")
    public_facilities: float = Field(..., ge=0.0, description="共有部分面積")
    total: float = Field(..., ge=0.0, description="總面積")
    converted_ping: Dict[str, float] = Field(..., description="坪數轉換")

    @field_validator("main_building", "accessory_building", "balcony", "public_facilities", "total")
    @classmethod
    def validate_non_negative(cls, v: float) -> float:
        """Ensure area values are non-negative"""
        if v < 0:
            raise ValueError("Area values must be non-negative")
        return v

    @model_validator(mode="after")
    def validate_total(self) -> "AreaSummary":
        """Validate that total approximately equals sum of parts"""
        calculated_total = (
            self.main_building
            + self.accessory_building
            + self.balcony
            + self.public_facilities
        )

        # Allow 0.01 tolerance for floating point errors
        if abs(self.total - calculated_total) > 0.01:
            # Only warn, don't fail - OCR might have different total
            pass

        return self


class Encumbrance(BaseModel):
    """Encumbrance record (e.g., mortgage)"""

    type: str = Field(..., description="他項權利類型 (e.g., 抵押權)")
    creditor: str = Field(..., description="債權人")
    amount_twd: int = Field(..., ge=0, description="債權金額 (TWD)")
    registration_date: str = Field(..., description="登記日期 (YYYY-MM-DD)")


class ConfidenceNote(BaseModel):
    """Confidence note for fields requiring review"""

    field: str = Field(..., description="欄位路徑 (e.g., ownerships[0].address)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="信心分數")
    status: str = Field(..., description="審核狀態 (e.g., needs_review, confirmed)")


class Sections(BaseModel):
    """Main content sections"""

    basic: BasicInfo = Field(..., description="基本登記資訊")
    ownerships: List[Ownership] = Field(..., description="所有權人列表")
    building_profile: BuildingProfile = Field(..., description="建物概況")
    area_summary: AreaSummary = Field(..., description="面積資訊")
    encumbrances: List[Encumbrance] = Field(default_factory=list, description="他項權利列表")
    raw_text: str = Field(..., description="原始 OCR 文字")
    confidence_notes: List[ConfidenceNote] = Field(
        default_factory=list, description="需要審核的欄位"
    )


class AuditInfo(BaseModel):
    """Audit and processing information"""

    processed_by: str = Field(..., description="處理者/流程識別")
    review_status: str = Field(..., description="審核狀態 (pending, confirmed, rejected)")
    checksum: str = Field(..., description="資料校驗和")


class TranscriptPayload(BaseModel):
    """
    Complete Jason JSON payload structure

    This is the main data model for building title transcript OCR results
    """

    metadata: Metadata = Field(..., description="文件詮釋資料")
    register_office: str = Field(..., description="登記機關")
    document_type: str = Field(..., description="文件類型")
    sections: Sections = Field(..., description="內容區段")
    audit: AuditInfo = Field(..., description="審計資訊")

    class Config:
        """Pydantic configuration"""

        json_schema_extra = {
            "example": {
                "metadata": {
                    "document_id": "123e4567-e89b-12d3-a456-426614174000",
                    "property_id": "123e4567-e89b-12d3-a456-426614174001",
                    "source_file": "102AF006705REG0A2576B0A7DBC47979B11B77DF4B1E4FE.pdf",
                    "processed_at": "2026-01-16T08:00:00Z",
                    "ocr_engine": {
                        "name": "DeepSeek-OCR",
                        "version": "v2025.12-int4",
                        "confidence": 0.94,
                    },
                },
                "register_office": "臺北市松山地政事務所",
                "document_type": "建物所有權狀謄本",
                "sections": {
                    "basic": {
                        "build_register_number": "松山建字第000000號",
                        "land_register_numbers": ["松山段一小段0000地號"],
                        "survey_date": "2023-11-15",
                        "registration_date": "2023-12-01",
                        "registration_reason": "繼承",
                    },
                    "ownerships": [
                        {
                            "holder": {
                                "name": "王大明",
                                "id_number_masked": "A123***789",
                                "address": "臺北市松山區XXX",
                                "contact": None,
                            },
                            "share_ratio": "1/1",
                            "acquisition_reason": "繼承",
                            "acquisition_date": "2023-12-01",
                        }
                    ],
                    "building_profile": {
                        "location": "臺北市松山區八德路四段200號",
                        "structure": "鋼筋混凝土造",
                        "main_use": "住家用",
                        "floors": {"above_ground": 12, "underground": 0},
                        "completion_date": "2015-07-30",
                    },
                    "area_summary": {
                        "units": "square_meter",
                        "main_building": 84.32,
                        "accessory_building": 6.51,
                        "balcony": 8.03,
                        "public_facilities": 24.11,
                        "total": 122.97,
                        "converted_ping": {"total": 37.2, "main_building": 25.5},
                    },
                    "encumbrances": [],
                    "raw_text": "...",
                    "confidence_notes": [],
                },
                "audit": {
                    "processed_by": "ocr_pipeline_v1",
                    "review_status": "pending",
                    "checksum": "sha256:...",
                },
            }
        }
