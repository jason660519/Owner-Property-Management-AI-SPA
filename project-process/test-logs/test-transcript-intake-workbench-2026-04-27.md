# 統一謄本解析工作台測試紀錄

日期：2026-04-27  
Feature ID：084

## 本輪測試

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts --runInBand
```

結果：通過，5 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.samples.test.ts --runInBand
```

結果：通過，3 tests。使用 `resources/samples/謄本PDF範例` 的真實 PDF，覆蓋可文字解析謄本、影像型權狀影本、非謄本文字 PDF。

```bash
npm test -- --runTestsByPath lib/ai/__tests__/ensure-seeded.test.ts --runInBand
```

結果：通過，8 tests。

```bash
npm test -- --runTestsByPath app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' --runInBand
```

結果：通過，7 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/ai/__tests__/ensure-seeded.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' --runInBand
```

結果：通過，4 suites / 20 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' --runInBand
```

結果：通過，2 suites / 6 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/ai/__tests__/ensure-seeded.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' --runInBand
```

結果：通過，6 suites / 27 tests。

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 2 tests。此 sandbox 無法寫入 user watchman state，因此 UI test 使用 `--no-watchman`；React scheduler MessagePort 在 Node 25 下會讓 Jest 提示未退出，故本次 targeted run 加 `--forceExit`。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/ai/__tests__/ensure-seeded.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，7 suites / 29 tests。

```bash
npm test -- --runTestsByPath 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，2 suites / 7 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' --runInBand --no-watchman --forceExit
```

結果：通過，2 suites / 7 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/ai/__tests__/ensure-seeded.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，7 suites / 31 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/ai/__tests__/ensure-seeded.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，8 suites / 34 tests。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/intake-router.samples.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/ai/__tests__/ensure-seeded.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' 'app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，9 suites / 38 tests。

```bash
npx tsc --noEmit
```

結果：通過。

```bash
bash tools/testing/validate-test-manifest.sh
```

結果：通過，22 entries。

```bash
git diff --check
```

結果：通過。

## 覆蓋項目

- 檔案格式判斷。
- PDF 文字層可用性判斷。
- 真實 PDF 樣本路由回歸：可文字解析謄本走 Python，影像型權狀影本與非謄本 PDF 走 VLM。
- Python/VLM/JSON 路由。
- 新 prompt seed 與既有 seed 測試相容。
- intake run 建立 API 授權、文件歸屬檢查、成功建立。
- intake run 查詢 API 授權與 404。
- intake worker claim、AI detect/review、parse、review seed fallback、needs_user_confirmation。
- intake worker parse error → failed。
- process API 授權與 after 啟動。
- 工作台 UI 空狀態、建立 run、啟動 process。
- confirm API confirmed_result snapshot。
- confirm API 同步 confirmed result 到 property details，供建物土地面積明細表計算。
- 工作台 UI 確認並儲存。
- TypeScript 型別檢查。
- test manifest 格式驗證。

## 尚未覆蓋

- 多模型 detect/review consensus。
- 多文件逐份 detect/review 視覺判讀。
- 精準 bbox 紅框繪製。

## 2026-04-28 追加驗證

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，3 suites / 11 tests。覆蓋欄位級 area detail draft、confirm API 接收 user 修正 payload、工作台儲存謄本 payload。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，3 suites / 13 tests。追加覆蓋工作台單一上傳入口、`registry_transcript_unclassified` 文件類型、未分類謄本依 parsed kind 同步 canonical details。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，4 suites / 19 tests。追加覆蓋 worker 將未分類謄本依 parsed kind 自動改成建物／土地文件角色。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

## 2026-04-28 權狀影本 Parser / Reviewer 失敗診斷與修正驗證

- 實機 run `25cf6f72-1278-4e3a-85c1-2f7ec7fd3c35` 診斷：
  - Qwen `qwen3.6-plus` 先前對 PDF 權狀輸出幾乎空白，原因是 Qwen caller 沒有把 PDF 轉成可讀圖片，模型只收到 prompt。
  - Kimi `kimi-k2.6` 回 `unsupported image format: application/pdf`。
  - Gemini `gemini-3.1-pro-preview` 回破碎 JSON，疑似輸出 token 上限不足。
  - OpenAI/Grok reviewer 對 PDF data URL 回 MIME 錯誤。
  - Anthropic reviewer 回 markdown fence JSON，既有容錯在無結尾 fence 時仍可能失敗。

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/migrations/20260428040000_strengthen_transcript_title_prompts.sql
```

