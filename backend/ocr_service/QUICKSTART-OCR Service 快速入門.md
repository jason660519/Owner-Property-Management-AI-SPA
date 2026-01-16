# OCR Service 快速入門

> 5 分鐘快速上手建物謄本 OCR 服務開發

---

## 環境需求

- Python 3.11+
- pip 或 conda
- 約 500MB 磁碟空間

---

## 快速開始

### 1. 建立虛擬環境

```bash
cd backend/ocr_service
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows
```

### 2. 安裝依賴

```bash
# 基礎依賴
pip install -r requirements.txt

# 開發依賴（包含測試工具）
pip install -r requirements-dev.txt
```

### 3. 執行測試

```bash
# 執行所有單元測試
pytest tests/unit/ -v

# 查看覆蓋率
pytest tests/unit/ --cov=src --cov-report=term-missing
```

---

## 使用範例

### 解析建物謄本欄位

```python
from src.parser.field_parser import (
    LandNumberParser,
    BuildNumberParser,
    AreaConverter,
    OwnerInfoParser,
    DateParser
)

# 解析地號
land_parser = LandNumberParser()
result = land_parser.parse("松山段一小段0000地號")
print(result)  # → "松山段一小段0000地號"

# 解析建號
build_parser = BuildNumberParser()
result = build_parser.parse("松山建字第000000號")
print(result)  # → "松山建字第000000號"

# 解析面積
area_converter = AreaConverter()
result = area_converter.parse("面積：84.32平方公尺")
print(result)  # → {"value": 84.32, "unit": "square_meter"}

# 平方公尺轉坪
ping = area_converter.to_ping(100.0)
print(ping)  # → 30.25

# 解析日期
date_parser = DateParser()
result = date_parser.parse("民國112年12月01日")
print(result)  # → "2023-12-01"
```

### 建立 Jason JSON

```python
from datetime import datetime
from src.models.jason_schema import (
    TranscriptPayload,
    Metadata,
    OCREngine,
    Sections,
    BasicInfo,
    BuildingProfile,
    AreaSummary,
    FloorsInfo
)

# 建立完整的 Jason JSON
payload = TranscriptPayload(
    metadata=Metadata(
        document_id="123e4567-e89b-12d3-a456-426614174000",
        property_id="123e4567-e89b-12d3-a456-426614174001",
        source_file="test.pdf",
        processed_at=datetime.now(),
        ocr_engine=OCREngine(
            name="DeepSeek-OCR",
            version="v2025.12",
            confidence=0.95
        )
    ),
    register_office="臺北市松山地政事務所",
    document_type="建物所有權狀謄本",
    sections=Sections(
        basic=BasicInfo(
            build_register_number="松山建字第000000號",
            land_register_numbers=["松山段一小段0000地號"],
            survey_date="2023-11-15",
            registration_date="2023-12-01",
            registration_reason="繼承"
        ),
        ownerships=[],
        building_profile=BuildingProfile(
            location="臺北市松山區八德路四段200號",
            structure="鋼筋混凝土造",
            main_use="住家用",
            floors=FloorsInfo(above_ground=12, underground=0),
            completion_date="2015-07-30"
        ),
        area_summary=AreaSummary(
            units="square_meter",
            main_building=84.32,
            accessory_building=6.51,
            balcony=8.03,
            public_facilities=24.11,
            total=122.97,
            converted_ping={"total": 37.2, "main_building": 25.5}
        ),
        raw_text="",
        confidence_notes=[]
    ),
    audit={
        "processed_by": "test",
        "review_status": "pending",
        "checksum": ""
    }
)

# 匯出為 JSON
json_str = payload.model_dump_json(indent=2)
print(json_str)
```

---

## 常見任務

### 新增測試

1. 在 `tests/unit/` 建立測試檔案
2. 撰寫測試案例（Red）
3. 實作功能（Green）
4. 重構優化（Refactor）

```python
# tests/unit/test_new_feature.py
import pytest
from src.module.new_feature import NewFeature

class TestNewFeature:
    def test_basic_functionality(self):
        """Test basic functionality"""
        feature = NewFeature()
        result = feature.process("input")
        assert result == "expected"
```

### 執行特定測試

```bash
# 執行單一測試檔案
pytest tests/unit/test_jason_schema.py -v

# 執行單一測試類別
pytest tests/unit/test_field_parser.py::TestLandNumberParser -v

# 執行單一測試方法
pytest tests/unit/test_field_parser.py::TestLandNumberParser::test_parse_simple_land_number -v
```

### 查看覆蓋率報告

```bash
# 產生 HTML 覆蓋率報告
pytest tests/unit/ --cov=src --cov-report=html

# 開啟報告（macOS）
open htmlcov/index.html

# 開啟報告（Linux）
xdg-open htmlcov/index.html
```

---

## 專案結構說明

```
ocr_service/
├── src/
│   ├── models/
│   │   └── jason_schema.py      # Pydantic 資料模型
│   ├── parser/
│   │   └── field_parser.py      # 欄位解析器
│   ├── preprocessor/            # PDF 前處理（待實作）
│   └── api/                     # FastAPI 端點（待實作）
├── tests/
│   ├── unit/
│   │   ├── test_jason_schema.py
│   │   └── test_field_parser.py
│   ├── integration/             # 整合測試（待實作）
│   └── conftest.py              # pytest fixtures
├── requirements.txt
├── pytest.ini
└── README.md
```

---

## 疑難排解

### 測試失敗

```bash
# 顯示詳細錯誤訊息
pytest tests/unit/ -v --tb=long

# 只執行失敗的測試
pytest tests/unit/ --lf
```

### 匯入錯誤

確保設定 PYTHONPATH：

```bash
export PYTHONPATH=/path/to/ocr_service:$PYTHONPATH
pytest tests/unit/ -v
```

或使用相對匯入：

```python
from src.models.jason_schema import TranscriptPayload
```

### 依賴衝突

```bash
# 重建虛擬環境
deactivate
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 下一步

1. 閱讀 [TDD_PROGRESS.md](TDD_PROGRESS.md) 了解開發進度
2. 查看 [README.md](README.md) 了解專案架構
3. 參考 [OCR規劃報告](../../docs/OCR規劃報告.md) 了解需求

---

## 相關資源

- [Pydantic 文檔](https://docs.pydantic.dev/)
- [pytest 文檔](https://docs.pytest.org/)
- [OCR 規劃報告](../../docs/OCR規劃報告.md)
- [專案架構說明](../../docs/專案架構說明/)

---

**需要協助？** 查看 [TDD_PROGRESS.md](TDD_PROGRESS.md) 了解已完成的功能和測試範例。
