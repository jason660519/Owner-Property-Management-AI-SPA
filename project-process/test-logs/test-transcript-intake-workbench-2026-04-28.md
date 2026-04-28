# Feature ID 084 TDD Progress Report — 統一謄本解析工作台

日期：2026-04-28  
Feature ID：084  
對應頁面：`/superadmin/properties/:id/edit?tab=transcript`、`/superadmin/properties/:id/edit?tab=building_land_area_detail`

## 本日完成任務清單

- 單一謄本工作台 UX 收斂：完成度 100%
  - 交付物：已上傳謄本清單改為多選；右側文件預覽依勾選同步增減；移除不必要的「開啟」與「聚焦」提示；刪除舊版進階工具入口；最終儲存按鈕文字改為「儲存解析結果」。
  - 驗收重點：user 可一次勾選多份謄本或權狀進行預覽與解析，不需先判斷建物／土地／車位類型。

- 謄本與權狀路由擴充：完成度 95%
  - 交付物：`building_title`、`land_title` 納入 intake document kind；JPG/GIF/PNG/WebP/TIFF/BMP 權狀直接走 VLM；PDF 權狀優先走 VLM；PDF 謄本文字層仍可走 local Python/pdftotext。
  - 驗收重點：權狀影本不再在 Detect 階段被 unsupported route 擋住。

- 三段 AI pipeline 可觀測化：完成度 95%
  - 交付物：Detect、Parse、Verify/Review、Detail Builder trace 顯示 provider/model、prompt source、狀態、耗時、修正建議、警示與報告 URL。
  - 驗收重點：user 可看到每個 parser/reviewer 是哪個 VLM、跑多久、成功或失敗，以及對應解析／審查報告。

- 三 parser + 三 reviewer + fallback 補位：完成度 95%
  - 交付物：parser/reviewer 候選最多 5 個，目標 3 份成功報告；失敗時自動補位；成功達標後不再等待慢速 provider。
  - 驗收重點：`openai/gpt-5.5` reviewer 失敗時可由 `gpt-5.3-chat-latest` 補位；後續已將 GPT-5.5 從 reviewer 預設鏈移除。

- Parser / Reviewer 報告與 Markdown 追溯：完成度 95%
  - 交付物：`/api/transcript-intake/runs/[id]/ai-reports` 可輸出 parser markdown report、reviewer markdown report、detail builder report。
  - 驗收重點：三個 parser 與三個 reviewer 各自產生報告 URL，user 可回看模型看到的內容與審查判斷。

- Detail Builder 明細草稿：完成度 90%
  - 交付物：新增 `detail_builder` stage，依 parse + review + 原始文件產生四大明細草稿：建物建築面積、建物所屬土地持分、車位建築面積、車位所屬土地持分。
  - 驗收重點：user confirm 前可編輯明細；confirm 後 `building_land_area_detail` 讀同一份 area detail draft。

- AI confidence 語意校準：完成度 100%
  - 交付物：將 UI 顯示從 `confidence` 改為「審查信心」；後端新增 reviewer confidence calibration，區分「parser 結果可信度」與「reviewer 對審查結論的信心」。
  - 驗收重點：reviewer 明確指出 parser 漏讀時，不再被錯誤顯示為 0% 低信心。

- Parse / Review 計時修正：完成度 100%
  - 交付物：前端推定 active stage 前 3 個候選模型正在工作並各自顯示秒數；後端 `runConcurrentUntilTargetSuccess` 達標後不等待 non-cooperative inflight promise。
  - 驗收重點：三個成功 parser 完成後，不再被第 4 個慢速或不理 abort 的 provider 拖到 100+ 秒。

- 本機 DB 與 migration 更新：完成度 100%
  - 交付物：新增並套用 `20260428110000_replace_transcript_audit_gpt55.sql`；本機 DB 的 `transcript_audit` 改為 Claude / Gemini / Grok，OpenAI GPT-5.3 僅作補位。
  - 驗收重點：新的 run 不再先呼叫持續輸出不完整 JSON 的 `openai/gpt-5.5` reviewer。

- Project Progress Feature ID SSoT：完成度 100%
  - 交付物：`roadmap.ts` 每個 feature 補固定 `id`；Development Tab、phase tabs、dev-log API、roadmap context API、Paperclip auto-dispatch 改讀 Feature ID；統一謄本解析工作台校正為 Feature ID 084。
  - 驗收重點：Feature ID 不再依賴 `RAW_FEATURES` index、table row 順序或 phase filter，避免 084/085 差一號。

