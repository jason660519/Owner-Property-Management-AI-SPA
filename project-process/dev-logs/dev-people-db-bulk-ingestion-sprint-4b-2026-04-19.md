# Row 145 Sprint 4b — Admin Merge-candidates UI + Search Person/Record Toggle

- **日期**：2026/04/19
- **分支**：`feature/row-145-sprint-4a`（承接 Sprint 4a commit `fe9ae8d`）
- **作者**：Claude Opus 4.7 × Jason 拍板
- **關聯文件**：
  - Dev spec: [people-db-bulk-ingestion-dev-spec-20260418.md](../features/people-db-bulk-ingestion-dev-spec-20260418.md) §Sprint 4
  - TDD spec: [people-db-bulk-ingestion-tdd-spec-20260418.md](../features/people-db-bulk-ingestion-tdd-spec-20260418.md) §4.3 / §4.4
  - 前序：[dev-people-db-bulk-ingestion-sprint-4a-2026-04-19.md](./dev-people-db-bulk-ingestion-sprint-4a-2026-04-19.md)

---

## 0. 一句話

Sprint 4a 的 `merge_candidates` API 接上了 admin UI，搜尋頁可切換 person 聚合 / record 展開兩種檢視，Row 145 從 72% 推進到 85%。

---

## 1. 交付清單

### 新增
- `apps/superadmin/app/superadmin/settings/people-database/merge-candidates/page.tsx` — Merge candidates admin 頁（`MergeCandidatesWorkspace` + `MergeCandidatesPage` default export）
- `apps/superadmin/app/superadmin/settings/people-database/merge-candidates/__tests__/MergeCandidatesPage.test.tsx` — 5 cases per tdd-spec §4.3
- `apps/superadmin/lib/people-db/search-person-aggregate.ts` — 純函式 `aggregateByPerson`
- `apps/superadmin/lib/people-db/__tests__/search-person-aggregate.test.ts` — 5 cases
- `apps/superadmin/app/api/people-db/search/__tests__/route-group-by.test.ts` — 3 cases（新檔，route 本身原本沒 __tests__）
- `apps/superadmin/app/superadmin/settings/people-database/search/__tests__/search-person-toggle.test.tsx` — 3 cases per tdd-spec §4.4
- `apps/superadmin/e2e/145/er-merge-candidates-flow.spec.ts` — 2 cases（page load smoke + sidebar link discoverability）

### 修改
- `apps/superadmin/app/api/people-db/merge-candidates/route.ts` — 加 `?embed=person,staging` enrichment（並行 IN-lookup + immutable map）
- `apps/superadmin/app/api/people-db/merge-candidates/__tests__/route.test.ts` — 加 6 個 embed 測試（白名單 token / 未知 token noop / missing-rows→null / no-param→省略）
- `apps/superadmin/app/api/people-db/search/route.ts` — 加 `group_by=person|record` param（預設 record 向後相容）
- `apps/superadmin/app/superadmin/settings/people-database/search/page.tsx` — 加 toggle UI + person-mode 卡片列表 + 可展開 sources
- `apps/superadmin/components/layout/nav-items.ts` — 加「尋人資料庫 — 搜尋」/「尋人資料庫 — 合併候選」兩個 sidebar entries（Users / GitMerge icons）
- `apps/superadmin/test-manifest.json` — 新增 Row 145 entry（tier=pr，12 unitPaths + 1 e2ePath）
- `apps/superadmin/app/data/roadmap.ts` — Row 145 percentage 72 → 85，加 Sprint 4b 段
- `.claude/commands/handoff.md` — 加嚴「動筆前必 grep 驗證每個技術斷言」章節 + 常見臆測陷阱表（TanStack Query / SWR / Zustand / toast / UI kit / provider / API / migration）

### 路徑決策（tdd-spec 偏離）
- tdd-spec §4.3 指定 `apps/superadmin/unit_test/145/MergeCandidatesPage.test.tsx`；**改放 co-located `__tests__/`**
- 理由：jest.config.js testPathIgnorePatterns 排除 `unit_test/*`（除 009 外），只做目錄索引；Row 144 實際也把 component tests 放 `components/people-database/__tests__/DatasetTreePanel.test.tsx`
- 不動 jest.config 避免打擾既有 row；若將來要加白名單統一模式，在一個獨立 PR 處理

---

## 2. Handoff 與 repo reality 的 3 個矛盾

接手 prompt 有 3 個技術斷言**憑訓練資料印象寫**而非 grep 驗證過，session 開頭花 10 分鐘盤點後 Jason 確認以 repo truth 為準：

| Handoff 說法 | Repo reality | 驗證方式 |
|---|---|---|
| 「TanStack Query 是專案既有方案」 | superadmin 完全沒用 `@tanstack/react-query` | `grep -r "@tanstack/react-query" apps/superadmin` → 0 hits |
| 「QueryClient 設在 `apps/superadmin/components/providers/QueryProvider.tsx`」 | 檔案不存在 | `Read` 失敗 |
| 「搜尋頁與其他後台頁都用 TanStack Query」 | `search/page.tsx` 是 `useState` + 手動 `fetch` + 可取消 `cancelled` flag | Read page 原始碼 |

