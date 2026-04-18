# TDD 規格 — Row 144 樹狀資料來源管理 + 進階關聯分析

**Row ID**：144
**建立日期**：2026/04/17
**對應 Dev Spec**：[people-db-dataset-tree-dev-spec-20260417.md](./people-db-dataset-tree-dev-spec-20260417.md)
**測試框架**：pytest（backend）/ vitest（frontend unit）/ Playwright（E2E）

---

## 一、單元測試（Unit Tests）

### 1.1 Backend（`backend/ocr_service/tests/unit/`）

| 測試案例 | 檔案 | 斷言 |
|---|---|---|
| `test_dataset_tree_builder_nests_subpaths` | `test_people_db_dataset_tree.py` | 平鋪 dataset_path list → 正確組出樹狀結構（含父子 count 累加） |
| `test_dataset_tree_returns_metadata_fields` | 同上 | 每節點包含 `count / last_imported_at / quality_avg / favorited / enabled` |
| `test_address_normalize_tw_addresses` | `test_address_normalizer.py` | `台北市大安區忠孝東路四段1號` → 拆分正確 tokens；別名（台北 / 臺北 / 大安 / 大安區）統一 |
| `test_dataset_merge_rewrites_es_data_source` | `test_dataset_admin.py` | merge(src, dst) 呼叫 `_update_by_query` 使用正確 painless script |
| `test_dataset_path_prefix_filter_builds_bool_query` | `test_people_db_search_strategy.py` | 勾選父節點 `企業名錄` → ES query 含 `{"prefix": {"dataset_path": "企業名錄/"}}` |

### 1.2 Frontend（`apps/superadmin/unit_test/144/`）

| 測試案例 | 檔案 | 斷言 |
|---|---|---|
| `DatasetTreePanel.test.tsx` | 同目錄 | 給定樹狀 JSON → 正確 render 嵌套節點；點擊父節點 checkbox 連動子節點 |
| `DatasetTreePanel.scope-hint.test.tsx` | 同目錄 | 勾選超過 500K 筆 → 顯示「越少越快」警示 banner |
| `SourcesAdminPage.test.tsx` | 同目錄 | 重新命名動作發出 PATCH 請求；合併動作需二次確認 modal |

---

## 二、整合測試（Integration Tests）

| 測試案例 | 檔案 | 斷言 |
|---|---|---|
| `test_dataset_tree_api_contract` | `backend/ocr_service/tests/integration/test_people_db_id144_api.py` | GET `/dataset-tree` 回傳 `{ roots: [...] }` 結構，含必要欄位 |
| `test_dataset_merge_end_to_end` | 同上 | POST `/datasets/merge` → ES 文件 `data_source` 與 `dataset_path` 實際被改寫 |
| `test_person_properties_lookup` | 同上 | GET `/people/{id_number}/properties` 正確 join Postgres `properties` 表 |
| `test_person_relations_same_address` | 同上 | 給定同戶籍地址的兩筆 people_record → relations API 返回彼此為候選親屬 |

---

## 三、E2E 驗收測試（`apps/superadmin/e2e/144/`）

| 案例 | 檔案 | 步驟與斷言 |
|---|---|---|
| `dataset-tree-navigation.spec.ts` | 樹狀面板操作 | 展開 `企業名錄` → 勾選 `2012/三萬企業` → 底部 scope hint 顯示正確筆數 |
| `dataset-admin-rename.spec.ts` | 來源管理 | 重新命名 `謄本資料` → `地政謄本資料` → 搜尋頁樹狀立即反映 |
| `person-detail-properties.spec.ts` | 單人房產反查 | 點擊搜尋結果 `id_number=A123456789` → 詳情頁顯示關聯房產至少 1 筆 |
| `person-detail-relations.spec.ts` | 親友圖譜 | 詳情頁圖譜節點 ≥ 2；hover 顯示推論依據（同戶籍/同電話/同公司） |

---

## 四、Mock 策略

- **ES 操作**：單元測試 mock `AsyncElasticsearch`；整合測試使用真實本地 ES（`http://localhost:9200`）。
- **Postgres**：整合測試使用 Supabase 本地 instance（`http://localhost:54321`）。
- **前端 API**：vitest 以 `msw` 攔截 `/api/people-db/*`；E2E 使用真實 API + seed 腳本。

---

## 五、測試資料 Seed

- `tools/people-db/seed-es-sample.sh` 擴充：支援 `--dataset-root` 與 `--dataset-subpath` 參數
- 新增 `tools/people-db/seed-hierarchy-sample.sh`：一次建立 3 層樹狀測試資料（企業名錄/2012/三萬企業 + 北市稅籍/2013大安區 + 台北市里長）

---

## 六、涵蓋率目標

| 類型 | 目標 |
|---|---|
| 單元測試 | ≥ 85% |
| 整合測試 | 新 API 100% |
| E2E 測試 | 4 條核心路徑全綠 |
