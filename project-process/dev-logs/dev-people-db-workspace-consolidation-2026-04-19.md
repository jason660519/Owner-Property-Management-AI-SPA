# Row 146 — 尋人資料庫工作區整合 + 強制 dataset + Scope 顏色標記

**Date**: 2026-04-19
**Author**: Claude Sonnet 4.5
**Branch**: `feature/row-146-workspace-consolidation`
**Related rows**: 131 (核心) / 132 (精準搜尋) / 144 (樹狀資料來源) / 145 (大規模 ingestion)

---

## 1. 背景與動機

Row 131–145 一路堆疊出 5 個獨立 sub-route：

| 路徑 | 用途 |
| :-- | :-- |
| `/superadmin/settings/people-database` | Landing（已用 tab 整合 import + search） |
| `/superadmin/settings/people-database/search` | 搜尋（690 行） |
| `/superadmin/settings/people-database/import` | 匯入（878 行） |
| `/superadmin/settings/people-database/merge-candidates` | ER 合併審核（319 行） |
| `/superadmin/settings/people-database/ingest` | Ingestion 監控（369 行） |
| `/superadmin/settings/people-database/sources` | 資料集樹狀管理 |
| `/superadmin/tools` | 工具 hub（含一張卡片連到 people-db） |

**痛點**：

- 五個分頁分散在三層 URL，user 在 `匯入 → 監控 → 搜尋 → 合併` 之間需切多次頁面
- `/superadmin/tools` 的 people-db 卡片只是個 link，沒有實質內容，反而讓用戶跳兩次
- Sidebar 三個 `尋人資料庫 — xxx` entry 已開始顯雜
- 未來會持續匯入新的「尋人資料庫」資料集，需要明確的 dataset 概念與 scope 控制

## 2. 決議（與 Jason 對齊 2026-04-19）

1. **單頁整合**：所有功能放回 `/superadmin/settings/people-database`，用 5 個 tab：`匯入 / 搜尋 / 合併審核 / 監控 Ingest / 資料來源`，URL 用 `?tab=xxx` 同步
2. **Tools hub 保留**，移除人員資料庫卡片（people-db 已有獨立 Sidebar 入口）
3. **Sidebar 合併**：3 個 people-db entry 收成 1 個總入口
4. **強制 dataset**：import 必填 `dataset_root`，避免日後追蹤困難
5. **預設 scope = 全部**，但隔離 dataset 在搜尋結果用顏色 badge 標記，視覺上一眼分辨
6. **舊 URL** 保留檔案做 server-side `redirect()`，避免外部書籤死掉

## 3. 實作步驟（建議分 4 commits）

### Step 1（refactor only，本日完成）
- [ ] `app/superadmin/settings/people-database/page.tsx` 改成 tab 容器（5 tabs + `?tab=` URL state）
- [ ] 從 sources/page.tsx 抽出 `SourcesWorkspace` 元件（其他 4 個 workspace 已存在）
- [ ] 5 個 sub-route 的 `page.tsx` default export 改成 `redirect('/superadmin/settings/people-database?tab=xxx')`
- [ ] 用 `next/dynamic` lazy load 非 active tab，避免 bundle 變大

### Step 2（hub + sidebar 清理）
- [ ] `app/superadmin/tools/page.tsx` 移除「尋人資料庫工具」卡片
- [ ] `components/layout/nav-items.ts` 將 3 個 people-db entry 合併成單一「尋人資料庫」（指向預設 `?tab=search`）

### Step 3（強制 dataset）
- [ ] Import workspace：`dataset_root` 必填（紅星 + disable 提交）
- [ ] 加「新建資料集 / 沿用既有」radio + 既有 dataset dropdown
- [ ] API `POST /api/people-db/import/*`：schema validation 強制 `dataset_root: z.string().min(1)`

### Step 4（scope picker + 顏色標記）
- [ ] 新增 `lib/people-db/dataset-color.ts`：純函式 `datasetColor(path: string)` HSL hash
- [ ] Search workspace：頂部 scope picker（全部 / 多選 dataset chip）
- [ ] 結果 row、merge-candidates、ingest 監控的 dataset 欄位都套上 badge

## 4. 風險

| 風險 | 緩解 |
| :-- | :-- |
| 5 workspace 同頁 mount，bundle/initial fetch 過大 | `next/dynamic({ ssr: false })` lazy load 非 active tab |
| 強制 dataset 對既有 client 是 breaking change | 同 PR 更新 client；API 加 telemetry log 看有無外部 caller |
| 舊 URL 書籤失效 | server-side `redirect()` 保留 5 條舊 route |
| dataset 顏色衝突（hash collision） | HSL hue 0–360，dataset 數量 < 50 衝突可接受；後續可加 user override |

## 5. 測試規劃

- `apps/superadmin/unit_test/146/`
  - `tabs-url-sync.test.tsx`：`?tab=xxx` 切換 + `redirect()` 行為
  - `import-dataset-required.test.tsx`：缺 `dataset_root` 時 submit disabled
  - `dataset-color.test.ts`：HSL hash 穩定性
- `apps/superadmin/e2e/146/`
  - `consolidated-flow.spec.ts`：匯入新 dataset → 在 sources tab 看到 → 切搜尋 tab → 結果有對應顏色 badge
- 登記至 `apps/superadmin/test-manifest.json`（tier=pr）

## 6. Roadmap 更新

新增 Row 146（本日先建 phase=`development`，4 step 完成後切 `testing`）。

## 7. 參考

- 設計討論：本 session 對話紀錄
- 既有架構：rows 131/132/144/145 dev-logs
