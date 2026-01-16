# OCR Service 測試指南

> 如何驗證 OCR Service 是否正常工作

---

## 方式一：執行自動化測試（推薦）✅

這是最快速、最全面的驗證方式。

### 步驟 1: 進入專案目錄

```bash
cd /Users/jason66/Owner\ Real\ Estate\ Agent\ SaaS/backend/ocr_service
```

### 步驟 2: 啟動虛擬環境

```bash
source venv/bin/activate
```

### 步驟 3: 執行所有測試

```bash
# 執行所有 75 個單元測試
pytest tests/unit/ -v

# 或使用更詳細的輸出
pytest tests/unit/ -v --tb=short
```

### 預期結果

```
======================== 75 passed, 1 warning in 7.35s =========================

✅ 所有測試通過代表：
- Jason JSON Schema 驗證正確（16 個測試）
- 欄位解析引擎工作正常（29 個測試）
- PDF 前處理功能完整（30 個測試）
```

### 查看覆蓋率報告

```bash
# 產生 HTML 覆蓋率報告
pytest tests/unit/ --cov=src --cov-report=html

# 在瀏覽器中開啟報告
open htmlcov/index.html  # macOS
```

---

## 方式二：執行完整 Workflow 範例 🚀

測試真實的 PDF 處理流程。

### 步驟 1: 確認有測試 PDF

```bash
# 檢查是否有樣本 PDF
ls ../../../resources/samples/建物謄本PDF範例/*.pdf | head -3
```

應該會看到類似：

```
102AF006705REG0A2576B0A7DBC47979B11B77DF4B1E4FE.pdf
102AF006706REG0B86F366ABE2443FAB5EBAB9C4FE49065.pdf
...
```

### 步驟 2: 執行 Workflow

```bash
python examples/complete_workflow.py
```

### 預期輸出

```
╔==========================================================╗
║          OCR Service Complete Workflow                   ║
╚==========================================================╝

📄 Processing: 102AF022944REG02E9EC68747504C53A80B70B286C68179.pdf

============================================================
Step 1: PDF Preprocessing
============================================================
✓ PDF rendered at 300 DPI
✓ Image enhanced (denoise + deskew + contrast)
✓ Quality score: 0.87
✓ Processing time: 0.83s

============================================================
Step 2: OCR Text Recognition (MOCK)
============================================================
✓ OCR engine: DeepSeek-OCR (mock)
✓ Recognized text: 393 characters

============================================================
Step 3: Field Parsing
============================================================
✓ Building number: 松山建字第123456號
✓ Land number: 松山段一小段0100地號
✓ Total area: 122.97 sqm
✓ Completion date: 2015-07-30
✓ Registration date: 2023-12-01
✓ Owner: 王大明

============================================================
Step 4: Jason JSON Generation
============================================================
✓ Jason JSON payload generated
✓ Document ID: 123e4567-e89b-12d3-a456-426614174000
✓ Property ID: 123e4567-e89b-12d3-a456-426614174001
✓ OCR confidence: 0.94

============================================================
✅ Workflow Complete!
============================================================
📁 Preprocessed image: data/output/xxx_page0.png
📁 Jason JSON result: data/output/xxx_result.json
```

### 步驟 3: 檢查輸出檔案

```bash
# 查看處理後的圖像
ls -lh data/output/*.png

# 查看生成的 JSON
cat data/output/*.json | head -50
```

---

## 方式三：互動式測試個別模組 🔍

在 Python REPL 中測試各個模組。

### 測試 PDF 前處理

```bash
python3 -c "
from pathlib import Path
from src.preprocessor.pdf_preprocessor import PreprocessingPipeline

# 初始化
pipeline = PreprocessingPipeline(dpi=300, enhance=True)

# 處理 PDF
pdf_path = Path('../../../resources/samples/建物謄本PDF範例').glob('*.pdf').__next__()
result = pipeline.process_page(pdf_path, page_num=0)

# 輸出結果
print(f'✓ PDF processed successfully')
print(f'✓ Image shape: {result[\"image\"].shape}')
print(f'✓ Quality score: {result[\"quality_score\"]:.2f}')
"
```

### 測試欄位解析

```bash
python3 -c "
from src.parser.field_parser import LandNumberParser, BuildNumberParser, DateParser

# 測試地號解析
land_parser = LandNumberParser()
result = land_parser.parse('松山段一小段0100地號')
print(f'✓ Land number: {result}')

# 測試建號解析
build_parser = BuildNumberParser()
result = build_parser.parse('松山建字第123456號')
print(f'✓ Build number: {result}')

# 測試日期轉換
date_parser = DateParser()
result = date_parser.parse('民國112年12月01日')
print(f'✓ Date converted: {result}')
"
```

### 測試 Jason JSON

