# ID 131 測試說明（尋人資料庫單頁工作區）

## 目的

驗證 `/superadmin/settings/people-database` 單頁工作區（匯入 + 搜尋 tab）流程穩定性。

## 對應測試

- Unit/Integration：`apps/superadmin/app/superadmin/settings/people-database/page.test.tsx`
- E2E：`apps/superadmin/e2e/131/people-database-single-page-workspace.spec.ts`

## 依賴的跨 ID 可重用工具

- `tools/people-db/check-es.sh`
- `tools/people-db/seed-es-sample.sh`
- `tools/people-db/convert_taipei_village_chiefs_pdf.py`
