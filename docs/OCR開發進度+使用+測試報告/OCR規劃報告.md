# OCR 規劃報告

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 技術文件

---


> **版本**：v0.1（2026-01-16）  
> **撰寫人**：資料工程規劃  
> **目的**：為建物謄本範例建立自動化 OCR 與結構化資料輸出方案（Jason JSON 檔）

---

## 1. 專案背景與成果目標

- 解析來源：resources/samples/建物謄本PDF範例 內含 17 份臺灣建物所有權狀謄本掃描 PDF，命名遵循「登記機關代碼 + 流水號」格式。
- 文檔特性：黑白掃描為主，橫式繁體中文表格，包含地號、建號、面積、權利人、登記原因等欄位；部分欄位為手寫或蓋章影像。
- 目標輸出：每份 PDF 對應一份 Jason JSON 檔，核心欄位需映射至 Supabase properties.transcript_data 與 property_documents.ocr_result。
- 成功指標：
  1. 每頁文字辨識字錯率（CER）≤ 5%；
  2. 關鍵欄位（地號、建號、權利人、權利範圍、建物面積）抽取準確率 ≥ 95%；
  3. 單份文件處理總時間（含後處理）≤ 60 秒（GPU 模式）或 ≤ 180 秒（CPU 模式）。

---

## 2. 工具與框架評估

| 項目     | DeepSeek-OCR                                | Chandra                             | Camelot / tabula-py                    | pdfplumber                      | PyMuPDF / pymupdf4llm                | MinerU                      | Unstructured               |
| -------- | ------------------------------------------- | ----------------------------------- | -------------------------------------- | ------------------------------- | ------------------------------------ | --------------------------- | -------------------------- |
| 核心用途 | 多模態 OCR（支援長文與表格）                | OCR + 版面還原（含手寫）            | 表格結構抽取                           | 文字與版面元素解析              | PDF 渲染、切分與圖像輸出             | 端到端文件轉 Markdown/JSON  | 文件前處理與切片           |
| 介面     | Python API、CLI、Colab 範例                 | Python API                          | Python                                 | Python                          | Python                               | CLI、Python                 | Python                     |
| 優勢     | 高精度中文辨識、支援視覺 Token 壓縮、可微調 | 表格/表單結構化能力佳、內建佈局模型 | 表格抽取設定彈性、支援串接 Pandas      | 字元級控制、可取 bounding boxes | 速度快、易於頁面切圖                 | 多模態整頁解析、含數學/表格 | 多格式輸入、具抽取管線模板 |
| 限制     | 需 GPU 以達最佳效能、模型較大               | 文檔需 GPU 訓練或推論資源           | 依賴線性表格，遇到複雜合併儲存格需調整 | 需額外 OCR 模組處理圖片         | 僅提供 PDF 基礎操作，需搭配 OCR 引擎 | AGPL 授權，需注意商用相容性 | 抽取結果較粗，需自訂解析   |
| 建議角色 | 主力 OCR 模型                               | 手寫或複雜表單備援                  | 表格 post-processing                   | bounding box 對齊校驗           | 圖像切割、座標轉換                   | 一鍵轉 Markdown Demo        | 文檔前處理、切片           |

**結論**：以 DeepSeek-OCR 作為主力 OCR，透過 PyMuPDF 取得高品質裁切影像，搭配 pdfplumber / Camelot 協助表格切片。對於特殊欄位（印章、手寫）可評估 Chandra 作為補強模型。

---

## 3. 系統流程建議

1. **檔案登錄**：
   - 以 Supabase Storage 接收 PDF，於 property_documents 建立掛件。
   - 以 UUID 命名 Jason JSON，存入 storage/transcripts/`<property_id>/<document_id>.json`。
2. **前處理**：
   - 透過 PyMuPDF 將 PDF 每頁渲染為 300~400 DPI 圖像。
   - 應用 OpenCV 進行去噪、傾斜校正（deskew）、自適應二值化（adaptive thresholding）。
   - 根據固定欄位框架（欄位位置較固定）生成 ROI 範圍供後續欄位標注。
3. **OCR 辨識**：
   - 使用 DeepSeek-OCR 開放權重模型（INT4 量化）於本地推論：
     - `text_recognize` 模式處理整頁文字。
     - 自訂 prompt / tag 以要求輸出包含位置信息（bbox）。
   - 若遇特殊手寫或蓋章資訊，啟用 Chandra 針對 ROI 進行補辨。
