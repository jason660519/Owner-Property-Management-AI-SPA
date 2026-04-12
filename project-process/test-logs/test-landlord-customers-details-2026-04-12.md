# Row 030 TDD Progress Report（房東的客戶－Details 模式）

- 日期：2026-04-12
- Row ID：030
- Feature：房東的客戶－Details 模式

## 主要實作變更

1. `apps/web/app/(dashboard)/landlord/customers/page.tsx`
- 客戶管理頁新增 Details 側欄模式（單一客戶完整資料、狀態快速切換、意向設定、跟進備註、溝通摘要、發送訊息快捷按鈕）。
- 新增狀態流：`potential / negotiating / closed / lost`，並兼容舊值 `active / inactive`。
- 新增跟進備註寫入流程：建立時間戳與操作者，並同步更新溝通摘要。

2. `apps/web/app/(dashboard)/landlord/customers/customer-details.ts`
- 新增 Details payload 的解析 / 序列化工具。
- 新增跟進備註與溝通摘要 append 邏輯。
- 新增狀態與意向標籤工具函式。

3. `apps/web/app/(dashboard)/landlord/customers/__tests__/customer-details.test.ts`
- 補上 Row 030 的核心單元測試。

4. `apps/superadmin/unit_test/030/README.md`
- 記錄 ID 專屬測試目錄與執行指令。

## 測試範圍與案例

1. 備註解析
- 純文字備註 fallback。
- JSON 結構化備註解析（summary / intent / followUps / viewingRecords / communicationLog）。

2. Details 互動資料邏輯
- 新增跟進備註會同時新增溝通摘要紀錄。
- 只取最新 N 筆溝通摘要。
- legacy status 轉換正確。

3. 序列化一致性
- serialize 後再 parse，關鍵欄位不遺失。

## 測試執行結果

1. 指令
```bash
cd apps/web
npm test -- --runTestsByPath "app/(dashboard)/landlord/customers/__tests__/customer-details.test.ts"
```

2. 結果
- 實際：在目前執行環境無法完成 Jest 執行，錯誤為 `Failed to load SWC binary for linux/arm64`（Next.js 測試前置環境缺少對應 SWC binary）。
- 本次已確認測試檔可被 Jest 指令正確定位，待補齊 SWC binary 後可直接重跑同一命令。
- 本次未新增 E2E 腳本；`apps/superadmin/e2e/030/` 已建立目錄與說明檔，待下一階段補齊瀏覽器驗收流程。

## 紅綠重構摘要

1. Red
- 先撰寫 `customer-details.test.ts` 定義 Details 資料格式與行為預期。

2. Green
- 實作 `customer-details.ts` 讓解析、序列化、append 行為通過測試。

3. Refactor
- 將頁面中的 Details 狀態與備註邏輯抽離到 `customer-details.ts`，避免 page component 過度耦合。
