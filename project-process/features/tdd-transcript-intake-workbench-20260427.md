# 統一謄本解析工作台 TDD Spec

日期：2026-04-27  
Feature ID：084

## 測試策略

第一階段先測穩定 contract 與 deterministic routing，避免後續 UI 與 worker 依賴不穩定。

## Unit Tests

- `intake-router` 能辨識 PDF、圖片、JSON、文字檔。
- PDF 有足夠繁中謄本標記時走 `local_python_text`。
- PDF 文字層稀疏或非謄本內容時走 `vlm_visual`。
- 真實 PDF 樣本需覆蓋可文字解析謄本、影像型權狀影本、非謄本文字 PDF 三種 routing regression。
- 圖片檔固定走 `vlm_visual`。
- JSON 固定走 `structured_json`。
- prompt seed 包含新工作台三段 prompt。
- intake worker 能 claim run 並推進到 `needs_user_confirmation`。
- intake worker 在 parse 失敗時標記 run failed。
- intake worker 會呼叫 AI detect/review stage。
- AI detect/review 失敗時 fallback 到 seed，不中斷整個 run。
- process API 需要 superadmin auth，成功後透過 `after()` 啟動 worker。
- 工作台 UI 會顯示空狀態、建立 run，並呼叫 process endpoint。
- confirm API 只確認 `needs_user_confirmation` run 並寫入 confirmed_result。
- confirmed result mapper 會輸出建物、土地、車位與車位產權的 property details patch。
- confirm API 會同步 property details，讓建物土地面積明細表讀取確認後資料。
- 工作台 UI 可觸發確認並顯示成功訊息。

## Integration Tests

後續實作 queue worker 後補：

- 建立 intake run。
- 多文件來源寫入 `source_document_ids`。
- detect、parse、review 階段逐步更新 DB status。
- failed 狀態保留 error_message。
- user confirmation 後寫入 confirmed_result 並同步 property details。

## E2E Tests

後續 UI 完成後補：

- User 上傳掃描 PDF 後看到 VLM 路由。
- User 上傳文字層 PDF 後看到 Python 路由。
- User 可確認車位產權複選結果。
- 儲存後建物土地明細表可讀到已確認結果。

## 驗收標準

- User 不需要先手動選建物、土地或車位類別。
- 系統可解釋為何選 Python 或 VLM。
- AI review 能標示需要人工確認的欄位。
- 未確認結果不覆蓋 canonical transcript data。

## 2026-04-28 TDD 增量

### 新增測試範圍

- 權狀 route regression。
  - `building_title`、`land_title` 需被納入可解析文件型態。
  - 影像權狀需走 `vlm_visual`，PDF 權狀需優先走 VLM 而不是傳統謄本文字層 parser。
- 多選與預覽同步。
  - 勾選多份文件時右側預覽需顯示所有勾選文件。
  - 取消勾選時左側狀態與右側預覽需同步消失。
- Parser / Reviewer per-model timer。
  - active parser badge 需各自顯示工作中秒數。
  - active reviewer badge 需各自顯示工作中秒數。
  - 完成後需保留各模型耗時與報告 URL。
- 併發 runner fallback。
  - 目標成功數達成後，不得等待不理 abort signal 的 inflight provider。
  - 失敗模型需保留 error badge 與報告入口，不得阻斷已達標流程。
- Reviewer confidence calibration。
  - reviewer 有 blocking evidence 時，UI 顯示應為「審查信心」。
  - confidence 不得把 parser 原始結果錯誤直接解讀成 reviewer 自身低信心。
- Agent defaults。
  - `transcript_audit` 預設前三順位不得再包含 `openai/gpt-5.5`。
  - OpenAI fallback 應使用 `gpt-5.3-chat-latest`。
- AI reports。
  - Parser report 需能讀取 `ocr_parse_results` raw output。
  - Reviewer report 需能讀取 `review_result.reviewerReports`。
  - Detail builder report 需能呈現四大明細與人工確認項目。
- Confirm to area detail。
  - User 確認後，`building_land_area_detail` 必須讀取與謄本工作台一致的 area detail draft。

### 2026-04-28 已執行測試

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

### 尚待補強

- 權狀影本 fixture 需補固定遮罩樣本，避免只靠實機手動上傳驗證。
- Provider compatibility smoke test 需自動化，避免 MIME 或 JSON schema 問題進入正式 agent chain。
- 精準 bbox 紅框需等 parser/reviewer/detail_builder 輸出欄位座標後補 E2E 驗收。

## 2026-04-29 Sprint 3 TDD 增量

狀態：In Review。

### 新增測試範圍

- Page classifier contract。
  - 混合文件可輸出逐頁 `pageRole`、`sourceTrust`、`orientation` 與 `confidence`。
  - 謄本/權狀頁應標記為 `authoritative`。
  - 不動產說明書與物件調查報告應標記為 `reference_only`，不可成為正式明細來源。
- Parser 分流。
  - worker 只把 `authoritative` 頁送入正式 parse/detail builder。
  - 參考頁只能產生坪數差異警示，不得覆蓋 `buildingAreas`、`landShareAreas`、`parkingBuildingAreas` 或 `parkingLandShareAreas`。
- 坪數校驗。
  - 平方公尺轉坪數需保留合理小數精度。
  - 系統現有明細、謄本換算坪數與參考文件坪數差異超過門檻時列入 `needsUserConfirmation`。
- UI 呈現。
  - 工作台需顯示正式來源頁、參考來源頁、忽略頁與人工確認警示。

### 今日預計執行測試

```bash
npm test --workspace superadmin -- --runInBand lib/transcript-parse/__tests__/intake-page-classifier.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx --forceExit
```

結果：已改用下列 targeted run，通過 20 tests。

```bash
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/intake-page-classifier.test.ts app/api/transcript-intake/runs/__tests__/route.test.ts lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts components/admin/properties/__tests__/TranscriptIntakeAreaDetailEditor.test.tsx --runInBand --forceExit
```

補充驗證：

```bash
npx tsc --noEmit
bash tools/testing/validate-test-manifest.sh
git diff --check
```

結果：全部通過。

## 2026-04-29 AI Fallback TDD 增量

狀態：In Review。

### 新增測試範圍

- Detect fallback chain。
  - 第一個 VLM 回傳畸形 JSON 時，必須記錄失敗並嘗試下一個候選模型。
  - 成功候選的 detection result 必須正常 normalize。
- Detail Builder fallback chain。
  - 第一個 VLM 回傳畸形 JSON 時，必須記錄失敗並嘗試下一個候選模型。
  - 成功候選的 area detail draft 必須正常 normalize。
- JSON output extractor。
  - 字串欄位內含 `{}` 時不得提早截斷 JSON。
  - Markdown fence 中常見 trailing comma 可保守修復。
- Processor trace。
  - Detect / Detail Builder model event 必須進入 AI 品質追蹤模型狀態。
- No fabricated seed data。
  - Detect / Verify Review / Detail Builder 全部候選 AI 失敗時，run 必須標記 failed。
  - 不得建立 seeded detection、seeded review 或 parser seed detail draft 讓 user 誤以為可儲存。

### 今日執行測試

```bash
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/intake-ai.test.ts --runInBand --forceExit
npm test --workspace superadmin -- --runTestsByPath lib/utils/__tests__/ai-api-callers.test.ts --runInBand --forceExit
npm test --workspace superadmin -- --runTestsByPath lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts --runInBand --forceExit
cd apps/superadmin && npx tsc --noEmit
git diff --check
```

結果：全部通過；`intake-ai` 3 tests、`ai-api-callers` 4 tests、`process-transcript-intake-run` 10 tests。
