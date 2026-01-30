# Phase 2 完成：PDF 前處理模組

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 技術文件

---


> **完成日期**: 2026-01-16
> **開發方式**: Test-Driven Development (TDD)
> **狀態**: ✅ Phase 2 PDF 前處理完成

---

## 完成項目總覽

### Phase 1: 核心模組（已完成）✅

- Jason JSON Schema (Pydantic)
- 欄位解析規則引擎

### Phase 2: PDF 前處理（本次完成）✅

- PDF 渲染器（PyMuPDF）
- 圖像增強器（OpenCV）
- 圖像品質檢查器
- ROI 區域抽取器
- 完整前處理 Pipeline

---

## PDF 前處理模組詳細說明

### 1. PDFRenderer - PDF 渲染器

**功能**：

- 將 PDF 頁面渲染為高品質圖像
- 支援自訂 DPI (300-400 推薦)
- 支援彩色/灰階模式
- 單頁或全文件渲染

**使用範例**：

```python
from src.preprocessor.pdf_preprocessor import PDFRenderer
from pathlib import Path

renderer = PDFRenderer(dpi=300, color_mode="grayscale")

# 渲染單頁
pdf_path = Path("document.pdf")
images = renderer.render(pdf_path, page_num=0)

# 渲染全文件
all_images = renderer.render_all(pdf_path)

# 取得頁數
page_count = renderer.get_page_count(pdf_path)
```

**測試覆蓋**：6 個測試全部通過

### 2. ImageEnhancer - 圖像增強器

**功能**：

- 去噪處理（fastNlMeansDenoising）
- 傾斜校正（Deskewing）
- 自適應二值化（Adaptive Thresholding）
- 對比度增強（CLAHE）
- 邊框移除

**使用範例**：

```python
from src.preprocessor.pdf_preprocessor import ImageEnhancer

enhancer = ImageEnhancer()

# 去噪
denoised = enhancer.denoise(image, strength=10)

# 自動校正傾斜
deskewed = enhancer.deskew(image)

# 二值化
binary = enhancer.adaptive_threshold(image)

# 增強對比度
enhanced = enhancer.enhance_contrast(image)

# 移除黑邊
cleaned = enhancer.remove_borders(image)
```

**測試覆蓋**：5 個測試全部通過

### 3. ImageQualityChecker - 圖像品質檢查器

**功能**：

- 銳利度評估（Laplacian variance）
- 對比度計算
- 噪音估計（MAD）
- 綜合品質分數（0-1）

**使用範例**：

```python
from src.preprocessor.pdf_preprocessor import ImageQualityChecker

checker = ImageQualityChecker()

# 計算銳利度
sharpness = checker.calculate_sharpness(image)

# 檢查是否模糊
is_sharp = checker.is_sharp(image, threshold=100)

# 計算對比度
contrast = checker.calculate_contrast(image)

# 估計噪音
noise = checker.estimate_noise(image)

# 綜合品質分數
quality_score = checker.calculate_quality_score(image)  # 0.0-1.0
```

**測試覆蓋**：5 個測試全部通過

### 4. ROIExtractor - ROI 區域抽取器

**功能**：

- 偵測文字區域
- 座標式 ROI 抽取
- 頁首區域抽取
- 所有權人區域抽取
- 面積資訊區域抽取
- 區域排序

**使用範例**：

```python
from src.preprocessor.pdf_preprocessor import ROIExtractor

extractor = ROIExtractor()

# 偵測所有文字區域
regions = extractor.detect_text_regions(image)

# 抽取特定座標區域
roi = extractor.extract_roi(image, x=50, y=100, w=200, h=50)

# 抽取頁首
header = extractor.extract_header(image)

# 抽取所有權人區域
owner_section = extractor.extract_owner_section(image)

# 抽取面積區域
area_section = extractor.extract_area_section(image)

# 依位置排序區域
sorted_regions = extractor.sort_regions_vertically(regions)
```

**測試覆蓋**：6 個測試全部通過

### 5. PreprocessingPipeline - 完整前處理流程

**功能**：

- 整合所有前處理步驟
- 品質檢查與警告
- 中間結果儲存
- 效能追蹤

**使用範例**：

```python
from src.preprocessor.pdf_preprocessor import PreprocessingPipeline
from pathlib import Path

# 初始化 Pipeline
pipeline = PreprocessingPipeline(
    dpi=300,
    enhance=True,
    quality_threshold=0.7,
    save_intermediate=True,
    output_dir=Path("./output"),
    track_performance=True
)

# 處理單頁
pdf_path = Path("document.pdf")
result = pipeline.process_page(pdf_path, page_num=0)

# 結果結構
{
    "image": np.ndarray,           # 處理後的圖像
    "quality_score": 0.85,         # 品質分數
    "metadata": {
        "processing_time": 1.23,   # 處理時間（秒）
        "warning": "..."           # 品質警告（如有）
    }
}

# 處理整份文件
results = pipeline.process_document(pdf_path)
for result in results:
    page_num = result["page_num"]
    quality = result["quality_score"]
    print(f"Page {page_num}: Quality {quality:.2f}")
```

**測試覆蓋**：8 個測試全部通過

---

## 測試統計

### 整體測試結果

```
總測試數: 75
通過: 75 ✅
失敗: 0
整體覆蓋率: 89%
```

