"""
Taiwan Land Registry Transcript — PDF Ingestion Entry Point

Usage
-----
from src.parser.transcript_pdf_reader import extract_transcript

result = extract_transcript("path/to/謄本.pdf")
# result is a BuildingTranscript or LandTranscript dataclass, or None on failure.

Strategy
--------
1. Try to extract a text layer with PyMuPDF (fitz).
   - If total character count >= TEXT_LAYER_THRESHOLD, use deterministic regex parser.
2. If the PDF has no / too little text (scanned image), fall back to VLM OCR
   (via the existing vlm_engine in this service).
3. Return a structured dataclass — never a raw string.
"""

from __future__ import annotations

import re
import unicodedata
from pathlib import Path
from typing import Union

try:
    import fitz  # PyMuPDF
    _PYMUPDF_AVAILABLE = True
except ImportError:
    _PYMUPDF_AVAILABLE = False

from .building_transcript_parser import BuildingTranscript, parse_building_transcript
from .land_transcript_parser import LandTranscript, parse_land_transcript

# Minimum character count to trust the embedded text layer
_TEXT_LAYER_THRESHOLD = 200

TranscriptResult = Union[BuildingTranscript, LandTranscript, None]


# ---------------------------------------------------------------------------
# PDF text extraction
# ---------------------------------------------------------------------------

def _extract_text_pymupdf(pdf_path: str) -> str:
    """Extract all pages as a single concatenated string using PyMuPDF."""
    doc = fitz.open(pdf_path)
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()
    return "\n".join(pages)


def _has_text_layer(text: str) -> bool:
    """Return True if the extracted text is substantial enough to use directly."""
    # Strip whitespace/asterisks/newlines and count meaningful characters
    meaningful = re.sub(r"[\s*\-=]+", "", text)
    return len(meaningful) >= _TEXT_LAYER_THRESHOLD


# ---------------------------------------------------------------------------
# Transcript type detection
# ---------------------------------------------------------------------------

def _detect_type(text: str) -> str:
    """
    Detect whether this is a building (建物) or land (土地) transcript.

    Returns: '建物' | '土地' | 'unknown'
    """
    norm = unicodedata.normalize("NFKC", text[:500])
    if re.search(r"建物登記|建號全部|建物標示", norm):
        return "建物"
    if re.search(r"土地登記|地號|土地標示", norm):
        return "土地"
    return "unknown"


# ---------------------------------------------------------------------------
# VLM fallback
# ---------------------------------------------------------------------------

def _vlm_ocr_to_text(pdf_path: str) -> str:
    """
    Call the existing VLM engine to OCR a scanned/image PDF.

    Returns the extracted plain text, or empty string on failure.

    NOTE: This function intentionally does a lazy import so the module can be
    used without VLM credentials when the PDF has a text layer.
    """
    try:
        from ..vlm.vlm_engine import VLMEngine  # type: ignore[import]
        engine = VLMEngine()
        return engine.extract_text_from_pdf(pdf_path)
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_transcript(pdf_path: str | Path) -> TranscriptResult:
    """
    Parse a Taiwan land registry transcript PDF into a structured dataclass.

    Automatically:
      - Detects whether it is a 建物謄本 or 土地謄本.
      - Uses the embedded text layer when available (fast, deterministic).
      - Falls back to VLM OCR for scanned/image PDFs.

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        BuildingTranscript or LandTranscript on success, None on failure.

    Raises:
        FileNotFoundError: If the PDF file does not exist.
        RuntimeError: If PyMuPDF is not installed.
    """
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if not _PYMUPDF_AVAILABLE:
        raise RuntimeError(
            "PyMuPDF (pymupdf) is required. Install it with: pip install pymupdf"
        )

    raw_text = _extract_text_pymupdf(str(path))

    if not _has_text_layer(raw_text):
        # Scanned / image PDF — use VLM OCR fallback
        raw_text = _vlm_ocr_to_text(str(path))
        if not raw_text:
            return None

    transcript_type = _detect_type(raw_text)

    if transcript_type == "建物":
        return parse_building_transcript(raw_text)
    if transcript_type == "土地":
        return parse_land_transcript(raw_text)

    # Ambiguous — try building parser first, then land
    building_result = parse_building_transcript(raw_text)
    if building_result.ownership_records or building_result.building_description:
        return building_result
    return parse_land_transcript(raw_text)
