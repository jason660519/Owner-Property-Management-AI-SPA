# Handoff：Feature ID 084 統一謄本解析工作台

日期：2026-04-27

## 狀態

已完成 contract、routing、PDF text probe、prompt seed、DB migration、intake run API、worker、真正 AI detect/review stage、工作台 UI 面板、人工確認 confirmed_result、confirmed result 同步到 property details 與 targeted tests。

2026-04-29 Sprint 3 狀態：In Review。已新增逐頁文件分類、正式/參考來源分流、橫躺頁方向提示與明細來源信任標記，讓混合不動產說明書/調查報告/電傳謄本的單一 PDF 不會直接污染正式明細。Detect 與 Detail Builder 已改為 agent chain 依序 fallback；全部候選 AI 失敗時會標記 run failed，不再產生 processor seed 草稿。

## 已改檔案

- `apps/superadmin/lib/transcript-parse/intake-types.ts`
- `apps/superadmin/lib/transcript-parse/intake-page-classifier.ts`
- `apps/superadmin/lib/transcript-parse/intake-router.ts`
- `apps/superadmin/lib/transcript-parse/transcript-pdf-probe.ts`
- `apps/superadmin/lib/transcript-parse/intake-prompts.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-router.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-router.samples.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-page-classifier.test.ts`
- `apps/superadmin/lib/ai/ensure-seeded.ts`
- `apps/superadmin/components/prompt-management/seedDefaultPrompts.ts`
- `apps/superadmin/app/api/transcript-intake/runs/route.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/route.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/process/route.ts`
- `apps/superadmin/app/api/cron/transcript-intake-runs/route.ts`
- `apps/superadmin/lib/transcript-parse/intake-ai.ts`
- `apps/superadmin/lib/transcript-parse/confirmed-result-to-property-details.ts`
- `apps/superadmin/lib/transcript-parse/process-transcript-intake-run.ts`
- `apps/superadmin/lib/transcript-parse/intake-area-details.ts`
- `apps/superadmin/lib/transcript-prompts.ts`
- `apps/superadmin/components/admin/properties/TranscriptIntakeWorkbench.tsx`
- `apps/superadmin/components/admin/properties/TranscriptTechnicalRoutePanel.tsx`
- `apps/superadmin/components/admin/properties/TranscriptIntakeAreaDetailEditor.tsx`
- `apps/superadmin/components/admin/properties/TranscriptTabContent.tsx`
- `apps/superadmin/app/api/transcript-intake/runs/__tests__/route.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/__tests__/route.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts`
- `apps/superadmin/components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx`
- `supabase/migrations/20260427100000_create_transcript_intake_runs.sql`
- `supabase/migrations/20260429100000_strengthen_transcript_source_trust_prompts.sql`

## 注意事項

- 建立 intake run 時會先對 PDF 做文字層 probe，再交由 `intake-router` 做路由判斷。
- `transcript_intake_runs` 暫由後續 API/worker 寫入。
- `POST /api/transcript-intake/runs/:id/process` 會透過 `after()` 啟動 worker。
- `GET /api/cron/transcript-intake-runs` 可 drain 一筆最舊的 `route_selected` run。
- Worker 會先呼叫 AI detect/review/detail_builder；Detect 與 Detail Builder 會依序嘗試最多 4 個候選模型，全部失敗時標記 run failed 並保留模型錯誤。
- Verify / Review 全部候選 AI 失敗時也會標記 run failed，不產生 seeded review。
- 視覺輸入仍以第一份文件作主要輸入，其他文件透過 context JSON 輔助。
- 工作台 UI 現已可確認並儲存 confirmed_result；尚未提供欄位級修正。
- confirm API 會同步 property details，建物土地面積明細表會讀取同步後的 transcript details。
- 新 prompt module keys：
  - `transcript.intake.detect`
  - `transcript.intake.parse`
  - `transcript.intake.review`
- `route_decision.documents[].pages[]` 是 Sprint 3 之後的頁面分類契約；舊 run 沒有此欄位時，UI 必須保留 fallback。
- `sourceTrust=authoritative` 才可作正式明細來源；`reference_only` 只用於差異警示或人工確認。

## 建議下一步

1. 用真實混合 PDF 跑 end-to-end，確認 detect/parse/review/detail_builder 都遵守 `sourceTrust`。
2. 將不動產說明書與調查報告的坪數改為 cross-check warning，不直接寫入 canonical details。
3. 補 reference_only 坪數差異 UI 與人工確認文案。
4. 保留 `local_python_text` route 的後續 parse engine 拆分與 bbox 紅框作為後續工作。
