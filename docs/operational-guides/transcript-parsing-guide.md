# 謄本解析機制說明

> 適用對象：工程師 · 產品人員 · 一般操作者
> 最後更新：2026-03-14

---

## 一、兩種解析機制概覽

| | 地端解析（Local） | 雲端解析（Cloud） |
|---|---|---|
| **核心技術** | Python regex + PyMuPDF 文字層萃取 | 多模型 LLM 共識投票（Anthropic / OpenAI / Gemini） |
| **速度** | ⚡ 1–3 秒 | 🐢 10–60 秒（依模型數量） |
| **費用** | 免費（無 API 呼叫） | 消耗 LLM token |
| **適用文件** | 內建文字層的官方電子謄本 | 任何格式，含掃描影像 |
| **可解析性** | 固定格式才準 | 可理解多種格式 |
| **準確度** | 高（規則明確的欄位）/ 低（格式外欄位） | 高（但有幻覺風險） |
| **離線可用** | ✅ 完全不需網路 | ❌ 需要 LLM API 金鑰 |

---

## 二、什麼時候用哪種？

```
上傳 PDF
    │
    ├─ 是官方電子謄本（建物 / 土地登記第二類謄本）？
    │       │
    │       └─ 先試「地端解析」
    │               │
    │               ├─ 成功 → 直接使用，可選擇再用雲端做交叉驗證
    │               │
    │               └─ 422 無文字層 → 系統自動切換「雲端解析」
    │
    └─ 其他文件（權狀影本、結案明細、掃描件...）
            │
            └─ 直接使用「雲端解析」
```

### 建議策略

| 情境 | 建議 |
|------|------|
| 快速填表、無需精確交叉驗證 | 地端解析即可 |
| 重要物件、需要高可信度 | 地端解析 → 自動注入共識管道 → 雲端多模型投票 |
| 掃描影像謄本（無文字層） | 雲端解析（系統會自動偵測並切換） |
| 結案明細、舊式手寫權狀 | 雲端解析（地端 regex 不支援） |
| 離線 / 無 API 金鑰環境 | 地端解析（限電子謄本） |

---

## 三、地端解析詳解（工程師版）

### 3.1 執行路徑

```
Next.js API Route
  apps/superadmin/app/api/transcript-parse/local/route.ts
    │
    ├─ Strategy 1（優先）: CLI --file 模式
    │     1. 從 Supabase Storage 下載 PDF（Next.js 負責，Python 不需要憑證）
    │     2. 寫入 os.tmpdir() 暫存檔
    │     3. 執行：venv/bin/python3 parse_local_cli.py --file <tmpPath>
    │     4. 讀取 stdout JSON → 回傳給前端
    │
    └─ Strategy 2（備援）: HTTP /api/v1/parse-content
          POST file bytes → FastAPI minimal_app.py:8819
          （需要 OCR service 已啟動）
```

### 3.2 Python 解析流程

```
parse_local_cli.py
  └─ extract_transcript(pdf_path)
        │
        ├─ PyMuPDF _extract_text_pymupdf()    # 萃取文字層
        ├─ _has_text_layer()                  # 文字量 >= 200 字元？
        ├─ cjk_normalize.normalize()          # 標準化相容字元（㈯→土、㆞→地…）
        │                                     # 同時刪除 C0/C1 控制字元
        ├─ _detect_type()                     # 建物 or 土地？
        │
        ├─ parse_building_transcript()        # 建物謄本解析器
        │     ├─ _parse_meta()
        │     ├─ _parse_building_description()
        │     ├─ _parse_ownership_records()
        │     └─ _parse_other_rights()
        │
        └─ parse_land_transcript()            # 土地謄本解析器
              ├─ _parse_meta()
              ├─ _parse_land_description()
              ├─ _parse_ownership_records()
              └─ _parse_other_rights()
  │
  └─ to_unified_output(parsed)               # 轉換為 TranscriptParseOutput 統一格式
        輸出 JSON：{ kind, buildingTranscript, landTranscript, field_confidences }
```

### 3.3 可解析的文件格式