4. **版面解析與欄位抽取**：
   - 透過 pdfplumber 取得行列輪廓，用於定位面積欄位、權利範圍表格。
   - Camelot（stream 模式）萃取表格後比對 DeepSeek-OCR 結果，整合欄位。
   - 實作關鍵欄位規則引擎：
     - 地號/建號：使用正則 `\d{4}-\d{4}`，結合上下文關鍵詞。
     - 面積：解析「平方公尺 / 坪」，提供雙單位。
     - 權利人：拆解姓名、身分證字號、權利範圍。
5. **Jason JSON 結構化**：
   - 建立 `transcript_payload` 模組，產生標準 Schema。
   - 記錄 OCR 版本、模型配置、置信度、欄位審核狀態。
6. **審核與回寫**：
   - Jason JSON 寫入 property_documents.ocr_result，並同步更新 properties.transcript_data。
   - 將審核狀態（pending/confirmed/rejected）紀錄於 property_documents 表。
7. **監控與重試**：
   - 建立背景工作佇列（如 Supabase Edge Function + pgBoss）管理 OCR 任務。
   - 紀錄錯誤 log、影像前處理統計，以利後續模型優化。

---

## 4. Jason JSON 輸出草案

```json
{
  "metadata": {
    "document_id": "<UUID>",
    "property_id": "<UUID>",
    "source_file": "102AF006705REG0A2576B0A7DBC47979B11B77DF4B1E4FE.pdf",
    "processed_at": "2026-01-16T08:00:00Z",
    "ocr_engine": {
      "name": "DeepSeek-OCR",
      "version": "v2025.12-int4",
      "confidence": 0.94
    }
  },
  "register_office": "臺北市松山地政事務所",
  "document_type": "建物所有權狀謄本",
  "sections": {
    "basic": {
      "build_register_number": "松山建字第000000號",
      "land_register_numbers": ["松山段一小段0000地號"],
      "survey_date": "2023-11-15",
      "registration_date": "2023-12-01",
      "registration_reason": "繼承"
    },
    "ownerships": [
      {
        "holder": {
          "name": "王大明",
          "id_number_masked": "A123***789",
          "address": "臺北市松山區XXX",
          "contact": null
        },
        "share_ratio": "1/1",
        "acquisition_reason": "繼承",
        "acquisition_date": "2023-12-01"
      }
    ],
    "building_profile": {
      "location": "臺北市松山區八德路四段200號",
      "structure": "鋼筋混凝土造",
      "main_use": "住家用",
      "floors": {
        "above_ground": 12,
        "underground": 0
      },
      "completion_date": "2015-07-30"
    },
    "area_summary": {
      "units": "square_meter",
      "main_building": 84.32,
      "accessory_building": 6.51,
      "balcony": 8.03,
      "public_facilities": 24.11,
      "total": 122.97,
      "converted_ping": {
        "total": 37.2,
        "main_building": 25.5
      }
    },
    "encumbrances": [
      {
        "type": "抵押權",
        "creditor": "臺灣銀行",
        "amount_twd": 5000000,
        "registration_date": "2023-12-15"
      }
    ],
    "raw_text": "...",
    "confidence_notes": [
      { "field": "ownerships[0].address", "confidence": 0.72, "status": "needs_review" }
    ]
  },
  "audit": {
    "processed_by": "ocr_pipeline_v1",
    "review_status": "pending",
    "checksum": "sha256:..."
  }
}
```

---

## 5. 模型與部署建議

- **開發環境**：
  - 本地 Mac（Apple Silicon）採用 Conda 環境，結合 GPU 雲端（AWS g5.xlarge 或 Colab Pro）進行模型微調。
  - 主要套件：deepseek-ocr、pymupdf、pdfplumber、camelot-py、opencv-python、numpy、pandas。
- **微調策略**：
  1. 建立 200 份以上標注資料（Bounding Box、文本、欄位標籤）。
  2. 使用 Unsloth + LoRA 針對繁體中文表格進行 10 分鐘快速微調。
  3. 測試 CER 改善幅度與欄位抽取準確率。
- **推論佈署**：
  - 以 FastAPI 建立 OCR API，支援批次與即時任務。
  - 整合 Supabase Edge Functions 觸發隊列。
  - 使用 Redis 作為任務快取與重試鎖。

---

## 6. 實施時程規畫（六週）

