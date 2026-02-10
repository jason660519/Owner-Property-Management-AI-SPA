# ------------------------------------------------------------------------------
# @file analyze-pdf.py
# @description PDF Analysis Script (Sample)
# @description PDF 分析腳本（範例）
# @created 2026-02-11
# @creator Trae AI
# @lastModified 2026-02-11
# @modifiedBy Trae AI
# @version 1.0
# ------------------------------------------------------------------------------

import os
from pypdf import PdfReader

file_path = "resources/samples/contracted_sample/000043-A-EYW8I.PDF"

try:
    reader = PdfReader(file_path)
    print(f"Metadata: {reader.metadata}")
    
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    
    print(f"Extracted Text Length: {len(text)}")
    print(f"Extracted Text Preview: {text[:500]}")
    
except Exception as e:
    print(f"Error: {e}")
