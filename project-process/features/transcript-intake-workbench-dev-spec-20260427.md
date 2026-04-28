# 統一謄本解析工作台 Dev Spec

日期：2026-04-27
Feature ID：084
位置：`/superadmin/properties/:id/edit?tab=transcript`

## 目標

將謄本操作從分散式手動選項改為單一工作台。User 只需上傳謄本檔案，系統負責判斷檔案格式、解析技術、案件型態、車位產權型態，最後由 user 確認後再寫入建物土地明細資料來源。

## 範圍

- 支援上傳 PDF、圖片、JSON、文字等謄本來源。
- PDF 先檢查是否有可用繁中謄本文字層。
- 有可用文字層時走 local Python text parse。
- 無文字層、掃描件、圖片檔時走 VLM visual parse。
- AI 流程拆為 detect、parse、review 三段。
- 車位產權型態可複選：獨立產權、公設產權，或兩者皆有。
- User 確認後才儲存 canonical transcript result。

## 非目標

- 本階段不直接重做全部 UI。
- 本階段不改既有單文件 parse 行為。
- 本階段不直接產出建物土地明細表 UI。

## 第一階段交付

- `transcript_intake_runs` migration。
- transcript intake type contract。
- Python/VLM technical routing helper。
- detect、parse、review prompt contract。
- prompt seed 串接。
- targeted unit tests。

## 第二階段交付

- `POST /api/transcript-intake/runs` 建立 intake run。
- `GET /api/transcript-intake/runs` 依 property 查詢最近 run。
- `GET /api/transcript-intake/runs/:id` 查詢單一 run snapshot。
- 建立 run 時驗證文件存在、啟用中，且屬於指定物件。
- 建立 run 時依文件類型產生 route decision，保存於 `route_decision`。

## 第三階段交付

- `processTranscriptIntakeRunById` worker。
- `POST /api/transcript-intake/runs/:id/process` 背景啟動單一 run。
- `GET /api/cron/transcript-intake-runs` drain 最舊的 `route_selected` run。
- worker 目前會 claim run、寫入 detection seed、重用既有 transcript parse core、彙整 parsed documents、寫入 review seed，最後進入 `needs_user_confirmation`。

## 第三階段限制

- Python route 建立時已接 PDF text probe 作技術路由；parse 階段仍重用既有 cloud transcript parse core。

## 第四階段交付

- 新增 `intake-ai.ts`，負責 detect/review AI 呼叫。
- detect 使用 `transcript_detection` agent 與 `transcript.intake.detect` prompt。
- review 使用 `transcript_audit` agent 與 `transcript.intake.review` prompt。
- detect/review 寫入 prompt audit log。
- AI stage 失敗時 worker fallback 到 processor seed，避免 run 卡住。

## 第四階段限制

- detect/detail_builder 採 agent chain 依序 fallback；review 採多模型 reviewer ensemble。
- 視覺輸入目前以第一份文件為主，其他文件透過 context JSON 傳入；多文件逐份判讀留待後續強化。
- Python route 已於建立 run 時讀取 PDF 文字層判斷是否適合 local text path；實際 parse engine 仍沿用既有 parse core。

## 第五階段交付

- 新增 `TranscriptIntakeWorkbench` UI 面板。
- 工作台會聚合已上傳的建物、土地、車位謄本文件。
- User 可建立 intake run、啟動 process、重新整理/輪詢 run 狀態。
- UI 顯示技術路由、案件初判型態、車位產權、review confidence。
- 既有上傳欄位、單文件解析與結構化表單暫時保留。

## 第六階段交付

- `POST /api/transcript-intake/runs/:id` 將等待確認的 run 轉為 `confirmed`。
- 確認時寫入 `confirmed_result` snapshot，包含 confirmedAt、confirmedByUserId、detection、parsed、review。
- 工作台在 `needs_user_confirmation` 狀態顯示「確認並儲存」按鈕。
- 確認成功後 UI 顯示已確認狀態與成功訊息。

## 第六階段限制

- confirmed result 尚未提供欄位級人工修正；目前是確認當下 AI/parse snapshot。

## 第七階段交付

