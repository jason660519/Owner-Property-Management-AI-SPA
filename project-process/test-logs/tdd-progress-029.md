# TDD Progress Report — Row 029 房東預約看房管理

- 日期：2026-04-14
- 對應 Issue：VIS-92（驗證測試與進度紀錄）
- 範圍：`web/landlord/appointments`、通知與月曆共用邏輯
- 相關規格：`/project-process/features/tdd-landlord-20260221.md`（T-08, T-09）
- 既有實作說明（2026-04-12）：`/project-process/test-logs/test-landlord-viewing-appointments-2026-04-12.md`

## 本輪（驗證）變更的檔案

- 新增本檔：`project-process/test-logs/tdd-progress-029.md`（TDD 進度與測試結果彙總）

程式碼與測試檔於先前迭代已就緒；本輪未修改應用程式邏輯。

## 實作基線（已存在於 main）

| 區塊 | 路徑 |
|------|------|
| 預約狀態 API | `apps/web/app/api/landlord/appointments/[id]/route.ts` |
| 訪客通知 | `apps/web/lib/landlord/appointment-notifications.ts` |
| 月曆資料 | `apps/web/lib/landlord/appointment-calendar.ts` |
| 月曆 UI | `apps/web/components/landlord/AppointmentCalendar.tsx` |
| 房東預約頁 | `apps/web/app/(dashboard)/landlord/appointments/page.tsx` |

## 測試範圍

- `apps/web/lib/landlord/__tests__/appointment-notifications.test.ts` — 確認／取消通知主旨、內容與取消原因
- `apps/web/lib/landlord/__tests__/appointment-calendar.test.ts` — 月曆週範圍、同日時段排序

執行指令（與 `apps/superadmin/unit_test/029/README.md` 一致）：

```bash
npm run test --workspace web -- lib/landlord/__tests__/appointment-notifications.test.ts lib/landlord/__tests__/appointment-calendar.test.ts --runInBand
```

## 測試執行結果（2026-04-14）

| 項目 | 結果 |
|------|------|
| Test Suites | 2 passed / 2 total |
| Tests | 4 passed / 4 total |
| 總耗時（Jest 報表） | ~64 s |

備註：Jest 結束後曾出現「did not exit one second after the test run」提示（可能為未關閉的非測試 async handle）；程序仍以 **exit code 0** 結束，測試斷言全數通過。若 CI 需嚴格乾淨退出，可後續以 `--detectOpenHandles` 追查。

## 摘要

- Row 029 兩支房東預約相關單元測試在共用 workspace 上 **全綠**。
- TDD 文件與 `unit_test/029` 說明對齊；E2E 仍依 `apps/superadmin/e2e/029/README.md` 規劃，待 CI／Playwright 條件執行。