結果：通過。`transcript.parse`、`transcript.intake.detect`、`transcript.intake.review` saved prompts 均已 append 權狀影本補充規則。

```bash
npm test -- --runInBand --forceExit apps/superadmin/components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts
```

結果：通過，2 suites / 11 tests。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/migrations/20260428020000_update_transcript_vlm_agent_defaults.sql
```

結果：通過。本機 DB 的 `transcript_visual_parse` 已更新為 `qwen/qwen3.6-plus` + `kimi/kimi-k2.6` + `gemini/gemini-3.1-pro-preview`；`transcript_audit` 已更新為 `openai/gpt-5.5` + `anthropic/claude-opus-4-5-20251101` + `grok/grok-4.20-reasoning`。

```bash
bash tools/testing/validate-test-manifest.sh
git diff --check
```

結果：通過。

## 2026-04-28 Parser / Reviewer 報告 URL 追加驗證

```bash
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/migrations/20260428030000_extend_ocr_parse_results_provider_check.sql
```

結果：通過。`ocr_parse_results.provider` 現可接受 qwen、kimi、openrouter、ollama、local 等 provider，支援新 parser ensemble 寫入 raw output。

```bash
npm test -- --runInBand --forceExit apps/superadmin/components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts
```

結果：通過，2 suites / 11 tests。覆蓋 AI 品質追蹤仍能顯示 parser/reviewer 執行中狀態與完成 trace。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

## 2026-04-28 三 Parser + 三 Reviewer VLM 追加驗證

```bash
npm test -- --runInBand apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts apps/superadmin/lib/ai/__tests__/agent-defaults.test.ts
```

結果：通過，2 suites / 53 tests。覆蓋 transcript parser/reviewer agent defaults 可被靜態模型清單解析，以及 intake worker 在新 trace helper 下仍可完成 detect、parse、review 與 fallback。

```bash
npm test -- --runInBand apps/superadmin/lib/ai/__tests__/agent-defaults.test.ts apps/superadmin/lib/utils/parser-concurrency.test.ts apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts apps/superadmin/components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx apps/superadmin/components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx
```

結果：通過，5 suites / 70 tests。Jest 測試已完成但 React/MessagePort open handle 讓 process 未自行退出，已停止殘留 jest process。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 4 tests。追加覆蓋工作台顯示每份檔案實際使用的技術路由，包括 `本地文字層（Python / pdftotext）` 與 PDF probe 指標。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/intake-router.samples.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，6 suites / 28 tests。覆蓋 routing、真實 PDF sample routing、`local_python_text` worker、confirmed result 同步、confirm API 與工作台 UI。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

## 2026-04-28 技術路由實機驗證

- 在 `http://localhost:3001/superadmin/properties/439007be-2d8f-445f-8bbd-03be358dc66b/edit?tab=transcript` 重新建立謄本工作台 run。
- 最新 run：`c1426b0c-da38-4261-9454-934ab34b0ce9`，狀態 `needs_user_confirmation`，aggregate route 為 `local_python_text`，review confidence `0.85`。
- 工作台「技術選擇」區已顯示兩份 PDF 都使用 `本地文字層（Python / pdftotext）`：
  - 建物謄本：1 頁 / 文字 1377 / 繁中 552 / 謄本標記 5。
  - 土地謄本：13 頁 / 文字 19159 / 繁中 6956 / 謄本標記 3。
- 解析結果可帶出建物面積 `152.64`、建物所有權人 `凌建堂`、土地地號 `大安區大安段三小段 0014-0000地號`、土地所有權人 `全坤建設開發股份有限公司`、土地持分 `100000分之8460`。
- Review 正確標示需人工確認：建物與土地謄本的所有權人／地段不一致，未自動儲存 canonical model。
- 瀏覽器 console error/warning 為空。