- confirmed result 會同步回 property `details`。
- 同步欄位包含 `buildingTranscript`、`landTranscript`、`parkingBuildingTranscript`、`parkingLandTranscript`、`parkingTitleRights`。
- 同步 property core flags：`has_independent_parking`、`is_pure_land`、`land_number`。
- 建物土地面積明細表沿用既有 `BuildingLandAreaDetailTab` 計算邏輯，自動讀取確認後的 transcript details。

## 第八階段交付

- 建立 run 時會下載 PDF 並抽取文字層作技術路由，不再只依副檔名或空字串判斷。
- 可讀取台灣繁體謄本文字且含謄本標記的 PDF 走 `local_python_text`。
- 掃描型權狀影本、無文字層 PDF、非謄本文件會走 `vlm_visual`。
- 新增真實 PDF 樣本回歸測試，覆蓋可文字解析謄本、影像型權狀影本、非謄本文字 PDF 三種路由。

## 流程

1. User 上傳一份或多份謄本文件。
2. 系統建立 intake run。
3. File probe 判斷格式與技術路由。
4. Detect AI 初判案件型態、文件型態、車位產權型態、建號與地號數。
5. Parse AI 依初判輸出結構化建物、土地、車位資料。
6. Review AI 交叉檢查台灣謄本實務矛盾與缺漏。
7. User 在工作台確認或修正。
8. 系統儲存確認結果，供下一頁建物土地明細表計算。

## 風險

- PDF 文字層可能是亂碼，路由必須保留 fallback 到 VLM。
- VLM 可能漏讀持分或共有部分，review 階段必須要求 evidence。
- 公設車位常藏在共有部分或備註，不能只靠文件標題判斷。
- 同一案件可同時存在獨立產權車位與公設產權車位。

## 2026-04-28 增量交付

### 工作台 UX 收斂

- 已上傳謄本區改為可複選，勾選狀態決定本次預覽與解析範圍。
- 右側文件預覽依勾選同步增加或移除，不再只顯示單一文件。
- 移除多餘的開啟、聚焦與目前預覽提示，降低介面噪音。
- 最終確認按鈕文字改為「儲存解析結果」，明確表示 user 儲存的是本次 AI 解析與人工修正結果。

### 權狀影本支援

- 新增 `building_title`、`land_title` 文件型態，權狀影本不再被視為 unsupported。
- JPG、PNG、GIF、WebP、TIFF、BMP 等影像權狀直接走 `vlm_visual`。
- PDF 權狀優先走 VLM；若 provider 僅接受 image MIME，系統會先將 PDF page 轉成 JPG 再送入 VLM。
- 混合建物+土地權狀影本可同時保留 `buildingTranscript` 與 `landTranscript`，避免只保存其中一側。

### 多模型 Parse / Review

- Parse stage 採最多 5 個候選、目標 3 份成功 parser 報告；目前主要候選包含 OpenAI、Gemini、Anthropic，另以 Gemini 1.5 Pro 作補位。
- Verify/Review stage 採最多 5 個候選、目標 3 份成功 reviewer 報告；`openai/gpt-5.5` 因 JSON 穩定性問題移出預設前三順位。
- Reviewer 預設改為 Claude Opus 4.5、Gemini 3.1 Pro、Grok 4.20；OpenAI GPT-5.3 chat latest 作 fallback。
- 成功達標後，併發 runner 會取消尚未完成的 active provider，且不再等待不理 abort 的 request。

### 報告與可觀測性

- `AI 品質追蹤` 顯示 Detect、Parse、Verify/Review、Detail Builder 的 provider/model、prompt source、狀態、耗時與摘要。
- Parser、Reviewer 完成後各自提供 Markdown 報告 URL。
- 執行中模型 badge 會顯示各自工作時間；完成後保留各自花費秒數。
- Reviewer confidence 顯示語意改為「審查信心」，避免與 parser 原始結果可信度混淆。

### Detail Builder

- 新增 `detail_builder` stage，由單一 VLM 依 parser reports、reviewer reports 與原始文件產生四大明細草稿。
- 四大明細包含建物建築面積、建物所屬土地持分、車位建築面積、車位所屬土地持分。
- 若 detail_builder 重看文件後仍有爭議，會列入人工確認，不直接覆蓋成 canonical data。
- User 按下「儲存解析結果」後，確認後的 area detail draft 會同步到 `building_land_area_detail` 使用的資料來源。