**修正**：
1. Merge-candidates page 用 `useState + fetch` pattern（對齊 repo truth）
2. 更新 `.claude/commands/handoff.md` 新增硬性規則：動筆前必 grep 驗證、技術斷言必附證據、常見臆測陷阱表 8 項

---

## 3. 關鍵設計決策

### 3.1 `?embed=person,staging` vs 新開 detail endpoint
- 新開 `GET /api/.../[id]` endpoint 每張卡片要 N 次 round-trip（N = items.length）
- 擴充 list API `?embed=` 一次 parallel IN-lookup 覆蓋全頁
- **選 embed**。避免 N+1；token 白名單擋未知值；空 matches 回 `null` 不 throw（容忍 orphan candidates）

### 3.2 aggregateByPerson 的 ordering 語義
- ES relevance 排序是 **record-level**，但 person-view UI 要看「哪個人先出現」
- 決策：person 出現順序 = 第一個被編入該 person 的 record 在 ES 結果的 index；orphan（無 source_link）放末尾 as `person_id=null`
- 這樣 UI 分頁的「第 1 頁 top 3 名人」語義合理；不額外排 source_count

### 3.3 toggle 切換時的 refetch 時機
- 單純 `useEffect(() => doSearch(1), [groupBy])` 會在 mount 時觸發第一次 search（不希望）
- 加 `if (hasSearched)` guard：只有使用者點過搜尋後才因 toggle 切換重打 API
- 代價：初始 load 不搜尋（對齊既有 search page 行為）

### 3.4 Card 不支援 data-testid passthrough
- 實作中 `<Card data-testid="merge-candidate-card">` render 出的 DOM 沒有 testid（Card 不 spread props）
- 用 `<div data-testid>` 外層包裹而非改 Card.tsx（改 Card 會影響 20+ 處使用，不為此單一需求擴大範圍）

---

## 4. 測試狀態

```
jest lib/people-db app/api/people-db app/superadmin/settings/people-database
  Test Suites: 1 skipped, 28 passed, 28 of 29 total
  Tests:       2 skipped, 234 passed, 236 total
  (+23 vs Sprint 4a 211)

npx tsc --noEmit
  0 errors

bash tools/testing/validate-test-manifest.sh
  ✅ test manifest validation passed (21 entries)
```

Sprint 4b 新增 cases 分解：
- merge-candidates route embed：6
- MergeCandidatesPage：5
- search-person-aggregate：5
- search route group-by：3
- search page toggle：3

---

## 5. 已知限制 / 延後事項

| 項目 | 為什麼延後 |
| :-- | :-- |
| **E2E 真 happy-path（seed candidate → reject → 不再出現）** | 需 ER worker 跑真 fixture，scope 歸 Sprint 6 orchestrator |
| **Person-mode total 數** | 目前 `total = ES hits 數`，不是 person 聚合後數；pagination 語義 record-level |
| **Orphan `person_id=null` 的 detail 連結** | 沒有 person entity 可連，Sprint 4b 只展開 sources；ER 補齊後 orphan 會自動消失 |
| **Batch confirm/reject（勾多張一次處理）** | 單張處理夠用，候選量爆量時再加 |
| **Toast library** | 用簡單 notice banner；引入 sonner / react-hot-toast 屬後續 DX 升級 |

---

## 6. 下一步

Sprint 5 IK Analyzer 已於 Sprint 2 並行完成（見 Sprint 2 dev log）。

**Sprint 6 — Orchestrator + 監控 UI**（下一個 session）：
- 一鍵執行 scan → parse → normalize → resolve 全鏈 CLI
- ES indexer：resolved → indexed（把 `person_id` 寫入 ES document 讓 search 可走 ES-side aggregation 而非 post-join）
- 監控 UI：各 stage 檔案數、最近 10 次 run、dead-letter retry
- 闕貴卿 真實驗收（OpenClaw 接上後）

---

## 7. Commit message

```
feat(people-db): Row 145 Sprint 4b — merge-candidates admin UI + search person/record toggle

- Extend GET /api/people-db/merge-candidates with ?embed=person,staging
  (parallel IN-lookup + immutable map, no N+1)
- New admin page /superadmin/settings/people-database/merge-candidates
  (left/right comparison cards, confirm/reject, 409 reload, notice banner)
- Pure fn lib/people-db/search-person-aggregate.ts aggregateByPerson
  (preserves ES ranking, orphans at end, dedupe repeated record_ids)
- Extend GET /api/people-db/search with group_by=person|record
  (default 'record' for Row 144 backwards compat)
- Search page toggle + expandable sources list
- Sidebar nav entries for search + merge-candidates
- E2E smoke + test-manifest Row 145 entry (tier=pr)
- Update .claude/commands/handoff.md: require grep verification of every
  technical claim + common hallucination traps table (TanStack Query etc)

Tests: jest 234 pass (+23 vs Sprint 4a), tsc 0 errors, manifest ✅
Row 145 roadmap: 72 → 85

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```
