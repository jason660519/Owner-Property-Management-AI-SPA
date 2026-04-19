# Row 145 — People DB Bulk Ingestion 測試索引

> **Row ID**：145 | **建立**：2026/04/19
> **約定**：Row 145 的單元測試**沒有放在這個目錄**，而是 **co-located** 在源碼旁的 `__tests__/`。本檔是路徑索引。

---

## 為什麼測試不放這？

Row 145 的測試套件超過 24 個檔案、跨 6 個 Sprint，依專案 Sprint 4b 與 Row 144 既有慣例採 **co-located 測試**：

- Pure 函式測試 → `apps/superadmin/lib/people-db/__tests__/`
- Parser 測試 → `apps/superadmin/lib/people-db/parsers/__tests__/`
- API route 測試 → `apps/superadmin/app/api/people-db/**/__tests__/`
- React component 測試 → `apps/superadmin/app/superadmin/settings/people-database/**/__tests__/`

`unit_test/145/` 保留作為儀表板「欄8 Unit Test 目錄」的對應路徑、以及未來新加的非 co-located 整合測試之家。

---

## 測試清單對照（截至 2026/04/19）

### Pure 函式（`lib/people-db/__tests__/`）

| 檔案 | 對應 Sprint | Cases |
|:--|:--|:--:|
| `inventory.test.ts` | 1 | 27 |
| `csv-parse.test.ts` | (Row 144 既有) | 11 |
| `dataset-tree.test.ts` | (Row 144 既有) | 7 |
| `address-normalize.test.ts` | (Row 144 既有) | 10 |
| `import-mapper.test.ts` | (Row 144 既有) | 10 |
| `pdf-parse.test.ts` | 3 | 3 |
| `parse-dispatch.test.ts` | (Row 144 既有) | 7 |
| `import-jobs.test.ts` | (Row 144 既有) | 8 |
| `xlsx-parse.test.ts` | (Row 144 既有) | 8 |
| `staging.test.ts` | 4a | 4 |
| `normalize.test.ts` | 4a | 15 |
| `entity-resolution.test.ts` | 4a | 10 |
| `merge-candidates.test.ts` | 4a | 6 |
| `search-strategy.test.ts` | (Row 132 既有) | 8 |
| `search-person-aggregate.test.ts` | 4b | 5 |
| `ingest-orchestrator.test.ts` | 6 | 9 |
| `ocr-pipeline.test.ts`（integration、env-gated）| 3 | 2 (skipped) |

### Parsers（`lib/people-db/parsers/__tests__/`）

| 檔案 | Sprint | Cases |
|:--|:--|:--:|
| `mdb.test.ts` | 2 | 7 |
| `dbf.test.ts` | 2 | 4 |
| `xls.test.ts` | 2 | 5 |
| `dispatch.test.ts` | 2 | 12 |
| `fp-parse.test.ts` | 2 | 8 |
| `pdf-transposed.test.ts` | 3 | 10 |

### API routes（`app/api/people-db/**/__tests__/`）

| Endpoint | Sprint | Cases |
|:--|:--|:--:|
| `ingest/files` | 1 | 5 (manual curl) |
| `ingest/ocr/callback` | 3 | 7 |
| `merge-candidates` | 4a | 7 |
| `merge-candidates/route-embed` | 4b | 6 |
| `search/route-group-by` | 4b | 3 |
| `ingest/retry/[fileId]` | 6 | 5 |

### React components

| 路徑 | Sprint | Cases |
|:--|:--|:--:|
| `settings/people-database/merge-candidates/page.tsx` | 4b | 5 |
| `settings/people-database/search/page.tsx`（toggle）| 4b | 3 |
| `settings/people-database/ingest/page.tsx`（IngestDashboard）| 6 | 3 |

### E2E（`apps/superadmin/e2e/145/`）

| 檔案 | Sprint | Cases |
|:--|:--|:--:|
| `er-merge-candidates-flow.spec.ts` | 4b | 2 |
| `ingest-dashboard-flow.spec.ts` | 6 | 2 |

---

## 一鍵跑

```bash
# Row 145 全套（含 Row 144 既有 people-db 測試）
npm test --workspace superadmin -- lib/people-db

# 跑指定 Sprint
npm test --workspace superadmin -- lib/people-db/__tests__/inventory.test.ts          # Sprint 1
npm test --workspace superadmin -- lib/people-db/parsers                              # Sprint 2/3
npm test --workspace superadmin -- lib/people-db/__tests__/normalize.test.ts          # Sprint 4a

# E2E
npx playwright test apps/superadmin/e2e/145/

# Integration（env-gated）
RUN_INTEGRATION=1 npm test --workspace superadmin -- ocr-pipeline.test.ts
```

---

## 測試 manifest

對應 entry 在 `apps/superadmin/test-manifest.json`，由 `tools/testing/validate-test-manifest.sh` 守護。