## 遭遇之技術或流程困難

### 1. 權狀影本在 Detect / Parse 階段被誤擋或漏讀

- 問題現象：
  - user 上傳屋主權狀 JPG / PDF 後，Detect 顯示 unsupported 或被誤判為傳統謄本。
  - parser 報告漏讀第 1 頁建物權狀，只解析土地權狀，導致 `buildingTranscript` 空白。
- 排查過程：
  - 對照實機 run 的 parser/reviewer report，確認文件第 1 頁有清楚「建物所有權狀」與建號、門牌、面積、共有部分。
  - 檢查 route decision、document kind schema、VLM caller MIME 處理與 saved prompt。
- 根因分析：
  - 文件型態 schema 原本偏向 `building_transcript` / `land_transcript`，缺少 `building_title` / `land_title`。
  - 部分 VLM caller 對 PDF 直接傳 `application/pdf` data URL，OpenAI/Grok/Kimi 類 provider 只接受 image MIME。
  - saved prompt 沒明確要求權狀影本要像謄本一樣抽建物／土地欄位。
- 最終解決方案：
  - 新增權狀 document kind 與 route rule。
  - PDF 權狀先轉 JPG page 再送 VLM。
  - saved prompts 補上權狀影本解析規則與 strict JSON 要求。

### 2. Parser / Reviewer 看似跑完但整體 Parse 階段仍卡很久

- 問題現象：
  - 畫面顯示各 parser 花費 44.4 秒、52.2 秒、11.6 秒、0.7 秒，但右上角 Parse 階段總耗時到 121.1 秒才進下一步。
- 排查過程：
  - 檢查 `runConcurrentUntilTargetSuccess`，確認達到 target success 後雖有 abort active request，但仍 `await Promise.allSettled(active promises)`。
  - 對照 provider 行為，部分 API 不一定即時尊重 abort signal。
- 根因分析：
  - 併發 runner 把「達標後取消」誤實作成「取消後仍等待所有 inflight promise settled」。
  - 前端也沒有顯示 consensus / judge / saving 子階段，讓 user 誤以為 parser 還在跑。
- 最終解決方案：
  - 達到 target success 後立即 cancel active without waiting。
  - 新增 non-cooperative promise 測試，確保不理 abort 的 provider 不會卡住流程。
  - Parse trace summary 顯示 parser、consensus、judge、saving 子階段。

### 3. Reviewer confidence 偏低且語意混淆

- 問題現象：
  - Reviewer 明確指出 parser 漏讀建物權狀，卻顯示 confidence 0%、25%、35%。
- 排查過程：
  - 檢查 `normalizeReviewConfidence` 與 `mergeTranscriptReviewAttempts`，確認總分只是 reviewer 自評平均。
  - 檢查 prompt，發現未明確區分「審查結論信心」與「parser 結果可信度」。
- 根因分析：
  - 模型容易把「原 parser 結果很差」誤填成「我的審查信心很低」。
  - 後端沒有依 evidence、field decision、blocking issue 做校準。
- 最終解決方案：
  - Prompt 增加 confidence 量尺。
  - UI 改為「審查信心」。
  - 後端新增 `calibrateReviewConfidence`，以 evidence、majority_accept、reviewer_double_checked 與 user confirmation penalty 做校準。

### 4. `openai/gpt-5.5` reviewer 持續產生不完整 JSON

- 問題現象：
  - AI 品質追蹤持續出現 `Reviewer 失敗：openai/gpt-5.5: Unexpected end of JSON input`。
- 排查過程：
  - 檢查 `transcript_audit` agent assignment 與 factory default，確認 GPT-5.5 是 reviewer 第一順位。
  - 檢查 OpenAI caller 與 JSON extraction，確認 API 回傳 text 為空或不完整 JSON 時會觸發該錯誤。
- 根因分析：
  - GPT-5.5 在目前 Chat Completions + vision + strict JSON prompt 的組合下不穩定。
  - fallback 能補位，但錯誤仍會保留於品質追蹤，造成 user 每次看到同一失敗。
- 最終解決方案：
  - 將 `transcript_audit` 預設鏈改為 Claude Opus 4.5、Gemini 3.1 Pro、Grok 4.20。
  - OpenAI 改用 `gpt-5.3-chat-latest` 作第 4 個 fallback。
  - 新增 migration 並直接套用本機 DB。

