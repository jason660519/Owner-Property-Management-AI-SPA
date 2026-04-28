# Feature ID 084 開發日誌：統一謄本解析工作台

## 2026-04-27

### 完成項目

- 新增 transcript intake contract，定義技術路由、案件初判、review issue、confirmed result。
- 新增 deterministic file router，先判斷 PDF 是否適合 Python 文字解析，不適合時走 VLM。
- 新增 detect、parse、review 三段 prompt contract。
- 新增 `transcript_intake_runs` migration，保存 route、detect、parse、review、confirmed 狀態。
- 將新 prompt 接入 lazy seed 與 prompt-management seed。
- 新增 targeted unit tests。
- 新增 intake run API：建立 run、依物件查詢 runs、依 id 查詢 run snapshot。
- 建立 run 時檢查文件是否存在、啟用中，且屬於指定 property。
- 新增 intake worker：claim `route_selected` run、寫入 detection seed、重用既有 parse core、彙整 parsed documents、寫入 review seed。
- 新增 process API 與 cron drain endpoint。
- 新增真正 AI detect/review stage，分別使用 `transcript_detection` 與 `transcript_audit` agent。
- AI detect/review 失敗時 fallback 到 processor seed，避免 run 中斷。
- 新增 `TranscriptIntakeWorkbench` 面板，支援建立 run、啟動 process、輪詢與摘要顯示。
- 新增 confirm API 與 UI「確認並儲存」按鈕，將 run 轉為 `confirmed` 並保存 confirmed_result snapshot。
- 新增 confirmed result → property details 同步工具，確認時帶入主建物、土地、獨立車位謄本、車位產權、純土地旗標與土地地號。
- 建立 run 時接入 PDF text probe，使用實際 PDF 文字層判斷 `local_python_text` 或 `vlm_visual`，並以真實謄本 PDF 範例補上路由回歸測試。

### 設計決策

- 技術路由先用 deterministic probe，不交給 AI 決定。
- 車位產權採複選資料型態，允許同案同時有獨立產權與公設產權。
- 第一階段不改既有單文件 parse UI，先建立可被新工作台與 worker 共用的 contract。
- 第二階段 API 只建立與查詢 run，不直接執行 AI，避免 request lifetime 綁住長任務。
- 第三階段先重用既有單文件 parse core，避免大拆已運作的 consensus parser。
- 第四階段 detect/review 先做單模型版本，避免複製 parse consensus 引擎；多模型 review 共識留待 UI 串接後再補。
- 第五階段先將工作台掛在現有謄本頁籤最上方，不移除舊上傳/解析表單，降低使用者流程風險。
- 第六階段先鎖定 confirmed snapshot，不做欄位級修正 UI；欄位級修正可接在工作台 detail view。
- 第七階段不重寫建物土地面積明細表，而是同步到既有 property details，沿用現有 `BuildingLandAreaDetailTab` 計算。
- 第八階段先把 PDF 文字層 probe 接到建立 run 的 routing path；真正 parse engine 改造留在下一段，避免同時替換已運作的 parse core。

### 下一步

- 串接現有 upload flow。
- 將 `local_python_text` route 的後續 parse engine 從既有 cloud parse core 拆出。
- 視需要補多文件逐份 detect/review。
- 補欄位級人工修正 confirmed result。

## 2026-04-28

### 完成項目

