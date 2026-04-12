# ID 132 Unit/Integration Tests

對應任務：`超級管理員-尋人資料庫：精準搜尋與來源可追溯升級（ID 132）`

建議放置：

- `app/superadmin/settings/people-database/search/page.test.tsx`
- `app/api/people-db/[...slug]/route.test.ts`
- `backend/ocr_service/tests/unit/test_people_db.py`
- `backend/ocr_service/tests/integration/test_people_db_id132_api_contract.py`
- `backend/ocr_service/tests/integration/test_people_db_routes.py`

執行方式：

```bash
cd apps/superadmin
npx jest unit_test/132
```