## 本日踩雷事件與事前可預防指標

- 踩雷 1：PDF 權狀被送成非 image MIME，造成多個 VLM provider 拒收。
  - 導致影響：重跑多次 parser/reviewer，浪費模型成本與排查時間。
  - 事前可預防指標：任何 provider error 包含 `Invalid MIME type`、`unsupported image format`、`Only image types are supported`。

- 踩雷 2：達標後仍等待慢速 inflight parser。
  - 導致影響：UI 顯示 parser 個別已完成，但整段流程延遲到 100+ 秒，user 誤以為系統卡住。
  - 事前可預防指標：stage duration 顯著大於 max(model duration) 且沒有 consensus / judge / saving 子階段文字。

- 踩雷 3：confidence 語意未定義，模型自評不可比較。
  - 導致影響：明確的 reviewer finding 被顯示成低信心，user 會誤判 reviewer 品質。
  - 事前可預防指標：reviewer 有 blocking evidence 但 confidence 低於 0.5。

- 踩雷 4：GPT-5.5 reviewer 持續 JSON parse fail 但仍在預設前三名。
  - 導致影響：每次 run 都產生已知失敗，雖 fallback 補位但品質追蹤充滿噪音。
  - 事前可預防指標：同一 provider/model 在同一 stage 連續 2 次以上 schema mismatch。

## 下次避免措施

- 流程優化：
  - 每新增 VLM provider 或新文件型態時，先跑 MIME compatibility smoke test，再納入 production agent chain。
  - 多模型 stage 要明確區分 `model_duration_ms`、`stage_duration_ms`、`post_process_duration_ms`。
  - reviewer score 一律使用「審查信心」語意，禁止把 parser 原始可信度混入同一欄。

- 工具導入：
  - 建立 `tools/transcript/check-vlm-document-compat.ts`，輸入文件與 provider/model chain，輸出每個 provider 是否接受 MIME、是否能回 valid JSON。
  - 建立 nightly schema-mismatch report，彙整 `ai_prompt_audit_logs` 中同 stage 同 model 的 JSON parse failure rate。
  - 在 AI 品質追蹤中增加 `post_process` chip，顯示 consensus / judge / saving 耗時。

- 自動化腳本需求：
  - `npm run transcript:vlm-smoke -- --file <path> --agent transcript_audit`
  - `npm run transcript:failure-rate -- --stage review --days 7`
  - `npm run transcript:route-fixtures`，對權狀 JPG、權狀 PDF、文字層謄本 PDF、掃描 PDF 做固定回歸。

## 明日優先工作項目與預估工時

- P0：建立 VLM provider compatibility smoke script。預估 3 小時。
  - 相依性：現有 `CALLERS`、agent assignment resolver、sample documents。
  - 風險：部分 provider rate limit 或 key 不可用，需讓 script 區分 no_key / http_error / invalid_json。

- P0：補權狀影本 sample regression。預估 3 小時。
  - 相依性：需整理固定樣本：建物權狀、土地權狀、混合建物+土地權狀、含共同使用部分。
  - 風險：真實樣本含個資，需使用範例或遮罩版本。

- P1：AI 品質追蹤加入 post-process 子階段耗時。預估 2 小時。
  - 相依性：目前已能寫 parse summary；需補 schema 顯示 consensus / judge / saving duration。
  - 風險：舊 run 沒有子階段資料，UI 要保留 fallback。

- P1：Detail Builder 欄位級 evidence 與 user confirmation UX。預估 4 小時。
  - 相依性：review fieldDecisions 與 areaDetailDraft schema。
  - 風險：同一欄位多 owner / 多地號時需要可讀的人工確認 UI。

- P2：文件預覽 bbox 紅框 MVP。預估 6 小時。
  - 相依性：parser/reviewer/detail_builder 要輸出 bbox 或可定位 evidence。
  - 風險：PDF page coordinate 與 iframe preview scale 對齊可能需要額外 canvas layer。

## 本日測試與驗證紀錄

```bash
npm test --workspace superadmin -- --runInBand app/data/roadmap.test.ts app/api/project-progress/dev-log/route.test.ts --forceExit
npm test --workspace superadmin -- --runInBand --runTestsByPath 'app/superadmin/dashboard/project-progress/task/[rowId]/dev-log/page.test.tsx' --forceExit
```