| 週次 | 工作項目                                     | 產出                           |
| ---- | -------------------------------------------- | ------------------------------ |
| W1   | 樣本標註、欄位定義確認、Jason Schema 定稿    | 欄位字典、標註模板             |
| W2   | 前處理與 DeepSeek-OCR 基礎整合、PoC          | 單頁辨識腳本、效能報告         |
| W3   | 表格解析（Camelot/pdfplumber）與欄位抽取規則 | 欄位解析模組                   |
| W4   | Jason JSON 生成器、Supabase 寫入流程         | Jason Export 函式、DB 更新腳本 |
| W5   | 模型微調、補強手寫/蓋章辨識                  | 微調模型權重、比較報告         |
| W6   | 自動化佇列、錯誤處理、文件與交付             | Pipeline 程式碼、操作手冊      |

---

## 7. 風險與對策

| 風險         | 說明                              | 對策                                           |
| ------------ | --------------------------------- | ---------------------------------------------- |
| 影像品質不一 | 舊卷宗可能模糊/扭曲               | 加強前處理（去噪、deskew），必要時人工標註增補 |
| 欄位格式變異 | 不同縣市版型差異                  | 建立範本分類器，依模板套用對應欄位規則         |
| 模型授權限制 | DeepSeek-OCR 開源條款需確認商用權 | 與法務確認 MIT 授權，保留第三方模型替代方案    |
| 執行效能     | 本地 CPU 模式速度受限             | 支援批次提交至雲端 GPU，並行處理加速           |
| 數據隱私     | 謄本含個資，需符合法規            | 資料加密存放、API 權限控管、審計日誌           |

---

## 8. 後續工作

1. 收集與分類更多樣本，建立版型索引。
2. 製作裁切且去識別化的謄本測試資源庫，以支援 TDD 與 CI 快速驗證。
3. 建立欄位驗證規則（checksum、權利範圍加總）以自動檢查 Jason JSON。
4. 與資料庫團隊對齊欄位映射，更新 Supabase schema 以支援完整 transcript_data。

---

## 9. TDD 導向的容器化開發策略

### 9.1 採用 TDD 的考量

- **優點**：在 OCR 邏輯高度客製的情況下，TDD 可確保欄位抽取規則與 Jason JSON 結構持續符合需求，並為後續 Docker 化與版本更新提供回歸測試保護。透過先寫測試再實作，可快速度量新模型或前處理調整對關鍵欄位的影響。
- **挑戰**：OCR 涉及大型 PDF 與影像處理，測試資料需妥善管理（去識別化、檔案大小），同時需兼顧效能測試；因此建議採「核心模組 TDD + 整體流程 BDD」的折衷策略。

### 9.2 測試分層建議

1. **單元測試（TDD 強制）**：

- `transcript_payload` JSON 生成器：驗證欄位映射、預設值、錯誤處理。
- 規則引擎（正則解析、單位換算）：先撰寫測試案例覆蓋常見與異常輸入，再實作邏輯。

2. **整合測試（半自動）**：

- 使用縮減版 PDF 樣本（裁切後仍具代表性）檢查前處理、DeepSeek-OCR 輸出與欄位抽取是否串接成功。
- 透過 PyTest + tmp 路徑模擬 Supabase Storage，驗證 JSON 寫入流程。

3. **端到端測試（容器化後）**：

- 以 Docker Compose 啟動 OCR API，使用 `pytest-httpx` 或 `locust` 驗證 REST 端點返回 Jason JSON，並記錄效能指標（處理時間、資源占用）。

### 9.3 實作流程

1. 在 Mac mini 建立虛擬環境，撰寫測試案例（PyTest）並先行執行失敗案例（Red）。
2. 實作對應模組直至測試通過（Green），再針對程式碼重構（Refactor）。
3. 完成核心模組後，再撰寫 API 層測試，最後將程式碼與測試腳本封裝進 Docker 映像。
4. 建議於 CI（如 GitHub Actions）配置最小測試集合，確保容器化後的變更不破壞既有功能。

> 若後續導入雲端 OCR API，可在相同測試流程內新增 mock 層，保留測試重覆性並比較本地模型與雲端結果差異。

### 9.4 測試資源管理

- **裁切樣本庫**：將原始謄本裁成重點欄位（所有權人、面積表等），並以去識別化資料替換敏感資訊。檔案體積小、執行快，適合單元與整合測試；並可存放於版本控制內便於 CI 使用。
- **完整掃描庫**：保留原始 PDF 或新增樣本以涵蓋更多縣市版型，用於端到端測試與效能評估。可搭配存取控管確保個資安全。
- **維護策略**：每次新增/更新模型或欄位解析時，同步擴充兩種資源，以便比較不同模型或前處理設定對結果的影響。
