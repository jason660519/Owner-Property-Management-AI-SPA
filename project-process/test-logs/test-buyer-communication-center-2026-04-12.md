# Row 012 TDD Progress Report — 買家的溝通中心

- 日期：2026-04-12
- Row ID：012
- 功能：買家的溝通中心

## 主要實作變更

1. `apps/web/app/(dashboard)/buyer/contracted/communication/page.tsx`
   - 新增買家溝通中心頁面（訊息列表、已讀回條、關鍵字/日期搜尋、附件上傳、系統通知）
2. `apps/web/lib/buyer-communication/utils.ts`
   - 新增附件驗證、訊息過濾、已讀回條格式化工具
3. `apps/web/app/(dashboard)/buyer/contracted/dashboard/page.tsx`
   - 新增「前往溝通中心」導流入口
4. `apps/web/lib/buyer-communication/__tests__/utils.test.ts`
   - 補齊 Row 012 的單元測試

## 測試範圍與案例

### Unit（已執行）

`apps/web/lib/buyer-communication/__tests__/utils.test.ts`

1. 附件驗證
   - 合法格式（PDF/JPG）與大小 < 10MB 會通過
   - 超過 10MB 會被阻擋
   - 不支援 MIME type 會被阻擋
2. 訊息過濾
   - 關鍵字可匹配 subject/content/sender
   - 日期區間採含頭含尾
3. 已讀回條
   - 未讀顯示「未讀」
   - 已讀顯示「已讀 + 時間」

### E2E（待補）

本次先完成前端與單元測試，E2E 待在具登入 session 的環境補上：

1. 買家登入後進入 `/buyer/contracted/communication`
2. 上傳 PDF 後送出，確認訊息含附件標記
3. 讀取訊息後，列表回條由未讀變為已讀
4. 以日期範圍搜尋訊息歷史

## 測試執行結果

1. `npm run test --workspace web -- buyer-communication`
   - 目標：驗證 Row 012 新增工具函式
   - 結果：通過（無失敗重跑）

## 失敗重試與修正紀錄

本次無測試失敗重跑。