結果：通過，9 tests。覆蓋固定 Feature ID uniqueness、Feature ID 084 對應謄本工作台、dev-log API 依 feature.id 取資料、dev-log 頁面讀取 Feature ID。

```bash
npm test --workspace superadmin -- --runInBand components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx --forceExit
```

結果：通過，10 tests。覆蓋 active parser/reviewer 各自計時與完成後 report link。

```bash
npm test --workspace superadmin -- --runInBand lib/transcript-parse/__tests__/intake-review-merge.test.ts components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx lib/transcript-parse/__tests__/intake-ai.test.ts --forceExit
```

結果：通過，17 tests。覆蓋 reviewer confidence calibration 與 fallback reviewer 補位。

```bash
npm test --workspace superadmin -- --runInBand lib/utils/concurrent-success-runner.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts lib/transcript-parse/__tests__/intake-ai.test.ts components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx --forceExit
```

結果：通過，24 tests。覆蓋達標後不等待 non-cooperative inflight parser、parse trace 子階段與工作台品質追蹤。

```bash
npm test --workspace superadmin -- --runInBand lib/ai/__tests__/agent-defaults.test.ts lib/ai/__tests__/resolve-agent-model.test.ts lib/transcript-parse/__tests__/intake-ai.test.ts --forceExit
```

結果：通過，61 tests。覆蓋 `transcript_audit` 不再使用 GPT-5.5，且 OpenAI GPT-5.3 仍作 fallback。

```bash
npx tsc --noEmit --project apps/superadmin/tsconfig.json
npx eslint ...
git diff --check
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/migrations/20260428110000_replace_transcript_audit_gpt55.sql
```

結果：通過。migration 已套用本機 DB，`transcript_audit` primary 已改為 `anthropic/claude-opus-4-5-20251101`。

## 更新檔案索引

- DEV-SPEC：`/project-process/features/transcript-intake-workbench-dev-spec-20260427.md`
- TDD-SPEC：`/project-process/features/tdd-transcript-intake-workbench-20260427.md`
- TDD Progress Report：`/project-process/test-logs/test-transcript-intake-workbench-2026-04-28.md`
- Development Log Summary：`/project-process/dev-logs/084-development-log-summary.md`
- Roadmap：`/apps/superadmin/app/data/roadmap.ts`

## 2026-04-29 Sprint 3 登記與預計驗證

### 本日完成任務清單

- 完成今日開發前任務登記：Feature ID 084，Sprint 3「逐頁文件分類與正式/參考來源分流」，狀態 In Progress。
- 確認儀表板 URL 在未登入 Playwright session 會導向登入頁；以 `roadmap.ts` 固定 ID、Feature 名稱與文件路徑作任務真值。
- 補 DEV-SPEC、TDD-SPEC、Development Log Summary 與 Handoff 的 Sprint 3 狀態。

### 交付物與完成度

- 進度文件同步：100%。
- Page classifier / parser source split / cross-check 實作：0%，待今日開發完成後補測試結果。

### 遭遇困難與根因分析

- 無登入狀態無法直接在 Dashboard 讀取任務卡。
  - 根因：Playwright CLI session 沒有 superadmin cookie。
  - 處理：依 guide 規則使用 `roadmap.ts` 固定 Feature ID `084`，並核對文件路徑與現有 unit/e2e 目錄。
- 混合文件會把調查報告與謄本放在同一 PDF。
  - 根因：現有 detector 以文件層級為主，沒有正式/參考來源分層。
  - 處理：新增 page-level classifier 與 source trust contract 作為今日實作目標。

### 踩雷事件與預防指標

- 若 `route_decision` 沒有 page-level roles，混合 PDF 仍可能把參考頁面當正式謄本來源。
- 若明細列沒有 `sourcePage` 與 `sourceTrust`，人工確認時無法追溯坪數來源。
- 若不動產說明書坪數直接寫入 canonical details，代表正式/參考來源分流失效。

### 下次避免措施

- 所有混合文件解析都先做頁面分類，再進 parser。
- Detail Builder 必須以 `authoritative` 來源作正式值；`reference_only` 只產生差異警示。
- 測試需固定覆蓋「謄本 + 不動產說明書 + 橫躺頁」的混合情境。

### 明日優先工作項目與預估工時