## 2026-04-28 AI 品質追蹤追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --no-watchman --forceExit
```

結果：通過，2 suites / 11 tests。覆蓋 worker 寫入 `parsed_result.aiStageTrace`，以及工作台顯示 detect、parse、verify/review 的 provider/model、狀態、summary 與修正建議。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/intake-router.samples.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，6 suites / 28 tests。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

- 實機 run：`e3485b68-eda9-4cfc-a9c3-646c8a65a5d8`，狀態 `needs_user_confirmation`。
- `AI 品質追蹤` 區塊顯示：
  - Detect 初判：`transcript_detection / transcript.intake.detect / prompt: saved_prompts_module_key`，模型 `openai/gpt-4o`，因 PDF MIME 限制 fallback 到 `processor_seed`。
  - Parse 正式擷取：`local/local-python-text`，狀態成功，完成 2/2 份文件解析。
  - Verify / Review 驗證審查：`transcript_audit / transcript.intake.review / prompt: saved_prompts_module_key`，模型 `anthropic/claude-opus-4-20250514`，confidence `30%`。
- Review 顯示修正／建議：`dispositionKind 建議改為 unknown`、`buildingType 建議改為 apartment`。
- Review 顯示人工確認原因：建物坐落地號與土地謄本地號不符、建物與土地所有權人不同、需補正建物坐落土地謄本。
- 瀏覽器 console error/warning 為空。

## 2026-04-28 謄本刪除入口追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 5 tests。追加覆蓋工作台已上傳謄本清單與兩段式刪除流程，確認第二次點擊「確認刪除」後才呼叫 `deletePropertyDocument`。

- 實機頁面確認 `謄本上傳` 區塊下方出現 `已上傳謄本` 清單。
- 每份謄本都有 `開啟文件` 與 `刪除文件` 按鈕。
- 本次只驗證 UI 入口，未刪除目前測試物件的真實謄本文件。

## 2026-04-28 文件預覽同步追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 6 tests。追加覆蓋 `已上傳謄本` 選取狀態與右側 `文件預覽與來源` iframe 同步；點選土地謄本後，右側預覽切換為土地謄本，左側同列顯示 `預覽中`。

- 實機頁面重新整理後預設選取第一份已上傳謄本，左側顯示 `預覽中`。
- 點選第二份 `建物謄本-第1筆-建物標示部及所有權部範本003` 後，左側高亮切換到該列，右側同步改用該文件的 `/api/documents/431387f3-305d-462b-a41e-dc25564ece60/view` iframe。
- 瀏覽器 console error/warning 為空。

## 2026-04-28 多選謄本解析追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 9 tests。追加覆蓋已上傳謄本清單的複選框：預設兩份謄本皆勾選，取消勾選土地謄本後按「建立並判讀」，送到 `/api/transcript-intake/runs` 的 `documentIds` 只包含仍勾選的建物謄本。另覆蓋兩份皆勾選時左側有兩個 `預覽中` 且右側有兩個 iframe；取消勾選其中一份後，左側 `預覽中` 與右側對應 iframe 都同步減為一份。新增 active `parsing` run 測試，確認工作台顯示 `系統正在解析` 與 `已花費` 計時提示。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/intake-router.samples.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，6 suites / 33 tests。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。

## 2026-04-28 AI 品質追蹤階段計時追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 9 tests。追加覆蓋 active `parsing` run 時，`AI 品質追蹤` 的 `Parse 正式擷取` 顯示 `處理中` 與 0.1 秒精度的 `已花費` timer；完成後的 trace 顯示 Detect、Parse、Verify/Review 各自的 `花費 X.X 秒`。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 7 tests。覆蓋 intake worker 寫入 `parsed_result.aiStageTrace[].durationMs`，讓完成後的階段耗時可保留在 run history。

## 2026-04-28 移除舊版謄本工具入口追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptTabContent.test.tsx components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，2 suites / 10 tests。覆蓋謄本 tab 只顯示統一謄本工作台，且 `進階／舊版謄本工具` 與舊版 `標的建築物建號筆數(單選)` 入口不再出現。

## 2026-04-28 權狀影本 VLM route 追加驗證

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，3 suites / 22 tests。追加覆蓋 `building_title` / `land_title` 權狀文件類型：JPG 權狀影本會走 `vlm_visual` 且不執行 PDF text probe；PDF 權狀即使有文字也強制走 VLM；工作台會把 `building_title` 文件納入「已上傳謄本／權狀」與可勾選解析範圍。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts lib/transcript-parse/__tests__/intake-router.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，5 suites / 35 tests。追加覆蓋同一份未分類權狀影本若同時含建物與土地資料，worker 不會強制改成單一建物或土地文件類型；確認同步會同時保留 buildingTranscript 與 landTranscript。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/intake-router.test.ts lib/transcript-parse/__tests__/intake-router.samples.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，7 suites / 43 tests。

## 2026-04-28 AI 品質追蹤 partial trace 顯示追加驗證

```bash
npm test -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 10 tests。追加覆蓋後端只先回傳 Detect partial `aiStageTrace`、run 已進入 `parsing` 時，前端仍固定顯示 Detect、Parse、Verify/Review 三段；Parse 會顯示 `處理中` 與 `已花費 X.X 秒`，避免 user 誤以為解析卡住。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，3 suites / 20 tests。追加覆蓋 worker 在進入 `parsing` 前先把 Parse 預計使用的 VLM/local parser 寫入 `aiStageTrace`，進入 `reviewing` 前先把 Verify/Review 的 provider/model 寫入 trace；前端在 Parse 或 Verify/Review 執行中會同步顯示 `parse:` 或 `review:` 的模型名稱與 `已花費` 計時。