## 2026-04-28 新增限制與風險

- 欄位紅框目前仍以 evidence 與來源文件提示為主，尚未完成精準 bbox overlay。
- Provider compatibility smoke test 尚未自動化，仍需依實機錯誤與 regression test 補強。
- 舊 run 的 trace 沒有完整子階段與 per-model timing，UI 需保留 fallback 顯示。
- 權狀樣本含個資時，後續 regression 需使用遮罩樣本或 synthetic fixture。

## 2026-04-29 Sprint 3 規格增量

狀態：In Review。

### 目標

- 將混合 PDF/影像文件從「整份文件初判」升級為「逐頁分類」。
- 明確分離正式來源與參考來源：謄本/權狀可寫入明細；不動產說明書/物件調查報告只可作坪數交叉檢查。
- 支援橫躺電傳謄本頁的方向提示，降低 VLM 漏讀或誤讀。

### 新增資料契約

- `route_decision.documents[].pages[]` 保存 page-level classification。
- 每頁需包含 `pageNumber`、`pageRole`、`sourceTrust`、`orientation`、`rotationHint`、`confidence`、`evidenceText`。
- `pageRole` 至少包含 `building_transcript`、`land_transcript`、`building_title`、`land_title`、`property_description`、`investigation_report`、`map_or_photo`、`unknown`。
- `sourceTrust` 分為 `authoritative`、`reference_only`、`ignore`、`unknown`。

### 流程調整

1. 建立 intake run 時先保留文件層級 routing，再補頁面分類結果。
2. Parse stage 僅採用 `sourceTrust=authoritative` 的謄本或權狀頁作正式解析依據。
3. Detail Builder 產生明細時，每列必須保留來源頁與來源信任層級。
4. 不動產說明書與物件調查報告只進 cross-check，不可直接覆蓋 canonical transcript 或 area detail。
5. 坪數校驗比較謄本平方公尺換算坪數、參考文件坪數與目前系統明細表坪數；差異超過門檻時列入人工確認。

### 風險

- Provider 可能無法穩定輸出每頁 JSON；需保留 deterministic fallback。
- PDF 頁面轉圖與旋轉可能增加成本；先保存方向提示，不在第一版強制重排所有頁。
- 舊 run 沒有 `pages` 欄位，UI 與 reviewer 必須保留相容 fallback。

### 今日實作結果

- 已新增 deterministic page classifier 與 `route_decision.documents[].pages[]` contract。
- 建立 run 時會保存頁面角色、來源信任層級、方向提示、信心分數與 evidenceText。
- 工作台技術選擇區已顯示正式來源/參考來源/略過/待確認頁數與前 5 頁分類。
- area detail row 新增 `sourceTrust`，來源欄顯示正式來源狀態。
- Prompt 與 saved_prompts migration 已限制 reference_only/ignore 來源不可直接填正式明細。

## 2026-04-29 AI Fallback 增量

狀態：In Review。

### 目標

- 避免 Detect 或 Detail Builder 因單一 VLM 回傳畸形 JSON 直接退回 processor seed。
- 將 Detect/Detail Builder 與 Review 的模型追蹤統一顯示在 AI 品質追蹤。
- 對常見模型輸出包裝與尾逗號 JSON 做保守修復，降低非業務錯誤造成的 fallback。

### 流程調整

1. `transcript_detection` 與 `transcript_detail_builder` 會讀取 agent chain 前 4 個候選模型。
2. 第一個模型若 API 失敗或 JSON/schema 解析失敗，流程會保留錯誤並依序嘗試下一個模型。
3. 任一候選成功即使用該模型結果，不再呼叫後續模型。
4. 全部候選失敗時，run 直接進入 `failed`，並在 AI 品質追蹤中列出各模型錯誤；不得產生 seeded detect/review/detail 草稿。
5. Detect/Detail Builder 的模型 start/result 狀態會寫入 `aiStageTrace.models`。

### 風險

- 依序 fallback 會增加失敗案例耗時，但只在前一模型失敗後才追加成本。
- JSON repair 僅處理抽取與尾逗號等低風險情境，不推測補全被截斷的內容。
- 高風險謄本資料不得用 processor seed 假裝 AI 成功；如果 AI 全部失敗，必須讓 user 看到失敗原因與失敗模型。
