# ID 029 測試說明（房東預約看房管理）

## 目的

驗證房東端預約看房管理的兩個核心能力：

1. 房東確認/取消預約後，系統會觸發訪客 Email 通知。
2. 日曆視圖可顯示同日已存在的預約時段。

## 對應測試

- `apps/web/lib/landlord/__tests__/appointment-notifications.test.ts`
- `apps/web/lib/landlord/__tests__/appointment-calendar.test.ts`

## 執行方式

```bash
npm run test --workspace web -- lib/landlord/__tests__/appointment-notifications.test.ts lib/landlord/__tests__/appointment-calendar.test.ts --runInBand
```