- 實機頁面重新整理後 `已上傳謄本` 顯示兩個 `納入解析` 複選框，預設皆為 checked，摘要顯示 `已勾選 2 份解析`。
- 取消勾選第二份建物謄本後，摘要改為 `已勾選 1 份解析`，右側預覽清單同步只保留仍勾選的謄本。
- 點擊 `全選解析` 後恢復兩份皆勾選；瀏覽器 console error/warning 為空。
- 追加同步檢查：取消勾選第二份建物謄本後，未勾選的建物謄本預覽按鈕停用，`預覽中` 標記只保留 1 個並留在仍勾選的謄本上。

## 2026-04-28 實機頁面驗證

- 以 superadmin 測試帳號登入 `http://localhost:3001/superadmin/properties/439007be-2d8f-445f-8bbd-03be358dc66b/edit?tab=transcript`。
- 初次檢查發現本機 DB 尚未套用 `transcript_intake_runs` migration，工作台顯示 schema cache 缺表錯誤。
- 依專案既有做法用 `psql` 單獨套用 `supabase/migrations/20260427100000_create_transcript_intake_runs.sql`，註冊 `supabase_migrations.schema_migrations`，並執行 `pg_notify('pgrst', 'reload schema')`。
- 重新整理後缺表錯誤消失，謄本工作台、單一上傳入口、文件列表、四段流程、明細區與文件預覽均可渲染。
- 修正 transcript tab 版面高度後，工作台可由頁面自然捲動，不再被固定高度容器壓縮；瀏覽器 console error/warning 為空。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --no-watchman --forceExit
```

結果：通過，1 suite / 7 tests。追加覆蓋 `local_python_text` route 先用本地文字層 parser 寫入 `parsed_result`，成功時不呼叫 VLM parse core。

```bash
npm test -- --runTestsByPath lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts 'app/api/transcript-intake/runs/[id]/__tests__/route.test.ts' components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --no-watchman --forceExit
```

結果：通過，4 suites / 20 tests。覆蓋 confirmed result 同步、intake worker、confirm API 與工作台 UI 的整合回歸。

```bash
npx tsc --noEmit
```

結果：通過。執行目錄：`apps/superadmin`。
