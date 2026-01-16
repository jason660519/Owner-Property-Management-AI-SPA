---
paths:
  - 'backend/ocr_service/**/*.py'
  - 'backend/**/*.py'
  - '**/test_*.py'
  - '**/tests/**/*.py'
---

# Python/OCR 服務開發規則

> 此規則僅在編輯 Python 相關檔案時自動載入

---

## 技術棧

| 技術          | 版本   | 用途     |
| :------------ | :----- | :------- |
| Python        | 3.11+  | 主要語言 |
| pytest        | latest | 測試框架 |
| Tesseract OCR | 5.x    | OCR 引擎 |
| pdf2image     | latest | PDF 處理 |
| Pillow        | latest | 圖像處理 |

---

## 專案結構

```
backend/ocr_service/
├── src/
│   ├── __init__.py
│   ├── core/              # 核心 OCR 處理
│   ├── preprocessing/     # PDF/圖像預處理
│   ├── parsers/           # 欄位解析器
│   └── schemas/           # 資料結構定義
├── tests/                 # 測試檔案
├── config/                # 配置檔案
├── data/                  # 測試資料與輸出
└── examples/              # 使用範例
```

---

## 命名規範

### Python 檔案與模塊

| 類型      | 規則                 | 範例                                      |
| :-------- | :------------------- | :---------------------------------------- |
| 模塊/套件 | snake_case           | `pdf_processor.py`, `field_parser.py`     |
| 類別      | PascalCase           | `OCREngine`, `BuildingParser`             |
| 函數/方法 | snake_case           | `extract_text()`, `parse_building_info()` |
| 變數      | snake_case           | `pdf_path`, `extracted_data`              |
| 常數      | UPPER_SNAKE_CASE     | `MAX_IMAGE_SIZE`, `DEFAULT_DPI`           |
| 私有成員  | \_leading_underscore | `_internal_method()`, `_cache`            |

### 測試檔案

| 類型     | 規則        | 範例                               |
| :------- | :---------- | :--------------------------------- |
| 測試模塊 | `test_*.py` | `test_pdf_processor.py`            |
| 測試類別 | `Test*`     | `class TestOCREngine`              |
| 測試函數 | `test_*`    | `def test_extract_text_from_pdf()` |

---

## 程式碼風格

### 通用原則

- 遵守 PEP 8 規範
- 使用 4 空格縮排
- 每行最多 88 字元（Black formatter 標準）
- 使用 type hints 標註型別

### Type Hints 範例

```python
from typing import List, Dict, Optional, Union
from pathlib import Path

def extract_text(
    pdf_path: Path,
    page_numbers: Optional[List[int]] = None,
    dpi: int = 300
) -> Dict[str, str]:
    """Extract text from PDF pages.

    Args:
        pdf_path: Path to the PDF file
        page_numbers: Specific pages to process (None for all)
        dpi: Image resolution for OCR

    Returns:
        Dictionary mapping page numbers to extracted text
    """
    pass
```

### Docstring 格式

使用 Google Style Docstrings：

```python
def parse_building_info(text: str) -> Dict[str, any]:
    """Parse building information from OCR text.

    Args:
        text: Raw text extracted from building transcript

    Returns:
        Parsed building information as dictionary

    Raises:
        ValueError: If text format is invalid

    Example:
        >>> text = "建物門牌: 台北市信義區..."
        >>> result = parse_building_info(text)
        >>> print(result['address'])
        '台北市信義區...'
    """
    pass
```

---

## 測試規範

### 測試覆蓋率要求

- **最小覆蓋率**：80%
- **核心模塊**：90%+ (`core/`, `parsers/`)
- **執行測試**：`pytest --cov=src --cov-report=html`

### 測試結構

```python
# test_pdf_processor.py
import pytest
from pathlib import Path
from src.preprocessing.pdf_processor import PDFProcessor

class TestPDFProcessor:
    """Test suite for PDF processing functionality."""

    @pytest.fixture
    def sample_pdf(self) -> Path:
        """Provide sample PDF for testing."""
        return Path("tests/fixtures/sample_building.pdf")

    def test_extract_text_from_valid_pdf(self, sample_pdf):
        """Test text extraction from valid PDF file."""
        processor = PDFProcessor()
        result = processor.extract_text(sample_pdf)

        assert result is not None
        assert len(result) > 0
        assert isinstance(result, dict)

    def test_extract_text_from_missing_file(self):
        """Test handling of missing PDF file."""
        processor = PDFProcessor()

        with pytest.raises(FileNotFoundError):
            processor.extract_text(Path("nonexistent.pdf"))
```

### 使用 Fixtures

```python
# conftest.py
import pytest
from pathlib import Path

@pytest.fixture
def test_data_dir() -> Path:
    """Provide test data directory path."""
    return Path(__file__).parent / "fixtures"

@pytest.fixture
def sample_building_pdf(test_data_dir) -> Path:
    """Provide sample building transcript PDF."""
    return test_data_dir / "building_transcript.pdf"
```

---

## OCR 特定規範

### PDF 預處理流程