- 新增 `TranscriptIntakeAreaDetailDraft` 與欄位 evidence bbox type，為後續文件紅框標示保留座標結構。
- 新增 `intake-area-details.ts`，可從 parsed result 彙整四區明細：建物建築面積、建物所屬土地持分、車位建築面積、車位所屬土地持分。
- confirm API 現可接收 user 修正後的 `areaDetailDraft`，確認時同步寫入 `details.transcriptIntakeAreaDetails`，並回填主建物、土地、車位謄本的主要面積與持分欄位。
- `TranscriptIntakeWorkbench` 改為左右雙欄工作台：左側顯示四段流程、上傳文件摘要、初判摘要與可編輯四區明細；右側顯示文件預覽與欄位來源。
- 新增 `TranscriptIntakeAreaDetailEditor` 與 `TranscriptDocumentPreview`，讓使用者在確認前可新增、刪除、修改明細列並查看來源文件。
- 新增工作台單一上傳入口 `TranscriptIntakeUploadPanel`，user 可直接上傳謄本，不必先選建物、土地或車位。
- 新增 `registry_transcript_unclassified` 文件類型；工作台上傳會先存成未分類謄本，後續 detect/parse 再判斷主內容。
- 放寬謄本上傳格式支援到 PDF、JPG、PNG、GIF、WebP、JSON、TXT、CSV。
- 未分類謄本解析後會依 parsed `kind` 同步到建物或土地 canonical details，避免固定塞到建物欄位。
- intake worker 會在 parse 完成後，依未分類謄本的 parsed `kind` 自動把 `property_documents.document_type` 轉為建物謄本或土地謄本。
- 既有分散式建物／土地／車位選項與單文件解析區已收合到「進階／舊版謄本工具」，讓主畫面優先呈現單一工作台。
- `local_python_text` route 已接入本地文字層 parser seed，PDF/TXT/JSON 可先以本地文字解析寫入 `parsed_result`，失敗才 fallback 到既有 VLM parse core。
- 實機登入檢查後，將謄本 tab 從固定高度內部捲動改為頁面自然捲動，避免工作台被壓縮成小視窗。
- 本機 Supabase 已套用並註冊 `20260427100000_create_transcript_intake_runs.sql`，PostgREST schema cache 已 reload，工作台不再顯示缺表錯誤。
- PDF text probe 改為優先走本機 `pdftotext -layout`，避免 Next.js runtime 內的 PDFJS worker path 問題；PDFJS 只作為 fallback。
- 新增 `20260428010000_allow_local_transcript_provider.sql`，允許 `property_documents.vlm_provider` 寫入 `local_python_text`，並讓 worker 對文件解析結果更新錯誤立即 fail fast。
- 本地文字層 parser 擴充建物共有部分、附屬建物、所有權登記日期／原因／字號與土地所有權欄位；實機 run 已可抽出建物面積 `152.64` 與土地持分 `100000分之8460`。
- 新增 `TranscriptTechnicalRoutePanel`，在工作台上直接顯示每份檔案實際使用的解析技術、PDF probe 指標與 routing reason，讓 user 知道系統用了 Python、VLM 或 JSON 哪一種。
- 新增 `TranscriptIntakeAiStageTrace` 與 `intake-stage-trace.ts`，worker 會把 detect、parse、verify/review 的 agent key、prompt source、provider/model、成功/fallback 狀態、summary、修正建議與警示寫進 `parsed_result.aiStageTrace`。
- 新增 `TranscriptAiStageTracePanel`，工作台可直接顯示每段 AI 品質紀錄；舊 run 沒有 trace 時會從 detection/parsed/review 既有結果推導摘要。
- 實機 run `e3485b68-eda9-4cfc-a9c3-646c8a65a5d8` 驗證：Detect 使用 `openai/gpt-4o` 但因 PDF MIME 限制 fallback 到 seed；Parse 使用 `local/local-python-text`；Review 使用 `anthropic/claude-opus-4-20250514`，並列出 `dispositionKind -> unknown`、`buildingType -> apartment` 的建議修正。
- `TranscriptIntakeUploadPanel` 新增已上傳謄本清單與兩段式刪除操作，user 上傳錯誤謄本時可在工作台直接刪除文件。
- 已上傳謄本清單與右側文件預覽改為同一個選取狀態；被納入右側預覽範圍的謄本會在左側顯示 `預覽中`，點選欄位 evidence 時也會同步切到對應來源文件。
- 已上傳謄本清單新增複選框，user 可勾選多份謄本一起建立 detect/parse/review 任務；點檔名只切換右側預覽，勾選狀態才決定本次解析文件。
- 右側文件預覽範圍改為跟隨複選框；勾幾份就同步顯示幾份預覽，取消勾選時左側 `預覽中` 與右側對應 iframe 會同步移除，全部取消時右側顯示空狀態。
- 新增 `TranscriptProcessingTimer`，建立或啟動判讀後會顯示 `系統正在解析` 與已花費秒數，讓 user 明確知道 detect/parse/review 仍在執行。
- `AI 品質追蹤` 的 Detect、Parse、Verify/Review 三段新增階段計時；執行中以 0.1 秒精度顯示 `已花費`，完成後固定保留 `花費 X.X 秒`。
- 謄本頁底部不再顯示 `進階／舊版謄本工具`，主流程收斂為單一謄本工作台。
- 權狀影本納入謄本工作台：`building_title`、`land_title` 會出現在可勾選解析清單；JPG、GIF、PNG、WebP、TIFF、BMP 等影像權狀直接走 `vlm_visual`。
- PDF 權狀即使有文字層也優先走 VLM，避免 local text parser 以謄本版型硬解析權狀。
- Detect/parse prompt 與 document kind schema 新增 `building_title`、`land_title`；同一份建物+土地權狀影本若同時有雙邊資料，確認同步與面積明細會同時保留 buildingTranscript 與 landTranscript。
- AI 品質追蹤改為固定顯示 Detect、Parse、Verify/Review 三段；即使後端只先回傳 Detect partial trace，Parse 或 Verify/Review 一開始工作也會立即顯示 `處理中` 與計時。
- Worker 進入 `parsing` 前會先解析並寫入 Parse 階段預計使用的 VLM/local parser；進入 `reviewing` 前也會先寫入 Verify/Review 的 provider/model，讓 user 等待時即可看到哪個 AI 正在解析或審查，完成後同一筆 trace 保留實際花費秒數。
- 謄本視覺解析預設改為 3 個不同公司的 parser VLM：Qwen 3.6 Plus、Kimi K2.6、Gemini 3.1 Pro；runtime 會限制每次 parse ensemble 最多取 3 個不同 provider，避免回到 GPT-4o 單點解析。
- Verify/Review 預設改為 3 個不同公司的 reviewer VLM：OpenAI GPT-5.5、Claude Opus 4.5、Grok 4.20；review stage 會並行呼叫三個 reviewer、合併 issue/車位產權/判定型態，並把每個 reviewer 的 provider/model/耗時寫回 AI 品質追蹤。
- 新增 `20260428020000_update_transcript_vlm_agent_defaults.sql`，將既有 DB 中的 `transcript_visual_parse` 與 `transcript_audit` 全域 agent assignment 更新到新三模型組合，避免舊 gpt-4o/Claude 設定繼續被 runtime 讀取。
- `AI_PROVIDERS` 靜態模型清單與 vision capability 判斷已補上 GPT-5.5、GPT-5.3、Claude Opus 4.5、Gemini 3.1 Pro、Grok 4.20、Kimi K2.6、Qwen 3.6 Plus，模型選擇 UI 與 agent defaults 可直接選用。
- `mimeFromPath` 與 image MIME 判斷補齊 GIF、TIFF、BMP，避免權狀影本上傳後因 storage MIME 不完整而被 VLM caller 視為不支援格式。
- `AI 品質追蹤` 的每個 parser/reviewer badge 現在會各自顯示工作中計時或完成耗時；完成後 parser 會顯示「解析報告」URL，reviewer 會顯示「審查報告」URL，三個 parser + 三個 reviewer 共 6 份報告可供 user 追溯。
- 新增 `/api/transcript-intake/runs/[id]/ai-reports` markdown report endpoint：parser 報告讀取 `ocr_parse_results` 原始輸出，reviewer 報告讀取 `review_result.reviewerReports`。
- 新增 `20260428030000_extend_ocr_parse_results_provider_check.sql`，讓 `ocr_parse_results` 可寫入 qwen、kimi、openrouter、ollama、local 等 provider，避免新 parser ensemble 的 raw output 因 DB check constraint 失敗而無法產生報告。
- 針對權狀影本實機 run 診斷：Qwen 先前只收到 prompt 沒收到 PDF 內容，Kimi/OpenAI/Grok 將 PDF 當 image_url 送出被 API 拒絕，Gemini 因 4096 token 上限產生破碎 JSON，Anthropic reviewer 的無結尾 markdown fence 造成 JSON parse 失敗。
- `ai-api-callers.ts` 新增 PDF → JPG page rendering（pdftoppm，前 4 頁），OpenAI/Grok/Kimi/Qwen/OpenRouter/Zhipu/Ollama 等 image_url caller 遇到 PDF 會先送 JPG 頁面，不再直接傳 `application/pdf` data URL。
- `extractJsonFromOutput` 強化：可處理開頭 ```json 但沒有結尾 fence 的模型輸出，降低 Anthropic/Gemini 因 markdown fence 造成 schema mismatch。
- LLM caller 的 transcript vision output token 上限提高到 8192，降低 Gemini 或長權狀解析 JSON 被截斷的機率。
- 新增 `20260428040000_strengthen_transcript_title_prompts.sql`，把權狀影本補充規則 append 到 `transcript.parse`、`transcript.intake.detect`、`transcript.intake.review` saved prompts，避免 DB saved prompt 覆蓋掉程式碼內較新的權狀規則。

### 設計決策

- 本次先把欄位級人工修正落到 confirmed result 與 property details，避免 UI 修正只停留在前端狀態。
- 目前紅框預覽先使用 evidence text 與固定來源提示；真正 bbox 座標需等 VLM/parse stage 輸出欄位座標後再繪製精準框。
- 多筆土地與多筆車位先完整保存於 `transcriptIntakeAreaDetails`；既有單筆 transcript 欄位保留第一筆主要資料以維持舊版面積計算相容。
- 單一上傳入口不再要求使用者先選 document type；為維持既有 parser 相容，未分類文件會使用 auto parse directive，由模型依文件內容決定 building/land kind。
- 舊工具暫時保留但預設收合，避免一次移除仍有人使用的單文件解析流程。
- 技術路由顯示從工作台主檔拆成獨立元件，避免 `TranscriptIntakeWorkbench` 超過專案單檔 500 行限制。
- 實機驗證中 review 判定建物謄本與土地謄本的所有權人／地段不一致時，維持 `needs_user_confirmation`，不自動按下「儲存謄本」，避免將有疑義的結果寫入 canonical model。
- AI 品質追蹤採 `parsed_result.aiStageTrace` 儲存，不新增 DB 欄位；這可保留每次 run 的歷史品質紀錄，也避免 schema 變動。
- 若 detect/review AI 因檔案格式或 API 失敗，仍要保留「原本打算使用的 provider/model」與 fallback reason，讓 user 能評估 VLM 品質與失敗原因。
- 上傳錯誤謄本的刪除入口沿用既有 `deletePropertyDocument` soft-delete + storage remove；UI 採「刪除」再「確認刪除」的二段式操作，降低誤刪風險。
- 文件預覽選取狀態放在 `TranscriptIntakeWorkbench` 層統一管理，避免左側清單、右側 iframe 與欄位 evidence focus 各自維護不同來源。
- 多選解析預設全選所有已上傳謄本，避免既有使用者按「建立並判讀」時漏掉文件；若 user 只想解析部分家族或部分區域標的，可取消勾選再建立 run。
- 「預覽中」代表該文件已被納入右側預覽範圍，而不是單一焦點；目前焦點只用於高亮與 evidence 來源定位。
- 解析中計時器採前端秒級 timer，啟動當下用本地時間先顯示，run 建立後改以 `run.createdAt` 作為正式起算點。
- AI 品質追蹤計時採雙層設計：前端依 `currentPhase/status` 顯示即時 running timer；worker 完成後把每段 `durationMs` 寫入 `parsed_result.aiStageTrace`，讓完成耗時不會因狀態結束而消失。
- 舊版謄本工具不再提供使用者入口；相關舊流程先保留在 component 內但不渲染，避免同一輪 UI 收斂時同時大規模刪除仍可能被歷史資料依賴的 helper。
- 權狀影本不是 unsupported 文件；技術路由層仍用 deterministic rule 判斷檔案格式，但權狀文件類型會強制選 VLM visual，不讓 local Python parser 搶先處理。
- 未分類文件若解析後同時含建物與土地內容，不自動改成單一 `building_registry_transcript` 或 `land_registry_transcript`，以免混合權狀影本遺失另一側資料。
- parser/reviewer 仍維持 agent assignment 可設定，但 transcript workbench runtime 會在解析與審查階段各自取最多 3 個不同 provider；factory defaults 保留 3 fallback trigger 以符合既有 Agent Config 結構，實際品質追蹤只呈現本次被選入 ensemble 的模型。

### 下一步

- 擴充本地文字層 parser 真實謄本樣本 regression。
- 讓 parse/review stage 輸出欄位級 bbox，右側文件預覽改為精準紅框。
- 將現有分散式 upload controls 進一步移除或轉為 legacy-only 管理入口。

## 2026-04-28 今日工作進度報告

### 本日完成任務清單

- 單一謄本工作台 UX 收斂：完成度 100%。
  - 交付物：多選已上傳謄本、右側預覽依勾選同步增減、移除不必要的開啟與聚焦提示、移除舊版進階工具入口、儲存按鈕改為「儲存解析結果」。
- 謄本與權狀 route 擴充：完成度 95%。
  - 交付物：`building_title`、`land_title` document kind；影像權狀走 VLM；PDF 權狀優先 VLM；文字層謄本 PDF 保留 local Python/pdftotext 路徑。
- 三段 AI 品質追蹤：完成度 95%。
  - 交付物：Detect、Parse、Verify/Review、Detail Builder trace 顯示 provider/model、prompt source、狀態、耗時、修正建議、警示與報告 URL。
- 三 parser + 三 reviewer + fallback 補位：完成度 95%。
  - 交付物：parser/reviewer 候選最多 5 個，目標 3 份成功報告；失敗自動補位；成功達標後不再等待慢速 provider。
- Parser / Reviewer Markdown 報告：完成度 95%。
  - 交付物：`/api/transcript-intake/runs/[id]/ai-reports` 可輸出 parser、reviewer、detail builder 報告。
- Detail Builder 明細草稿：完成度 90%。
  - 交付物：依 parse + review + 原始文件產生四大明細草稿，confirm 後同步到 `building_land_area_detail` 使用的資料來源。
- Reviewer confidence 語意校準：完成度 100%。
  - 交付物：UI 改為「審查信心」；後端依 evidence、majority acceptance、blocking issue 與人工確認風險校準 confidence。
- Parse / Review 計時修正：完成度 100%。
  - 交付物：模型 badge 各自顯示工作中秒數與完成耗時；併發 runner 達標後立即取消 active requests 並進入下一步。
- DB 與 agent 預設更新：完成度 100%。
  - 交付物：新增並套用 `20260428110000_replace_transcript_audit_gpt55.sql`，`transcript_audit` 預設移除 `openai/gpt-5.5`，改由 Claude / Gemini / Grok 為前三順位，OpenAI GPT-5.3 作補位。
- Project Progress Feature ID SSoT：完成度 100%。
  - 交付物：`roadmap.ts` 每個 feature 補固定 `id`；Development Tab、phase tabs、dev-log API、roadmap context API、Paperclip auto-dispatch 改讀 Feature ID；統一謄本解析工作台校正為 Feature ID 084。

### 遭遇之技術或流程困難

- 權狀影本 Detect / Parse 漏讀。
  - 問題現象：JPG/PDF 權狀被 unsupported route 擋住，或 parser 漏讀第 1 頁建物權狀，只產生土地結果。
  - 排查過程：比對實機 parser/reviewer report、route decision、document kind schema、VLM caller MIME 與 saved prompt。
  - 根因分析：schema 原本偏向傳統謄本，缺少權狀類型；部分 provider 不接受 `application/pdf` image input；prompt 未明確要求權狀影本也要抽建物與土地欄位。
  - 最終解決方案：新增權狀 kind 與 route rule；PDF 權狀轉 JPG page 後送 VLM；saved prompt 補上權狀規則。
- Parser 已完成但 Parse stage 長時間不進下一步。
  - 問題現象：模型個別耗時已完成，但整段 Parse stage 被拖到 100 秒以上。
  - 排查過程：檢查 `runConcurrentUntilTargetSuccess`，確認達標後仍等待 active promises settled。
  - 根因分析：部分 provider 不會立刻尊重 abort signal，runner 仍等待 inflight promise，造成達標後延遲。
  - 最終解決方案：達到目標成功數後立即 cancel active work without waiting，並新增 non-cooperative promise regression。
- Reviewer confidence 偏低。
  - 問題現象：reviewer 清楚指出 parser 錯誤，但畫面顯示 0% 到 35%。
  - 排查過程：檢查 confidence merge 與 prompt，確認模型把「parser 結果可信度」和「審查結論信心」混用。
  - 根因分析：confidence 語意未統一，模型自評不可比較。
  - 最終解決方案：prompt 明確量尺；UI 改為「審查信心」；後端加入校準器。
- `openai/gpt-5.5` reviewer 持續 JSON parse fail。
  - 問題現象：品質追蹤反覆出現 `Unexpected end of JSON input`。
  - 排查過程：檢查 agent assignment、factory default 與 JSON extraction。
  - 根因分析：該模型在目前 Chat Completions + vision + strict JSON 組合下不穩定，fallback 雖能補位但會造成固定噪音。
  - 最終解決方案：移出 reviewer 預設前三順位，改用 GPT-5.3 chat latest 作 OpenAI fallback。

### 本日踩雷事件與事前可預防指標

- PDF 權狀以非 image MIME 傳給 image-only VLM。
  - 事前可預防指標：provider error 出現 `Invalid MIME type`、`unsupported image format` 或 `Only image types are supported`。
- 多模型 stage 達標後仍等待慢速 inflight provider。
  - 事前可預防指標：stage duration 明顯大於 max(model duration)，且沒有 consensus / judge / saving 子階段說明。
- Reviewer confidence 語意混淆。
  - 事前可預防指標：reviewer 有 blocking evidence，但 confidence 低於 0.5。
- GPT-5.5 reviewer 連續 schema mismatch。
  - 事前可預防指標：同一 provider/model 在同一 stage 連續 2 次以上 JSON parse failure。

### 下次避免措施

- 流程優化：新增 provider 或文件型態前先跑 MIME compatibility smoke test；多模型 stage 必須分開記錄 model、stage、post-process 耗時；confidence 一律顯示為「審查信心」。
- 工具導入：規劃 `tools/transcript/check-vlm-document-compat.ts`，可輸入文件與 agent chain，輸出 provider 是否接受 MIME、是否能產生 valid JSON。
- 自動化需求：新增 `npm run transcript:vlm-smoke`、`npm run transcript:failure-rate`、`npm run transcript:route-fixtures` 三個腳本。

### 明日優先工作項目

- P0：VLM provider compatibility smoke script，預估 3 小時；相依 `CALLERS`、agent resolver、sample documents；風險是 provider key 或 rate limit 不穩。
- P0：權狀影本 sample regression，預估 3 小時；相依建物權狀、土地權狀、混合權狀樣本；風險是個資遮罩。
- P1：AI 品質追蹤加入 post-process 子階段耗時，預估 2 小時；相依現有 parse summary；風險是舊 run 缺資料。
- P1：Detail Builder 欄位級 evidence 與人工確認 UX，預估 4 小時；相依 review field decisions 與 area detail draft schema；風險是多 owner / 多地號閱讀負擔。
- P2：文件預覽 bbox 紅框 MVP，預估 6 小時；相依欄位級 bbox；風險是 PDF page coordinate 與 iframe scale 對齊。

### 文件索引

- DEV-SPEC：`/project-process/features/transcript-intake-workbench-dev-spec-20260427.md`
- TDD-SPEC：`/project-process/features/tdd-transcript-intake-workbench-20260427.md`
- TDD Progress Report：`/project-process/test-logs/test-transcript-intake-workbench-2026-04-28.md`
- Development Log Summary：`/project-process/dev-logs/084-development-log-summary.md`

## 2026-04-29 Sprint 3 啟動登記

### 本日完成任務清單

- 完成 Feature 084 今日開發前登記：Task ID 084，Sprint 3「逐頁文件分類與正式/參考來源分流」，狀態 In Progress。
- 確認本機儀表板 `/superadmin/dashboard/project-progress` 目前導向登入頁；任務識別改以 `roadmap.ts` 固定 `id: "084"` 為真值。
- 將今日工作範圍收斂為：PDF/影像逐頁分類、橫躺頁處理、正式謄本/權狀來源與不動產說明書/調查報告參考來源分離、坪數交叉檢查。

### 交付物與完成度

- 任務登記與文件同步：100%。
- Sprint 3 實作：0%，待完成 page classifier contract、route decision schema、worker/parser 分流與 UI 呈現。

### 遭遇困難與根因分析

- 本機 project-progress 頁面需要登入，無法直接從 UI 讀取任務卡。
  - 根因：Playwright session 沒有 superadmin cookie。
  - 處理：依 guide 規則改以 `roadmap.ts` 固定 Feature ID 與現有 Feature 084 文件路徑核對。
- 使用者上傳的單一檔案可能混有不動產說明書、物件調查報告與正擺/橫躺電傳謄本。
  - 根因：現有 detector 以整份文件和主要視覺輸入做初判，缺少逐頁分類與正式/參考來源邊界。
  - 處理：今日實作目標先建立 page-level classification，再讓 parser/detail builder 只採信正式來源頁。

### 踩雷事件與預防指標

- 預防指標 1：若 route decision 只有文件層級 `vlm_visual`，但沒有頁面角色，代表混合 PDF 仍可能被非謄本頁污染。
- 預防指標 2：若 area detail row 沒有 `sourcePage` 或來源頁角色，代表明細無法判斷是否來自正式謄本/權狀。
- 預防指標 3：若不動產說明書坪數直接進 canonical detail，而不是差異警示，代表來源信任邊界失效。

### 下次避免措施

- 在 prompt 與資料結構都明確區分 `authoritative` 與 `reference_only`，不要只靠 UI 文案提醒。
- 對混合文件新增 regression：正式謄本頁可填明細，調查報告/說明書只能產生 cross-check warning。
- 對橫躺頁至少保留 `orientation` 與 `rotationHint`，讓後續 VLM prompt 與預覽可追溯。

### 明日優先工作項目與預估工時

- P0：逐頁分類 schema、router 與 prompt 更新，預估 3 小時。
- P0：worker/parser 分流，讓正式來源頁進解析、參考來源頁進坪數檢查，預估 4 小時。
- P1：工作台 UI 顯示頁面分類、來源信任層級與坪數差異，預估 3 小時。
- P1：混合文件與橫躺頁 regression tests，預估 2 小時。

## 2026-04-29 Sprint 3 實作完成

### 本日完成任務清單

- 新增 page-level classifier，將混合 PDF 分成謄本、權狀、不動產說明書、物件調查報告與圖資/照片頁。
- 建立 intake run 時，route_decision.documents 會寫入 pages、sourceTrust、orientation、rotationHint、confidence 與 evidenceText。
- 技術選擇面板顯示每份文件的正式來源、參考來源、略過與待確認頁數，並列出前 5 頁分類。
- 面積明細草稿列新增 sourceTrust，來源欄可顯示正式來源/參考來源狀態。
- detect/parse/review/detail_builder prompt 與 saved_prompts migration 補上正式來源分流規則。
- 新增 classifier regression test，並更新 route API test、test-manifest 與 Feature 084 unit test 索引。

### 交付物與完成度

- Sprint 3 第一版：90%，狀態調整為 In Review。
- 交付物：page classifier、route_decision pages contract、技術選擇 UI、明細來源標記、prompt/migration、targeted tests。

### 遭遇困難與根因分析

- 初版 classifier 曾把「建物標示」誤判為建物權狀；根因是權狀 marker 過寬。
- 已改為以「建物所有權狀」「建物權狀」「所有權狀字號」等明確標記辨識權狀。

### 踩雷事件與預防指標

- Jest runTestsByPath 需用 workspace 內相對路徑，否則會組成重複 apps/superadmin 路徑。
- 部分 component test 仍有 open handle，targeted run 需加 --forceExit 或另開 detectOpenHandles 追蹤。

### 下次避免措施

- classifier marker 必須先由 regression test 覆蓋，再擴大到真實樣本。
- 新增測試檔時同步更新 apps/superadmin/test-manifest.json 與 unit_test/084/README.md。

### 明日優先工作項目與預估工時

- 用真實混合 PDF 實機跑一次 end-to-end，確認 VLM 是否遵守 sourceTrust：2h。
- 加上 reference_only 坪數與 authoritative 謄本面積差異提示：2h。
- 補文件預覽頁碼跳轉與紅框 evidence 對位：3h。

## 2026-04-29 車位建物坪數計算修正

### 本日完成任務清單

- 修正建物土地車位面積明細表的車位建物計算邏輯。
- 車位建物現在會先計算主建物、附屬建物、共有部分各自持分，再套用車位建物所有權部的整體權利範圍。
- 已修補目前測試物件的 confirmed area draft，補入 `groupShareRatio: "84分之2"`。

### 交付物與完成度

- Bug fix 完成度：100%。
- 實機頁面已確認車位建築面積小計由 1054.88㎡ / 319.10坪 修正為 25.12㎡ / 7.60坪。

### 遭遇困難與根因分析

- 根因：`parkingBuildingAreas` 只保存列內持分，例如「全部」或共有部分比例，未保存車位建物整體所有權比例「84分之2」。
- 舊計算直接加總列內持分面積，漏乘外層車位權利範圍。

### 踩雷事件與預防指標

- 若車位建物 row 顯示「全部」但車位所有權部有「84分之2」等比例，代表需要 groupShareRatio。
- 若車位小計接近 1054㎡ 這類整棟公設量級，通常代表漏乘車位整體持分。

### 下次避免措施

- Detail Builder prompt 已要求獨立車位建物列保存 `groupShareRatio`。
- UI 計算支援從 `parkingBuildingTranscript` 或 row `groupShareRatio` 取得外層比例。

### 明日優先工作項目與預估工時

- 檢查其他既有 confirmed runs 是否也漏 `groupShareRatio`：1h。
- 補舊資料批次修復工具或 migration：2h。

## 2026-04-29 Detect / Detail Builder VLM Fallback 修正

### 本日完成任務清單

- 將 Detect 與 Detail Builder 從單一 VLM 改為最多 4 個候選模型依序 fallback。
- 第一個模型回傳畸形 JSON、API error 或 schema mismatch 時，會記錄錯誤並嘗試下一個模型。
- AI 品質追蹤現在會保留 Detect / Detail Builder 各候選模型的 running、success、error 狀態。
- JSON 抽取器改為字串感知的 `{}` 掃描，並保守修復常見 trailing comma。

### 交付物與完成度

- AI fallback hotfix 完成度：100%。
- 狀態：In Review。

### 遭遇困難與根因分析

- 使用者看到的 `Unterminated string in JSON` 是模型輸出格式錯誤，不是 provider 把請求判定為惡意。
- 根因：Detect/Detail Builder 原本只取 agent chain 第一個模型；單一模型 JSON 失敗後直接退回 processor seed，沒有像 Review 一樣嘗試其他候選。

### 踩雷事件與預防指標

- 若 AI 品質追蹤顯示 Detect 直接 `Fallback · processor_seed`，且 warnings 是 JSON parse error，代表應優先檢查模型輸出與 fallback chain，而不是判定帳號被封鎖。
- 若 trace 只有一個 Detect model badge，代表 stage info 未讀取完整候選模型。

### 下次避免措施

- 新增 fallback regression：Detect / Detail Builder 第一個模型壞 JSON，第二個模型成功。
- JSON repair 只做低風險修復，不補猜被截斷的內容；截斷仍交給下一個候選模型處理。

### 明日優先工作項目與預估工時

- 實機用同一份混合 PDF 重跑，確認 Detect 不再因單一模型 JSON 錯誤直接落入 seed：1h。
- 將同檔案 hash + provider/model 的短期失敗快取納入下一輪成本優化：2h。

## 2026-04-29 移除 AI 失敗時的 Processor Seed 草稿

### 本日完成任務清單

- 依使用者要求，移除 Detect / Verify Review / Detail Builder 全部 AI 失敗時的 seeded 草稿行為。
- 全部候選 AI 失敗時，run 會標記 `failed`，並在 AI 品質追蹤保留失敗階段、模型狀態與錯誤訊息。
- UI fallback trace 不再把舊 detect failure 顯示成 `processor_seed`。

### 交付物與完成度

- No fabricated seed data policy：100%。
- 狀態：In Review。

### 遭遇困難與根因分析

- 原先 processor seed 的設計目標是避免流程卡住，但對謄本這種正式面積/權利資料而言，保底草稿會造成「系統瞎猜」的風險。
- 根因：AI 全部失敗與 AI 成功但需要人工確認，在使用者感知上必須清楚分開。

### 踩雷事件與預防指標

- 若 AI 全部失敗後仍進入 `needs_user_confirmation`，代表系統可能產生可儲存的假草稿。
- 若 trace 顯示 `processor_seed` 且沒有明確失敗模型，代表風險不可追溯。

### 下次避免措施

- Detect、Review、Detail Builder 全失敗案例必須有 regression，確認 run failed 而不是 needs_user_confirmation。
- 僅保留從真實文件內容解析出的 local/text/parser 結果；不得用文件類型或猜測值補成正式明細。

### 明日優先工作項目與預估工時

- 實機重跑混合 PDF，確認畫面失敗狀態與模型錯誤顯示清楚：1h。

## 2026-04-29 AI 報告制式規格升級

### 本日完成任務清單

- 新增 transcript `standardReport` contract，讓 Parser、Verify / Review、Detail Builder 都輸出可機器比較的制式報告資料。
- 新增 consensus matrix 工具，將多模型 structured JSON 分為 100% 相同、多數相同、單一來源、全部不同與需要人工審核 items。
- `/api/transcript-intake/runs/[id]/ai-reports` 改為六段式 Markdown：報告人與時間、看到的內容、最終 Structured JSON、缺漏資訊、面積計算、初步明細與信心分數。
- Parser report fallback 會從既有 raw output 產生基本 `standardReport`，舊資料仍可輸出新版制式報告。
- 新增 saved_prompts migration `20260429110000_standardize_transcript_ai_reports.sql`，避免 DB prompt 覆蓋程式碼 fallback 規格。

### 交付物與完成度

- AI report standardization：100%。
- 狀態：In Review。

### 遭遇困難與根因分析

- 原先 report 偏 debug dump，缺少逐頁觀察、缺漏資訊、計算結果與一致性比對欄位。
- 共識比對不能只讀 Markdown，必須用 normalized structured JSON；因此新增共用 consensus matrix，而不是讓後續 AI 再解析人類文字。

### 踩雷事件與預防指標

- `88.5` 與 `88.50` 這類等價數字字串若不正規化，會被誤判成模型衝突。
- 若 report 只有 Markdown、沒有 `standardReport`，代表後續 reviewer/detail builder 無法穩定做欄位級比對。

### 下次避免措施

- 新增 report-standard regression，覆蓋 100% / 多數 / 單一來源 / 全部不同分類。
- 後續任何 AI report UI 改版都應讀 `standardReport`，Markdown 只作呈現層。

### 實際執行命令

```bash
npm test --workspace superadmin -- lib/transcript-parse/__tests__/report-standard.test.ts lib/transcript-parse/__tests__/intake-ai.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand
npx tsc --noEmit --project apps/superadmin/tsconfig.json
```

## 2026-04-29 Detect 候補模型顯示與 Gemini Flash 移除

### 本日完成任務清單

- AI 品質追蹤的模型 chip 現在明確顯示 `已執行`、`執行中`、`失敗`、`已取消`、`候補等待` 或 `候補未執行`。
- 修正 Detect fallback chain 完成後只看到一個模型有計時卻不知道其他模型是否執行的 UX 問題。
- `transcript_detection` factory default 與本機 DB assignment 移除 `gemini/gemini-2.0-flash`，改用 `gemini/gemini-1.5-pro` 作 Gemini Pro fallback。
- 新增 migration `20260429120000_replace_transcript_detection_gemini_flash.sql`，fresh DB 與既有 DB 都會套用新的 detection chain。

### 交付物與完成度

- Detect trace clarity hotfix：100%。
- Gemini 2.0 Flash removal from transcript detection：100%。
- 狀態：In Review。

### 遭遇困難與根因分析

- Detect / Detail Builder 是依序 fallback，不是 parser/reviewer 的三模型並行 ensemble。第一個模型成功時，後續候補不會執行，原 UI 只列出候選模型名稱，未標示候補狀態。
- `gemini-2.0-flash` 留在 detection cost_over fallback，對權狀與車位初判品質不足。

### 踩雷事件與預防指標

- 若完成階段的模型 chip 沒有 `已執行` 或 `候補未執行`，user 會誤以為所有候選都已經跑過但只有一個有計時。
- 若 transcript detection chain 仍出現 `gemini-2.0-flash`，代表 DB assignment 或 factory default 未同步。

### 實際執行命令

```bash
npm test --workspace superadmin -- components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx lib/ai/__tests__/agent-defaults.test.ts lib/transcript-parse/__tests__/intake-ai.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --forceExit
npx tsc --noEmit --project apps/superadmin/tsconfig.json
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/migrations/20260429120000_replace_transcript_detection_gemini_flash.sql
```
