# Row 030 Unit / Integration Test Notes

本 Row 的核心邏輯實作於 `apps/web/app/(dashboard)/landlord/customers/`。

## 測試指令

```bash
cd apps/web
npm test -- --runTestsByPath "app/(dashboard)/landlord/customers/__tests__/customer-details.test.ts"
```

## 覆蓋重點

- 備註 JSON 與純文字備註的相容解析。
- 跟進備註寫入時，同步建立時間戳與操作者紀錄。
- 溝通摘要最新 5 筆切片邏輯。
- 舊狀態值（active/inactive）向新狀態值映射。