```python
from typing import List
from PIL import Image
import pdf2image

class PDFPreprocessor:
    """Preprocess PDF files for OCR."""

    DEFAULT_DPI = 300
    MAX_IMAGE_SIZE = (4000, 4000)

    def preprocess(self, pdf_path: Path) -> List[Image.Image]:
        """Preprocess PDF pages for optimal OCR results.

        Processing steps:
        1. Convert PDF to images at high DPI
        2. Resize if exceeding maximum dimensions
        3. Apply grayscale conversion
        4. Enhance contrast if needed
        """
        images = pdf2image.convert_from_path(
            pdf_path,
            dpi=self.DEFAULT_DPI
        )

        processed = []
        for img in images:
            img = self._resize_if_needed(img)
            img = self._to_grayscale(img)
            img = self._enhance_contrast(img)
            processed.append(img)

        return processed
```

### 欄位解析規則

```python
import re
from typing import Optional

class BuildingFieldParser:
    """Parse specific fields from building transcript."""

    # 正則表達式模式
    ADDRESS_PATTERN = r'建物門牌[:：]\s*(.+?)(?:\n|$)'
    AREA_PATTERN = r'面積[:：]\s*([\d.]+)\s*平方公尺'

    def parse_address(self, text: str) -> Optional[str]:
        """Extract building address from text.

        Args:
            text: OCR extracted text

        Returns:
            Parsed address or None if not found
        """
        match = re.search(self.ADDRESS_PATTERN, text)
        return match.group(1).strip() if match else None

    def parse_area(self, text: str) -> Optional[float]:
        """Extract building area from text.

        Args:
            text: OCR extracted text

        Returns:
            Area in square meters or None if not found
        """
        match = re.search(self.AREA_PATTERN, text)
        return float(match.group(1)) if match else None
```

---

## 錯誤處理

### 自訂例外

```python
# exceptions.py

class OCRServiceError(Exception):
    """Base exception for OCR service."""
    pass

class PDFProcessingError(OCRServiceError):
    """Raised when PDF processing fails."""
    pass

class TextExtractionError(OCRServiceError):
    """Raised when OCR text extraction fails."""
    pass

class FieldParsingError(OCRServiceError):
    """Raised when field parsing fails."""
    pass
```

### 錯誤處理範例

```python
import logging
from pathlib import Path
from .exceptions import PDFProcessingError

logger = logging.getLogger(__name__)

def process_building_pdf(pdf_path: Path) -> dict:
    """Process building transcript PDF with error handling.

    Args:
        pdf_path: Path to PDF file

    Returns:
        Parsed building information

    Raises:
        PDFProcessingError: If processing fails
    """
    try:
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        # Processing logic here
        result = _extract_and_parse(pdf_path)

        logger.info(f"Successfully processed: {pdf_path.name}")
        return result

    except FileNotFoundError as e:
        logger.error(f"File error: {e}")
        raise PDFProcessingError(f"Cannot access PDF: {e}") from e

    except Exception as e:
        logger.exception(f"Unexpected error processing {pdf_path.name}")
        raise PDFProcessingError(f"Processing failed: {e}") from e
```

---

## 日誌記錄

### Logging 配置

```python
# config/logging_config.py
import logging
from pathlib import Path

def setup_logging(log_dir: Path = Path("logs")):
    """Configure logging for OCR service."""

    log_dir.mkdir(exist_ok=True)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_dir / "ocr_service.log"),
            logging.StreamHandler()
        ]
    )
```

### 使用範例

```python
import logging

logger = logging.getLogger(__name__)

def extract_text(pdf_path: Path) -> str:
    logger.debug(f"Starting text extraction: {pdf_path}")

    try:
        # Processing logic
        result = _do_extraction(pdf_path)
        logger.info(f"Extracted {len(result)} characters")
        return result

    except Exception as e:
        logger.error(f"Extraction failed: {e}", exc_info=True)
        raise
```

---

## 依賴管理

### requirements.txt

```txt
# Core dependencies
pytesseract>=0.3.10
pdf2image>=1.16.0
Pillow>=10.0.0

# Development dependencies (requirements-dev.txt)
pytest>=7.4.0
pytest-cov>=4.1.0
black>=23.0.0
flake8>=6.0.0
mypy>=1.5.0
```

### 虛擬環境

```bash
# 建立虛擬環境
python -m venv venv

# 啟動虛擬環境 (macOS/Linux)
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

---

## 效能最佳化

### 處理大型 PDF

```python
from typing import Iterator
import gc

def process_large_pdf_in_batches(
    pdf_path: Path,
    batch_size: int = 10
) -> Iterator[dict]:
    """Process large PDF in batches to manage memory.

    Args:
        pdf_path: Path to PDF file
        batch_size: Number of pages per batch

    Yields:
        Parsed data for each batch
    """
    total_pages = _get_page_count(pdf_path)

    for start in range(0, total_pages, batch_size):
        end = min(start + batch_size, total_pages)
        pages = list(range(start, end))

        # Process batch
        batch_result = _process_pages(pdf_path, pages)
        yield batch_result

        # Free memory
        gc.collect()
```

---

## 參考文檔

- [Tesseract OCR Documentation](https://tesseract-ocr.github.io/)
- [pdf2image PyPI](https://pypi.org/project/pdf2image/)
- [Pillow Documentation](https://pillow.readthedocs.io/)
- [pytest Documentation](https://docs.pytest.org/)
- [PEP 8 Style Guide](https://pep8.org/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)

---

**最後更新**：2026-01-16