- P0：完成 page classifier 與 route decision schema，預估 3 小時。
- P0：完成 parser/detail builder 的 authoritative/reference 分流，預估 4 小時。
- P1：補 UI 分類摘要與坪數差異警示，預估 3 小時。
- P1：補混合文件 regression，預估 2 小時。

## 2026-04-29 Sprint 3 測試結果

### 本日完成任務清單

- 新增 `intake-page-classifier.test.ts`，覆蓋混合 PDF、掃描 PDF placeholder、權狀影像 fallback、橫向文字方向提示與 PDF form-feed 分頁。
- 更新 route API test，驗證建立 run 時會寫入 `pages`、`pageRole` 與 `sourceTrust`。
- 重跑 process worker 與 area detail editor targeted tests，確認新增 `sourceTrust` 沒破壞既有明細流程。

### 交付物與完成度

- 測試完成度：100% for Sprint 3 第一版 targeted scope。
- 結果：4 suites / 20 tests 全部通過。

### 遭遇困難與根因分析

- 初次執行使用 repo-root 路徑，Jest workspace 將 `apps/superadmin` 重複接到路徑前方。
- 修正後改用 workspace 內相對路徑。

### 踩雷事件與預防指標

- classifier 初版把「建物標示」當成權狀 marker，造成建物謄本誤分類。
- 已改為使用更明確的「建物所有權狀」「建物權狀」「權狀字號」判斷權狀。

### 下次避免措施

- 權狀/謄本 marker 需保持保守，不能用兩者都會出現的標示欄位作唯一判斷。
- 後續加入真實混合 PDF fixture 後，需把 reference_only 頁不能進明細列列為 regression。

### 明日優先工作項目與預估工時

- 補實機混合 PDF end-to-end 驗證：2h。
- 補 reference_only 坪數差異警示測試：2h。
- 補 page jump / evidence preview 測試：2h。

### 實際執行命令

```bash
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/intake-page-classifier.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts components/admin/properties/__tests__/TranscriptIntakeAreaDetailEditor.test.tsx --runInBand --forceExit
npx tsc --noEmit
bash tools/testing/validate-test-manifest.sh
git diff --check
```

## 2026-04-29 車位建物坪數修正驗證

### 本日完成任務清單

- 新增 confirmed area detail regression，覆蓋車位建物外層 `groupShareRatio`。
- 用實際案例數字驗證：`(8.77 + 6.20 + 1278.17*1745/100000 + 1017.71*9999/10000) * 2/84 = 25.12㎡`。

### 交付物與完成度

- 測試完成度：100%。
- `BuildingLandAreaDetailTab.test.tsx` 通過 28 tests。

### 遭遇困難與根因分析

- 原測試只驗證列內 shareRatio，沒有覆蓋車位建物整體權利範圍。

### 踩雷事件與預防指標

- 車位共有部分 row 的 shareRatio 不是最終持分，還需要乘上車位所有權部的權利範圍。

### 下次避免措施

- 車位建物 regression 必須同時含主建物、附屬建物、共有部分與整體權利範圍。

### 明日優先工作項目與預估工時

- 補批次資料檢查與修復：2h。

### 實際執行命令

```bash
npm test --workspace superadmin -- --runTestsByPath components/admin/properties/__tests__/BuildingLandAreaDetailTab.test.tsx --runInBand --forceExit
npx tsc --noEmit
git diff --check
```

## 2026-04-29 Detect / Detail Builder Fallback 驗證

### 本日完成任務清單

- 新增 Detect fallback regression，覆蓋第一個 VLM 回傳畸形 JSON、第二個 VLM 接手成功。
- 新增 Detail Builder fallback regression，覆蓋第一個 VLM 回傳畸形 JSON、第二個 VLM 產生合法 area detail draft。
- 新增 JSON extractor regression，覆蓋字串內 `{}` 與 markdown fenced JSON trailing comma。
- 重跑 process worker tests，確認 AI trace model event 整合未破壞既有流程。

### 交付物與完成度

- 測試完成度：100%。
- 結果：3 suites / 17 tests 全部通過。

### 遭遇困難與根因分析

- 根因不是 provider safety block，而是單一模型輸出畸形 JSON 後原流程缺少候補模型。

### 踩雷事件與預防指標

- `Unterminated string in JSON` 應列為輸出格式錯誤與候補模型觸發條件，不應被解讀為惡意流量。