### 模組別測試結果

| 模組              | 測試數 | 通過率 | 覆蓋率 |
| :---------------- | :----- | :----- | :----- |
| Jason JSON Schema | 16     | 100%   | 93%    |
| Field Parser      | 29     | 100%   | 87%    |
| PDF Preprocessor  | 30     | 100%   | 88%    |

### PDF 前處理測試分佈

- **PDFRenderer**: 6 個測試
- **ImageEnhancer**: 5 個測試
- **ImageQualityChecker**: 5 個測試
- **ROIExtractor**: 6 個測試
- **PreprocessingPipeline**: 6 個測試
- **Integration Tests**: 2 個測試

---

## 技術亮點

### 1. PyMuPDF 高品質渲染

```python
# 使用 zoom matrix 控制 DPI
zoom = dpi / 72.0
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
```

### 2. OpenCV 圖像增強

```python
# CLAHE 對比度增強
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
enhanced = clahe.apply(image)

# 自適應二值化
binary = cv2.adaptiveThreshold(
    gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY, block_size, c
)
```

### 3. 銳利度評估

```python
# Laplacian variance 銳利度指標
laplacian = cv2.Laplacian(gray, cv2.CV_64F)
sharpness = laplacian.var()
```

### 4. 傾斜偵測與校正

```python
# 使用 minAreaRect 偵測傾斜角度
coords = np.column_stack(np.where(binary > 0))
rect = cv2.minAreaRect(coords)
angle = rect[-1]

# 使用 scipy.ndimage.rotate 校正
rotated = rotate(image, angle, reshape=False, mode="nearest")
```

---

## 完整處理流程範例

```python
from pathlib import Path
from src.preprocessor.pdf_preprocessor import PreprocessingPipeline
from src.parser.field_parser import (
    LandNumberParser,
    BuildNumberParser,
    AreaConverter
)

# 1. 前處理：PDF → 圖像
pipeline = PreprocessingPipeline(dpi=300, enhance=True)
pdf_path = Path("resources/samples/建物謄本PDF範例/sample.pdf")
result = pipeline.process_page(pdf_path, page_num=0)

image = result["image"]
quality = result["quality_score"]
print(f"Image quality: {quality:.2f}")

# 2. OCR：圖像 → 文字（待整合）
# ocr_text = ocr_engine.recognize(image)

# 3. 欄位解析：文字 → 結構化資料
# land_parser = LandNumberParser()
# land_number = land_parser.parse(ocr_text)
```

---

## 依賴清單

新增的依賴：

```txt
pymupdf>=1.24.0        # PDF 渲染
opencv-python>=4.9.0   # 圖像處理
scipy>=1.12.0          # 圖像旋轉
numpy>=2.0.0           # 陣列運算
```

---

## TDD 循環記錄

### 循環 3: PDF 前處理模組

1. **Red**: 撰寫 30 個測試（`test_pdf_preprocessor.py`）
2. **Green**: 實作 5 個 classes（`pdf_preprocessor.py`）
   - PDFRenderer
   - ImageEnhancer
   - ImageQualityChecker
   - ROIExtractor
   - PreprocessingPipeline
3. **Refactor**: 調整 deskew 測試使用更真實的圖像
4. **結果**: ✅ 30/30 測試通過，88% 覆蓋率

---

## 效能指標

### 處理時間（測試環境：Mac mini Apple Silicon）

- 單頁 PDF 渲染（300 DPI）：~0.5 秒
- 圖像去噪：~0.3 秒
- 傾斜校正：~0.2 秒
- 對比度增強：~0.1 秒
- 完整 Pipeline：~1.2 秒/頁

### 圖像品質

- 輸出解析度：300 DPI
- 色彩模式：8-bit 灰階
- 檔案大小：~500KB/頁（PNG）
- 品質分數：通常 > 0.7

---

## 已知限制

1. **DPI 設定**：過高的 DPI（>600）會顯著增加處理時間和記憶體使用
2. **傾斜偵測**：對於複雜版面或手寫文字可能不準確
3. **ROI 抽取**：目前使用固定比例，不同版型可能需要調整
4. **記憶體使用**：批次處理大量 PDF 時需注意記憶體管理

---

## 下一步

### Phase 3: OCR 整合（待開發）

- [ ] 整合 DeepSeek-OCR 或其他 OCR 引擎
- [ ] 建立整合測試：前處理 → OCR → 欄位抽取
- [ ] 效能優化與批次處理

### Phase 4: 容器化與部署（待開發）

- [ ] FastAPI REST API
- [ ] Docker 容器化
- [ ] Docker Compose 編排
- [ ] Supabase 整合

---

## 執行測試

```bash
# 執行所有單元測試
cd backend/ocr_service
source venv/bin/activate
pytest tests/unit/ -v

# 只執行 PDF 前處理測試
pytest tests/unit/test_pdf_preprocessor.py -v

# 產生覆蓋率報告
pytest tests/unit/ --cov=src --cov-report=html
open htmlcov/index.html
```

---

**開發者**: Claude Sonnet 4.5
**專案**: Owner Real Estate Agent SaaS - OCR Service
**最後更新**: 2026-01-16
**總測試數**: 75
**總覆蓋率**: 89%
