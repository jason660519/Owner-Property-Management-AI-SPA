# Row 145 Sprint 4a — Staging + Entity Resolution Core Dev Log

- **Date**: 2026-04-19
- **Developer**: Claude Opus 4.7
- **Branch**: `feature/row-145-sprint-4a` (off `feature/row-145-sprint-2` head `4e8694d`)
- **Parent dev-spec**: [people-db-bulk-ingestion-dev-spec-20260418.md](../features/people-db-bulk-ingestion-dev-spec-20260418.md) §Sprint 4
- **Parent tdd-spec**: [people-db-bulk-ingestion-tdd-spec-20260418.md](../features/people-db-bulk-ingestion-tdd-spec-20260418.md)

## 交付摘要

Sprint 4 拆成 4a（staging + ER 邏輯 + API + worker，全 jest 驗）與 4b（admin UI + 搜尋聚合 toggle）。本 log 為 4a 交付。

兩個 Phase：

### Phase 1 — Staging + Normalize（dev-spec 原本隱含、本 sprint 明確化）

發現 Sprint 2 worker 和 Sprint 3 OCR callback 都沒把 `ParseResult.rows` 持久化（comment 「Sprint 4 ER owns the staging table」），但 dev-spec 沒定義 staging table。Phase 1 補齊：

- **Migration `20260419055657_create_people_db_staging_records.sql`**：單表設計（raw + normalized 同 row 的 JSONB），(file_id, record_index) UNIQUE 讓 re-parse upsert 乾淨，partial index 只掃 pending normalize 的 rows，GIN on normalized JSONB 覆蓋 ER 的 (name+phone) / (name+addr) 查詢
- **`lib/people-db/staging.ts`**：`parsedRowsToStaging` / `ocrPagesToStaging` / `insertStagingRecords` / `updateNormalized`
- **`lib/people-db/normalize.ts`**：`normalizeName` / `normalizeIdNo` / `normalizeBirthYear` / `normalizeRecord` + `DEFAULT_COLUMN_MAP`（reuse Row 132 `normalizePhone` 與 Row 144 `normalizeAddress`）
- **`tools/people-db/parse.ts`**：`markResult` 成功時 `insertStagingRecords(parsedRowsToStaging(...))` 後再 flip status='parsed'
- **`app/api/people-db/ingest/ocr/callback/route.ts`**：callback 把 pages 寫 staging 取代 Sprint 3 的 `error_msg='OCR_RESULT_FOR_SPRINT_4'` marker
- **`tools/people-db/normalize.ts`**：CLI worker 取 normalized IS NULL 的 staging rows 跑 normalize → 完成後 flip file status 'parsed' → 'normalized'（guard on current status='parsed' 避免覆蓋 ER 已推進的 row）

### Phase 2 — Entity Resolution 核心

- **Migration `20260419060359_create_people_db_er_tables.sql`**：4 張新表 + RLS（每表 4 policies）
  - `people_db_persons`（canonical，id_no UNIQUE、canonical_name B-tree、phones GIN）
  - `people_db_person_sources`（person ← staging record 1:N，match_reason 記 audit trail）
  - `people_db_merge_candidates`（pending 候選，(person_a_id, record_b_id) UNIQUE）
  - `people_db_merge_blacklist`（rejected 對；ER 每次 consult）
- **`lib/people-db/entity-resolution.ts`**：雙層設計
  - **純函式 `decideAction`**：吃 `DecideInput` → `ResolveAction`（`auto_merge` / `candidate` / `new_person`），所有 DB lookup 上游準備，純測試
  - **orchestrator `resolveRecord`**：做 4 類 lookup（id exact / name+phone / name+addr / blacklist）後委派 decideAction
  - 關鍵規則：有 id_no 但找不到 exact match → `new_person`，不往下 fuzzy（id_no 是 authoritative，避免誤合）
- **`lib/people-db/merge-candidates.ts`**：`createCandidate`（upsert ignoreDuplicates 保護 admin 已決定的 row）、`confirmCandidate`（insert person_sources + status='confirmed'，不寫 blacklist）、`rejectCandidate`（upsert blacklist + status='rejected'）+ `CandidateStateError`（double-decide 擋下）
- **`tools/people-db/resolve.ts`**：CLI worker，讀 normalized + 未 resolved 的 staging rows，根據 action 寫 persons / person_sources / candidates；file 全 resolved → status 'normalized' → 'resolved'
- **3 個 API routes + tests**：
  - `GET /api/people-db/merge-candidates?status=pending&page=N`（list + 分頁）
  - `POST /api/people-db/merge-candidates/[id]/confirm`
  - `POST /api/people-db/merge-candidates/[id]/reject`
  - 全 `requireSuperAdmin` + `createAdminClient` 繞 RLS