### 下次避免措施

- Detect / Detail Builder 的模型鏈行為需與 Review 一樣納入 `intake-ai.test.ts`。
- JSON 抽取器新增案例時，優先測可安全修復的格式錯誤；不對截斷內容做猜測補全。

### 明日優先工作項目與預估工時

- 補實機 trace screenshot 或資料庫 snapshot 驗證：1h。

### 實際執行命令

```bash
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/intake-ai.test.ts --runInBand --forceExit
npm test --workspace superadmin -- --runTestsByPath lib/utils/__tests__/ai-api-callers.test.ts --runInBand --forceExit
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --forceExit
cd apps/superadmin && npx tsc --noEmit
git diff --check
```

## 2026-04-29 No Processor Seed 草稿驗證

### 本日完成任務清單

- 更新 process worker regression，確認 Detect AI 全部候選失敗時 run failed，且不寫入 detection_result。
- 新增 Verify / Review 全部候選失敗 regression，確認不寫入 seeded review，也不進入 `needs_user_confirmation`。
- 新增 Detail Builder 全部候選失敗 regression，確認不寫入 seeded area detail draft，也不進入 `needs_user_confirmation`。
- 重跑工作台 UI 測試，確認失敗 trace 顯示仍相容。

### 交付物與完成度

- 測試完成度：100%。
- 結果：2 suites / 20 tests 全部通過。

### 遭遇困難與根因分析

- 原 processor seed 測試需要反向改為 no fabricated data policy，避免未來又把 AI 全失敗改回假草稿。

### 踩雷事件與預防指標

- AI 全部失敗後若仍可按「儲存解析結果」，即為高風險缺陷。

### 下次避免措施

- 高風險謄本資料只能來自真實文件解析或使用者人工輸入；不能由 failure fallback 自動推測。

### 實際執行命令

```bash
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --forceExit
npm test --workspace superadmin -- --runTestsByPath components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --runInBand --forceExit
cd apps/superadmin && npx tsc --noEmit
git diff --check
```

## 2026-04-29 AI 報告制式規格驗證

### 本日完成任務清單

- 新增 `standardReport` 型別與 normalizer，覆蓋 Parser、Verify / Review、Detail Builder 三階段。
- 新增 consensus matrix regression，確認欄位可分類為 100% 相同、多數相同、單一來源、全部不同與人工審核。
- 更新 process worker regression，確認 parserReports 會保存 `standardReport` 並產生新版六段式 Markdown。
- 重跑 intake AI fallback tests，確認新增 optional report 欄位不破壞既有 Detect / Review / Detail Builder chain。

### 交付物與完成度

- 測試完成度：100%。
- 結果：3 suites / 14 tests 全部通過。

### 踩雷事件與預防指標

- 數字字串需正規化；`88.5` 與 `88.50` 應視為同值。
- 若 reviewer/detail builder 只收到 Markdown，無法可靠計算模型間欄位共識。

### 實際執行命令

```bash
npm test --workspace superadmin -- lib/transcript-parse/__tests__/report-standard.test.ts lib/transcript-parse/__tests__/intake-ai.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand
npx tsc --noEmit --project apps/superadmin/tsconfig.json
```

## 2026-04-29 Detect 候補狀態與 Gemini Flash 移除驗證

### 本日完成任務清單

- 更新 AI 品質追蹤 component regression，確認 Detect 單一模型成功時，其他 pending 模型顯示為 `候補未執行`。
- 重跑 agent defaults regression，確認 transcript detection factory default 不再使用 `gemini-2.0-flash`。
- 重跑 intake AI 與 process worker regression，確認 fallback chain event 與 trace 不受 UI label 調整影響。
- 套用本機 DB migration，確認 `transcript_detection` fallback 第三順位已改為 `gemini-1.5-pro`。

### 交付物與完成度

- 測試完成度：100%。
- 結果：4 suites / 73 tests 全部通過。

### 實際執行命令

```bash
npm test --workspace superadmin -- components/admin/properties/__tests__/TranscriptAiStageTracePanel.test.tsx lib/ai/__tests__/agent-defaults.test.ts lib/transcript-parse/__tests__/intake-ai.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --forceExit
npx tsc --noEmit --project apps/superadmin/tsconfig.json
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/migrations/20260429120000_replace_transcript_detection_gemini_flash.sql
```
