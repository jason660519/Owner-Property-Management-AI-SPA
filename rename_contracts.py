
import os
import re
import shutil
import logging
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

# Libraries
try:
    import pytesseract
    from pdf2image import convert_from_path
    from PIL import Image
    import pypdf
except ImportError:
    print("Missing required libraries. Please run: pip install pytesseract pdf2image Pillow pypdf")
    exit(1)

# Configuration
TARGET_DIR = "resources/samples/contracted_sample"
REPORT_FILE = "renaming_report.csv"
LOG_FILE = "renaming_process.log"

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler()
    ]
)

def sanitize_filename(title: str) -> str:
    """
    Sanitizes the title to be a valid filename.
    Removes special characters, replaces spaces with underscores, etc.
    """
    # Remove invalid characters for filesystem (Windows/Unix)
    # < > : " / \ | ? *
    title = re.sub(r'[<>:"/\\|?*]', '', title)
    
    # Replace whitespace with underscores
    title = re.sub(r'\s+', '_', title)
    
    # Remove control characters
    title = "".join(ch for ch in title if ch.isprintable())
    
    # Trim underscores from ends
    title = title.strip('_')
    
    # Limit length (optional, e.g. 200 chars)
    if len(title) > 200:
        title = title[:200]
        
    return title

def extract_title_from_text(text: str) -> Optional[str]:
    """
    Heuristic to find a title in text.
    Assumes title is likely in the first few non-empty lines.
    """
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if not lines:
        return None
    
    # Simple heuristic: take the first line that looks like a title (not too short, not a page number)
    for line in lines[:5]:
        if len(line) > 5: # Arbitrary min length
            return line
            
    return lines[0] if lines else None

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text from PDF. Tries PyPDF first, then OCR.
    """
    text = ""
    
    # Method 1: PyPDF (Metadata/Text Layer)
    try:
        reader = pypdf.PdfReader(file_path)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    except Exception as e:
        logging.warning(f"PyPDF extraction failed for {file_path}: {e}")

    # If text is sufficient, return it
    if len(text.strip()) > 50:
        return text

    # Method 2: OCR (if text layer missing/sparse)
    # Check if tesseract/poppler available
    if not shutil.which('tesseract'):
        logging.warning(f"Tesseract not found. Skipping OCR for {file_path}")
        return text # Return whatever we got
        
    try:
        logging.info(f"Attempting OCR for {file_path}...")
        images = convert_from_path(file_path, first_page=1, last_page=1) # Only first page needed for title
        if images:
            text = pytesseract.image_to_string(images[0], lang='chi_tra+eng') # Try Traditional Chinese + English
            return text
    except Exception as e:
        logging.error(f"OCR failed for {file_path}: {e}")
        
    return text

def process_file(file_path: Path) -> Tuple[str, str, str]:
    """
    Process a single file: extract title, determine new name.
    Returns: (original_name, new_name, status)
    """
    filename = file_path.name
    extension = file_path.suffix.lower()
    
    content_text = ""
    
    try:
        if extension == '.pdf':
            content_text = extract_text_from_pdf(str(file_path))
        elif extension in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content_text = f.read()
        elif extension in ['.doc', '.docx']:
             # Placeholder for DOC processing (requires extra libs like textract)
             logging.warning(f"DOC processing not fully implemented: {filename}")
             return filename, filename, "Skipped (Unsupported format)"
        else:
            return filename, filename, "Skipped (Unsupported extension)"
            
        if not content_text.strip():
             return filename, filename, "Failed (No text extracted)"
             
        title = extract_title_from_text(content_text)
        if not title:
            return filename, filename, "Failed (No title found)"
            
        new_filename_base = sanitize_filename(title)
        new_filename = f"{new_filename_base}{extension}"
        
        # Handle duplicate names
        if new_filename == filename:
             return filename, filename, "Skipped (Same name)"
             
        # Check if target exists
        target_path = file_path.parent / new_filename
        counter = 1
        while target_path.exists():
            new_filename = f"{new_filename_base}_{counter}{extension}"
            target_path = file_path.parent / new_filename
            counter += 1
            
        return filename, new_filename, "Success"

    except Exception as e:
        logging.error(f"Error processing {filename}: {e}")
        return filename, filename, f"Error ({str(e)})"

def main():
    base_dir = Path(TARGET_DIR)
    if not base_dir.exists():
        logging.error(f"Directory not found: {TARGET_DIR}")
        return

    files = [f for f in base_dir.iterdir() if f.is_file()]
    logging.info(f"Found {len(files)} files in {TARGET_DIR}")

    results = []

    for file_path in files:
        if file_path.name.startswith('.'): continue # Skip hidden files
        
        logging.info(f"Processing: {file_path.name}")
        old_name, new_name, status = process_file(file_path)
        
        if status == "Success":
            try:
                # Perform rename
                target_path = file_path.parent / new_name
                file_path.rename(target_path)
                logging.info(f"Renamed: {old_name} -> {new_name}")
            except Exception as e:
                status = f"Rename Failed ({e})"
                logging.error(f"Failed to rename {old_name}: {e}")
        
        results.append({
            'Original Name': old_name,
            'New Name': new_name,
            'Status': status,
            'Timestamp': datetime.now().isoformat()
        })

    # Generate Report
    with open(REPORT_FILE, 'w', newline='', encoding='utf-8-sig') as csvfile:
        fieldnames = ['Original Name', 'New Name', 'Status', 'Timestamp']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
        
    logging.info(f"Processing complete. Report generated at {REPORT_FILE}")

if __name__ == "__main__":
    main()