---

## 測試總覽

| Suite | Cases | 狀態 |
| :--- | :--- | :--- |
| `normalize.test.ts`（新） | 15 | ✅ |
| `staging.test.ts`（新） | 4 | ✅ |
| `entity-resolution.test.ts`（新） | 10 | ✅ |
| `merge-candidates.test.ts`（新） | 6 | ✅ |
| `merge-candidates/__tests__/route.test.ts`（新，3 endpoints 共） | 7 | ✅ |
| `callback/route.test.ts`（+1 staging failure case） | 8 | ✅ |
| `ocr-pipeline.test.ts`（integration，+staging assertion） | 2 | ⏭️（`RUN_INTEGRATION=1` 時 2/2 pass） |
| people-db regression total | 211 pass + 2 skip | ✅ |
| `tsc --noEmit`（superadmin） | — | ✅ 0 errors |

---

## 設計決策

### 1. 單表 staging vs split（raw / normalized 兩張）

選 **single wide table**，raw + normalized 同 row 的兩個 JSONB：
- 1:1 關係 join 沒必要
- normalize 是 idempotent，rerun 原地 update
- GIN on normalized JSONB 覆蓋所有 ER lookup，不需為每 field 建 expression index

### 2. ER 雙層 (pure decide + orchestrator)

`decideAction` 純函式 + `resolveRecord` orchestrator。理由：tdd-spec 要求 8 cases，純函式版本可用 `Set<string>` 代替 blacklist DB table、string 陣列代替 match results，讓測試零 DB mock。orchestrator 只做 4 類 DB lookup + 委派，薄到不值得 unit test（靠 worker integration 驗）。

### 3. 有 id_no 但 no exact match → new_person（不 fallback to fuzzy）

保守規則：id_no 是 authoritative signal，若無法在 persons 找到同 id_no，推定這是新人而非「可能跟 A 先生姓名電話像」。避免兩個持不同身份證但同姓名/同電話的人被誤合。

### 4. createCandidate 用 `ignoreDuplicates: true`

ER worker rerun 時可能對同 (person, record) 重覆產生候選。用 upsert ignoreDuplicates 保護 admin 已決定的 row（confirmed/rejected）不會被 worker 重置回 pending。

### 5. Migration RLS 4 表 × 4 policies 直寫不抽 function

Postgres 不讓 RLS policy 直接呼叫 helper function（或至少 Supabase 目前 pattern 都是 inline），重複 4 次 `auth.role() = 'service_role' OR EXISTS (...)`。程式碼重複但複製貼上清晰，維運明瞭。

### 6. OCR callback 的 staging insert 失敗 → 500 不 flip status

原子性透過兩階段保證：staging upsert 在 status flip 之前。staging 失敗時 file 仍 `ocr_queued`，重試 callback 時 `(file_id, record_index)` UNIQUE 保證 upsert 冪等。不用 transaction（Supabase SDK 沒方便 API）。

---

## 已知限制 / Sprint 4b+ 待辦

1. **沒有 admin UI**：Sprint 4b 會做 `merge-candidates/page.tsx` + 左右對照 + confirm/reject 按鈕 + pending badge + search 聚合 toggle
2. **沒有 ES indexing**：resolve worker 把 `status` 推進到 `'resolved'`，但沒把 person 寫入 ES（`indexed` 狀態由未來 indexer 處理）
3. **address signature 比對粗糙**：現用 county+district+road 字串 startsWith，遇「南港路一段 212 號」vs「南港路」會不命中（短的被視為非 startsWith prefix）；Sprint 6 的 IK 搜尋可能補強
4. **沒有 UI batch confirm/reject**：一次只能點一張；候選量大時 admin 體驗差，Sprint 4b 加
5. **Normalize 不做身分證 checksum 校驗**：避免誤拒 OCR/legacy 資料的容錯
6. **worker integration test 缺**：normalize.ts / resolve.ts 都未寫 in-memory DB 的端到端（一層一層的 pure fn 已覆蓋；真實驗證靠 Jason 本機 `--dry-run`）

---

## Sprint 進度

- Sprint 1 ✅
- Sprint 2 ✅
- Sprint 3 ✅（含 OCR pipeline 骨架）
- Sprint 5 ✅（IK + reindex tooling）
- Sprint 4a ✅（本 log）
- Sprint 4b ⏳（merge-candidates UI + search person toggle + E2E）
- Sprint 6 ⏳（orchestrator + 監控頁 + custom IK dict）
- Sprint 7 ⏳（NAS 遷移）