| 文件類型 | 支援 | 備註 |
|----------|------|------|
| 建物登記第二類謄本（建號全部） | ✅ | |
| 建物登記第二類謄本（建物標示及所有權部） | ✅ | |
| 土地登記第二類謄本（所有權部） | ✅ | |
| 土地登記第二類謄本（地號全部） | ✅ | |
| 他項權利部（抵押、地上權等） | ✅ | encumbrances 欄位 |
| 掃描影像謄本（無文字層） | ❌ | 自動返回 422，切換雲端 |
| 結案明細 / 買賣合約 | ❌ | 非謄本格式 |
| 舊式手寫權狀影本 | ❌ | 需雲端 |

### 3.4 輸出格式（TranscriptParseOutput）

```typescript
{
  kind: "building" | "land",
  buildingTranscript: {
    header: {
      transcriptType: string,   // e.g. "建物登記第二類謄本(建號全部)"
      documentTitle: string,    // 建號
      printTime: string,
      documentNumber: string,   // 電謄字號
      dataJurisdiction: string, // 資料管轄機關
      issuingAuthority: string, // 謄本核發機關
      ...
    },
    description: {
      buildingNumber: string,
      doorAddress: string,
      landParcelNumber: string,
      mainUse: string,
      mainMaterial: string,
      totalFloors: string,
      totalArea: string,
      ...
    },
    ownership: [{ ownerName, ownerAddress, ownershipRatio, ... }],
    encumbrances: [{ encumbranceType, creditorName, totalDebt, ... }]
  },
  landTranscript: { ... },     // 結構同上，欄位為土地版
  field_confidences: {         // 每欄位信心分數
    "buildingTranscript.header.transcriptType": 1.0,
    "buildingTranscript.description.doorAddress": 0.0,  // 0.0 = 未解析到
    ...
  },
  local_parse: true            // 標記為地端解析
}
```

### 3.5 CJK 相容字元正規化

電子謄本常用括號包圍的漢字（圍點字）代替正常文字，
`cjk_normalize.py` 的 `_CJK_COMPAT_MAP` 負責對應：

```
㈯ → 土   ㆞ → 地   ㈲ → 有   ㆟ → 人
㈪ → 月   ㈰ → 日   ㈾ → 資   ㊞ → 印
㊠ → 項   ㆓ → 二   ㆔ → 三   ㉂ → 自
```

同時清除 C0/C1 控制字元（`\x00–\x1f`、`\x80–\x9f`）以防 JSON 序列化錯誤。

### 3.6 環境需求

```
backend/ocr_service/
├── venv/                  # 必須存在（含 pymupdf、python-dotenv）
├── parse_local_cli.py     # CLI 入口點
└── src/parser/            # 解析核心
    ├── cjk_normalize.py
    ├── building_transcript_parser.py
    ├── land_transcript_parser.py
    ├── transcript_pdf_reader.py
    └── schema_converter.py
```

Python 執行檔選擇優先順序（`local/route.ts`）：
1. `OCR_LOCAL_PYTHON_BIN` 環境變數
2. `<ocrDir>/venv/bin/python3`（自動偵測 venv）
3. 系統 `python3`

OCR 服務目錄自動偵測（不需設定環境變數）：
```
process.cwd()/backend/ocr_service       # 從 monorepo root 執行時
process.cwd()/../../backend/ocr_service  # 從 apps/superadmin 執行時
process.cwd()/../backend/ocr_service
```

---

## 四、雲端解析詳解（工程師版）

### 4.1 執行路徑

```
TranscriptParseSection.tsx
  └─ POST /api/transcript-parse/stream
        │
        ├─ Phase 1: 多模型並行解析
        │     每個選定的 LLM 模型各自讀取謄本內容
        │     可注入 injectedLocalResult（地端解析結果參與投票）
        │
        ├─ Phase 2: 共識投票（majority vote）
        │     transcript-consensus.ts
        │     相同欄位多數一致 → 採用
        │     衝突欄位 → 進入 Phase 3
        │
        └─ Phase 3: AI 仲裁（可選）
              將衝突欄位交由 judge 模型裁決
              輸出最終 ConsensusResult
```

### 4.2 串流事件（SSE）

前端透過 EventSource 接收進度：

