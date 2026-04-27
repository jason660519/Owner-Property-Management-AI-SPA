# Handoff：Row 085 統一謄本解析工作台

日期：2026-04-27

## 狀態

已完成 contract、routing、PDF text probe、prompt seed、DB migration、intake run API、worker、真正 AI detect/review stage、工作台 UI 面板、人工確認 confirmed_result、confirmed result 同步到 property details 與 targeted tests。

## 已改檔案

- `apps/superadmin/lib/transcript-parse/intake-types.ts`
- `apps/superadmin/lib/transcript-parse/intake-router.ts`
- `apps/superadmin/lib/transcript-parse/transcript-pdf-probe.ts`
- `apps/superadmin/lib/transcript-parse/intake-prompts.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-router.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/intake-router.samples.test.ts`
- `apps/superadmin/lib/ai/ensure-seeded.ts`
- `apps/superadmin/components/prompt-management/seedDefaultPrompts.ts`
- `apps/superadmin/app/api/transcript-intake/runs/route.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/route.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/process/route.ts`
- `apps/superadmin/app/api/cron/transcript-intake-runs/route.ts`
- `apps/superadmin/lib/transcript-parse/intake-ai.ts`
- `apps/superadmin/lib/transcript-parse/confirmed-result-to-property-details.ts`
- `apps/superadmin/lib/transcript-parse/process-transcript-intake-run.ts`
- `apps/superadmin/components/admin/properties/TranscriptIntakeWorkbench.tsx`
- `apps/superadmin/components/admin/properties/TranscriptTabContent.tsx`
- `apps/superadmin/app/api/transcript-intake/runs/__tests__/route.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/__tests__/route.test.ts`
- `apps/superadmin/app/api/transcript-intake/runs/[id]/process/__tests__/route.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/process-transcript-intake-run.test.ts`
- `apps/superadmin/lib/transcript-parse/__tests__/confirmed-result-to-property-details.test.ts`
- `apps/superadmin/components/admin/properties/__tests__/TranscriptIntakeWorkbench.test.tsx`
- `supabase/migrations/20260427100000_create_transcript_intake_runs.sql`

## 注意事項

- 建立 intake run 時會先對 PDF 做文字層 probe，再交由 `intake-router` 做路由判斷。
- `transcript_intake_runs` 暫由後續 API/worker 寫入。
- `POST /api/transcript-intake/runs/:id/process` 會透過 `after()` 啟動 worker。
- `GET /api/cron/transcript-intake-runs` 可 drain 一筆最舊的 `route_selected` run。
- Worker 會先呼叫 AI detect/review；失敗時 fallback 到 processor seed。
- detect/review 目前是單模型，且以第一份文件作主要視覺輸入。
- 工作台 UI 現已可確認並儲存 confirmed_result；尚未提供欄位級修正。
- confirm API 會同步 property details，建物土地面積明細表會讀取同步後的 transcript details。
- 新 prompt module keys：
  - `transcript.intake.detect`
  - `transcript.intake.parse`
  - `transcript.intake.review`

## 建議下一步

1. 將 `local_python_text` route 的後續 parse engine 從既有 cloud parse core 拆出。
2. 視需要補多文件逐份 detect/review。
3. 補欄位級人工修正 confirmed result。
