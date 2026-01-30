# OCR Service for Building Title Transcripts

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 技術文件

---


> 建物謄本自動化 OCR 與結構化資料輸出服務

## 專案目標

為建物所有權狀謄本建立自動化 OCR Pipeline，輸出標準化 Jason JSON 格式供 Supabase 儲存。

### 成功指標

- 每頁文字辨識字錯率（CER）≤ 5%
- 關鍵欄位抽取準確率 ≥ 95%
- 單份文件處理時間 ≤ 60 秒（GPU）或 ≤ 180 秒（CPU）

### 當前進度

✅ **Phase 1 完成**: Jason JSON Schema + 欄位解析規則引擎
✅ **Phase 2 完成**: PDF 前處理模組（PyMuPDF + OpenCV）
⏳ **Phase 3 進行中**: OCR 引擎整合
⏳ **Phase 4 待開發**: REST API + Docker 容器化

## 技術架構

| 層級       | 技術             | 用途                      | 狀態      |
| :--------- | :--------------- | :------------------------ | :-------- |
| OCR Engine | DeepSeek-OCR     | 主力 OCR 模型（繁體中文） | ⏳ 待整合 |
| 前處理     | PyMuPDF + OpenCV | 影像渲染、去噪、傾斜校正  | ✅ 完成   |
| 欄位解析   | Regex + Rules    | 地號、建號、面積、日期等  | ✅ 完成   |
| 資料模型   | Pydantic         | Jason JSON Schema         | ✅ 完成   |
| API        | FastAPI          | REST API 服務             | ⏳ 待開發 |
| 測試框架   | pytest           | TDD 開發                  | ✅ 完成   |

## 專案結構

```
ocr_service/
├── src/
│   ├── preprocessor/    # PDF 前處理
│   ├── parser/          # 欄位解析規則引擎
│   ├── models/          # Jason JSON Schema
│   └── api/             # FastAPI 端點
├── tests/
│   ├── unit/           # 單元測試
│   ├── integration/    # 整合測試
│   └── fixtures/       # 測試資料
├── config/             # 配置檔
└── data/               # 本地資料暫存
```

## 開發方式

本專案採用 TDD（Test-Driven Development）開發：

1. **Red**: 先撰寫測試（測試失敗）
2. **Green**: 實作功能使測試通過
3. **Refactor**: 重構優化程式碼

## 快速開始

```bash
# 建立虛擬環境
cd backend/ocr_service
python3 -m venv venv
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt

# 執行測試
pytest tests/unit/ -v

# 查看開發進度
cat TDD_PROGRESS.md

# 啟動開發伺服器（待實作）
# uvicorn src.api.main:app --reload
```

📖 **快速入門**: 查看 [QUICKSTART.md](QUICKSTART.md) 5 分鐘上手指南

📊 **開發進度**: 查看 [TDD_PROGRESS.md](TDD_PROGRESS.md) 了解當前進度

## 測試策略

### 單元測試

- Jason JSON Schema 驗證
- 欄位解析規則（地號、建號、面積）
- 單位換算邏輯

### 整合測試

- PDF 前處理 → OCR → 欄位抽取 Pipeline
- Supabase Storage 讀寫

### 端到端測試

- Docker Compose 環境
- REST API 完整流程

## 相關文件

- [OCR 規劃報告](../../docs/OCR開發進度+使用+測試報告/OCR規劃報告.md)
- [資料庫架構設計書](../../docs/專案架構說明/資料庫架構設計書.md)

## 版本修訂記錄

- **2026-01-17**：修正 OCR 規劃報告路徑，確保與主專案文件結構一致，方便房東物件管理系統後端開發與維護。