```
PARSE_STARTED     → 開始解析，顯示進度條
MODEL_RESULT      → 單一模型完成，顯示該模型結果
CONSENSUS_RESULT  → 所有模型投票完成，顯示共識結果
CONFLICT_DETAIL   → 有衝突欄位，顯示差異
ERROR             → 解析失敗
```

### 4.3 地端結果注入共識管道（P1.1）

若已有地端解析結果，它會作為一個虛擬模型參與共識投票：

```typescript
// stream/route.ts 接收到 injectedLocalResult
{
  provider: 'local',
  model: 'local-regex-parser',
  result: <TranscriptParseOutput from 地端>,
  field_confidences: { ... }
}
```

這讓地端結果與 LLM 結果互相交叉驗證，
在 LLM 猜錯時地端 regex 可拉回正確值。

---

## 五、一般使用者操作說明

### 上傳謄本後的操作流程

#### 方式 A：僅用地端解析（快速）

1. 上傳謄本 PDF 至物件管理頁面
2. 在「謄本解析」區塊點擊 **「地端解析」** 按鈕
3. 1–3 秒後顯示解析結果
4. 確認無誤後點擊 **「謄寫」** 將結果填入表單

#### 方式 B：地端 + 雲端交叉驗證（高信度）

1. 先執行地端解析（同上）
2. 再點擊 **「開始雲端解析」**
   - 地端結果自動注入雲端共識流程
   - 多個 AI 模型同時解析並互相投票
3. 雲端解析完成後，查看共識結果
   - 綠色欄位 = 各模型一致
   - 黃色欄位 = 有分歧，可展開查看各模型的版本
4. 點擊 **「填入表單」** 套用結果

#### 方式 C：僅用雲端解析

1. 跳過地端解析，直接點擊 **「開始雲端解析」**
2. 適合掃描影像或非標準格式文件

---

## 六、常見問題

### Q：地端解析結果全部空白？

**可能原因：**
- 上傳的不是官方謄本（例如：結案明細、買賣合約、收據）
- PDF 是掃描影像（無文字層）

**解決方法：** 使用雲端解析。

---

### Q：地端解析顯示「找不到 Python 執行檔」？

**解決方法：**
```bash
# 確認 venv 存在
ls backend/ocr_service/venv/bin/python3

# 若不存在，重新建立 venv
cd backend/ocr_service
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

---

### Q：地端解析顯示「PDF 無可提取的文字層」？

這是掃描影像 PDF，系統通常會自動切換雲端解析。
若未自動切換，請手動點擊「開始雲端解析」。

---

### Q：地端解析和雲端解析結果不一致，哪個對？

- **數字欄位**（面積、地號）→ 優先相信地端（regex 精確）
- **姓名 / 地址**（字跡難辨）→ 優先相信雲端（AI 有語境理解）
- **共識結果**（多模型投票）→ 通常最準，有衝突欄位建議人工確認

---

### Q：雲端解析很慢？

模型數量影響速度。在設定頁面減少啟用的模型數量（保留 2–3 個即可），
速度可提升至 15–30 秒。

---

## 七、相關檔案索引

| 用途 | 路徑 |
|------|------|
| Next.js 地端路由 | `apps/superadmin/app/api/transcript-parse/local/route.ts` |
| Next.js 雲端串流路由 | `apps/superadmin/app/api/transcript-parse/stream/route.ts` |
| 前端解析 UI | `apps/superadmin/components/admin/properties/TranscriptParseSection.tsx` |
| Python CLI 入口 | `backend/ocr_service/parse_local_cli.py` |
| FastAPI 服務 | `backend/ocr_service/minimal_app.py` |
| CJK 正規化 | `backend/ocr_service/src/parser/cjk_normalize.py` |
| 建物謄本解析器 | `backend/ocr_service/src/parser/building_transcript_parser.py` |
| 土地謄本解析器 | `backend/ocr_service/src/parser/land_transcript_parser.py` |
| 統一格式轉換器 | `backend/ocr_service/src/parser/schema_converter.py` |
| TypeScript 型別定義 | `apps/superadmin/lib/types/transcript.ts` |
| 共識計算邏輯 | `apps/superadmin/lib/utils/transcript-consensus.ts` |