```bash
python3 -c "
from datetime import datetime
from src.models.jason_schema import TranscriptPayload, Metadata, OCREngine

# 建立簡單的 payload
payload = TranscriptPayload(
    metadata=Metadata(
        document_id='123e4567-e89b-12d3-a456-426614174000',
        property_id='123e4567-e89b-12d3-a456-426614174001',
        source_file='test.pdf',
        processed_at=datetime.now(),
        ocr_engine=OCREngine(name='Test', version='1.0', confidence=0.95)
    ),
    register_office='測試地政事務所',
    document_type='建物所有權狀謄本',
    sections={
        'basic': {
            'build_register_number': '測試建字第000000號',
            'land_register_numbers': ['測試段0000地號'],
            'survey_date': '2023-01-01',
            'registration_date': '2023-01-01',
            'registration_reason': '買賣'
        },
        'ownerships': [],
        'building_profile': {
            'location': '測試市測試區測試路1號',
            'structure': '鋼筋混凝土造',
            'main_use': '住家用',
            'floors': {'above_ground': 1, 'underground': 0},
            'completion_date': '2023-01-01'
        },
        'area_summary': {
            'units': 'square_meter',
            'main_building': 0.0,
            'accessory_building': 0.0,
            'balcony': 0.0,
            'public_facilities': 0.0,
            'total': 0.0,
            'converted_ping': {'total': 0.0, 'main_building': 0.0}
        },
        'encumbrances': [],
        'raw_text': '',
        'confidence_notes': []
    },
    audit={'processed_by': 'test', 'review_status': 'pending', 'checksum': ''}
)

print('✓ Jason JSON payload created successfully')
print(f'✓ Document ID: {payload.metadata.document_id}')
print(f'✓ Can serialize to JSON: {len(payload.model_dump_json()) > 0}')
"
```

---

## 方式四：測試特定功能 🎯

### 測試 1: PDF 渲染品質

```bash
pytest tests/unit/test_pdf_preprocessor.py::TestPDFRenderer -v
```

預期：6 個測試通過

### 測試 2: 圖像增強

```bash
pytest tests/unit/test_pdf_preprocessor.py::TestImageEnhancer -v
```

預期：5 個測試通過

### 測試 3: 欄位解析

```bash
pytest tests/unit/test_field_parser.py::TestLandNumberParser -v
pytest tests/unit/test_field_parser.py::TestAreaConverter -v
```

預期：所有測試通過

### 測試 4: Jason JSON 驗證

```bash
pytest tests/unit/test_jason_schema.py::TestTranscriptPayload -v
```

預期：5 個測試通過

---

## 常見問題排查 🔧

### 問題 1: 找不到模組

```bash
# 確保 PYTHONPATH 設定正確
export PYTHONPATH=/Users/jason66/Owner\ Real\ Estate\ Agent\ SaaS/backend/ocr_service:$PYTHONPATH

# 或在 pytest 指令中設定
PYTHONPATH=$(pwd) pytest tests/unit/ -v
```

### 問題 2: 虛擬環境未啟動

```bash
# 檢查是否在虛擬環境中
which python3
# 應該顯示：.../ocr_service/venv/bin/python3

# 如果不是，重新啟動
source venv/bin/activate
```

### 問題 3: 缺少依賴

```bash
# 重新安裝所有依賴
pip install -r requirements.txt
```

### 問題 4: 測試失敗

```bash
# 查看詳細錯誤訊息
pytest tests/unit/test_xxx.py -v --tb=long

# 只執行失敗的測試
pytest tests/unit/ --lf
```

---

## 效能基準測試 📊

### 測試處理速度

```bash
time python examples/complete_workflow.py
```

預期時間：

- Mac mini Apple Silicon: ~1-2 秒
- 一般電腦: ~2-5 秒

### 測試記憶體使用

```bash
# macOS
/usr/bin/time -l python examples/complete_workflow.py

# 查看 maximum resident set size
```

---

## 驗證清單 ✅

完成以下清單代表 OCR Service 工作正常：

- [ ] 所有 75 個單元測試通過
- [ ] 覆蓋率報告顯示 89%
- [ ] complete_workflow.py 成功執行
- [ ] 生成了 PNG 圖像檔案
- [ ] 生成了 JSON 結果檔案
- [ ] JSON 檔案格式正確且可讀取
- [ ] 欄位解析結果準確
- [ ] 圖像品質分數 > 0.7
- [ ] 處理時間 < 2 秒

---

## 下一步 🚀

測試通過後，您可以：

1. **查看生成的檔案**

   ```bash
   ls -lh data/output/
   ```

2. **檢視 JSON 結構**

   ```bash
   cat data/output/*.json | jq .
   ```

3. **查看處理後的圖像**

   ```bash
   open data/output/*.png  # macOS
   ```

4. **整合到您的應用**
   - 參考 `examples/complete_workflow.py`
   - 使用 `PreprocessingPipeline` 處理 PDF
   - 使用 Field Parsers 解析文字
   - 使用 `TranscriptPayload` 生成 JSON

---

## 需要協助？

- 📖 查看 [README.md](README.md)
- 📖 查看 [QUICKSTART.md](QUICKSTART.md)
- 📖 查看 [DEVELOPMENT_SUMMARY.md](DEVELOPMENT_SUMMARY.md)
- 🐛 提交 Issue 到專案 repository

---

**測試環境**: Python 3.14.2, pytest 9.0.2
**最後更新**: 2026-01-16
