"""
Field parsing and extraction rules for Taiwan land registry transcripts.

Public API
----------
extract_transcript(pdf_path)  -> BuildingTranscript | LandTranscript | None
    Primary entry point. Auto-detects transcript type and uses text-layer
    parsing when available, falling back to VLM OCR for image PDFs.

parse_building_transcript(raw_text) -> BuildingTranscript
parse_land_transcript(raw_text)     -> LandTranscript
    Lower-level parsers for pre-extracted text.
"""

from .transcript_pdf_reader import extract_transcript
from .building_transcript_parser import (
    BuildingTranscript,
    BuildingDescription,
    OwnerRecord,
    OtherRightRecord,
    TranscriptMeta,
    parse_building_transcript,
)
from .land_transcript_parser import (
    LandTranscript,
    LandDescription,
    LandOwnerRecord,
    LandOtherRightRecord,
    LandTranscriptMeta,
    parse_land_transcript,
)
from .cjk_normalize import normalize as cjk_normalize

__all__ = [
    "extract_transcript",
    "BuildingTranscript",
    "BuildingDescription",
    "OwnerRecord",
    "OtherRightRecord",
    "TranscriptMeta",
    "parse_building_transcript",
    "LandTranscript",
    "LandDescription",
    "LandOwnerRecord",
    "LandOtherRightRecord",
    "LandTranscriptMeta",
    "parse_land_transcript",
    "cjk_normalize",
]
