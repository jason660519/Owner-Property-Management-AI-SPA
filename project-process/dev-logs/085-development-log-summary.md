# Row 085 開發日誌：統一謄本解析工作台

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
