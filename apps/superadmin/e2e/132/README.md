# ID 132 E2E Tests

對應任務：`超級管理員-尋人資料庫：精準搜尋與來源可追溯升級（ID 132）`

建議放置：

- `e2e/132/people-db-search-exact-match.spec.ts`
- `e2e/132/people-db-source-traceability.spec.ts`
- `e2e/132/people-db-dataset-filter.spec.ts`
- `e2e/132/people-db-id132-acceptance.spec.ts`

範圍：

- 電話與身分證 exact-first 搜尋命中
- 多資料集勾選篩選
- 搜尋結果來源追溯欄位顯示
- 匯入台帳可視化與批次資訊

執行方式：

```bash
cd apps/superadmin
npx playwright test e2e/132
```
