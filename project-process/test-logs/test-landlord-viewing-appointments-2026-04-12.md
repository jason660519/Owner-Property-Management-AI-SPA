# TDD Progress Report — 房東預約看房管理（Row 029）

- 日期：2026-04-12
- 範圍：`web/landlord/appointments`
- 對應 TDD Spec：`/project-process/features/tdd-landlord-20260221.md`（T-08, T-09）

## 主要實作變更

1. `apps/web/app/api/landlord/appointments/[id]/route.ts`
- 新增狀態值驗證。
- 更新預約狀態後，若為 `confirmed/cancelled/completed` 且訪客有 Email，觸發通知信。
- 回傳 `emailSent` 旗標，便於前端與後續驗證。

2. `apps/web/lib/landlord/appointment-notifications.ts`
- 新增看房預約狀態通知信模板與寄送函式。
- 支援取消原因（feedback）顯示。

3. `apps/web/components/landlord/AppointmentCalendar.tsx`
- 新增月曆視圖，顯示每日預約筆數與時段摘要。

4. `apps/web/app/(dashboard)/landlord/appointments/page.tsx`
- 整合月曆元件到房東預約頁。
- 狀態更新 API 帶入 `feedback`；取消預約時可輸入原因。

5. `apps/web/lib/landlord/appointment-calendar.ts`
- 抽出月曆資料計算與依日期分組邏輯，供 UI 與測試共用。

## 測試範圍與案例

### Unit / Integration

- `apps/web/lib/landlord/__tests__/appointment-notifications.test.ts`
1. 確認狀態會寄送正確主旨與收件資訊。
2. 取消狀態會在信件內容帶入取消原因。

- `apps/web/lib/landlord/__tests__/appointment-calendar.test.ts`
1. 月曆日期矩陣會覆蓋完整週範圍。
2. 同日預約會依時段排序。

### E2E 規劃（待 CI 條件）

- `apps/superadmin/e2e/029/README.md` 已記錄驗收場景：
1. 房東確認預約後通知送出。
2. 月曆顯示同日多時段預約。

## 測試執行結果

- 已執行：
```bash
npm run test --workspace web -- lib/landlord/__tests__/appointment-notifications.test.ts lib/landlord/__tests__/appointment-calendar.test.ts --runInBand
```
- 結果：2 個測試檔全數通過。
- 失敗重試與修正：
1. 初版缺少 `lib/landlord` 目錄，建立目錄後重新執行通過。

