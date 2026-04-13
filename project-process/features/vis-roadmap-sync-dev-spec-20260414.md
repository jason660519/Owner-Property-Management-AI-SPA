# VIS ↔ Roadmap 雙向同步系統 — DEV-SPEC

**Row ID**: 136 / 137 / 138 / 139
**版本**: 0.1 (審查稿)
**日期**: 2026/04/14
**狀態**: 待審查
**關聯**: Row 133 (Paperclip 優化), Row 135 (多人協作任務派遣)

---

## 1. 目標與範圍

### 1.1 目標

將 Superadmin 儀表板上的 **135 個任務**（`roadmap.ts`）同步至 Paperclip VIS 儀表板，讓 CEO 可在 VIS 上：

1. **可視化**所有任務的進度、階段、分類
2. **分配**任務給Paperclip agents工程師
3. **監控**任務執行進度，含成本與 coverage
4. **審核**工程師或 agent 完成的工作成果

並實現 **雙向同步**：

- `roadmap.ts` 更新 → 自動推送到 VIS issue
- VIS issue 狀態變更 → 自動回源 `roadmap.ts`（git auto-commit）

### 1.2 範圍內

- Row 136：Engineer Profile V2 管理頁面 + Webhook 框架（基礎設施）
- Row 137：批量遷移腳本 + Superadmin 導出 UI
- Row 138：雙向同步引擎 + 衝突解決頁面
- Row 139：CEO 工作流優化 + 文檔

### 1.3 範圍外

- Paperclip 平台本體修改（不動 docker/paperclip/ 之外的服務）
- 跨 app 同步（僅 superadmin 應用）
- 外部 CI/CD 系統整合（Phase 4 的 coverage 回源視資源而定）

---

## 2. 架構概覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Superadmin (Next.js)                         │
│                                                                     │
│  roadmap.ts (RAW_FEATURES)   ←────────────  Sync Engine            │
│       │                                         ↑                   │
│       │ Export trigger                          │                   │
│       ▼                                         │                   │
│  sync-roadmap-to-vis.ts                  webhook-handler.ts        │
│       │                                         ↑                   │
│       │ POST /api/paperclip/issues              │                   │
│       ▼                                     Background Worker       │
│  Paperclip VIS (localhost:3187)                 │                   │
│       │                                         │                   │
│       │ Webhook events (status_changed, etc.)   │                   │
│       └────────────────────────────────────────►│                   │
│                                                                     │
│  Supabase                                                           │
│  ├─ engineer_profiles                                               │
│  ├─ paperclip_webhook_logs                                          │
│  └─ sync_conflicts                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1 — 基礎設施（Row 136）

### 3.1 資料庫 Migrations

#### 3.1.1 `engineer_profiles` 欄位擴充

現有 `engineer_profiles` 表（Row 135 建立）新增欄位：

```sql
ALTER TABLE engineer_profiles
  ADD COLUMN IF NOT EXISTS hourly_rate_usd    NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS max_concurrent_tasks INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS assigned_tasks_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_tasks_count INT DEFAULT 0;
```

Migration 檔案：`supabase/migrations/20260414120000_engineer_profiles_add_workload.sql`

#### 3.1.2 `paperclip_webhook_logs` 表（新建）

```sql
CREATE TABLE paperclip_webhook_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vis_issue_id    TEXT NOT NULL,
  event_type      TEXT NOT NULL, -- 'status_changed' | 'assigned' | 'updated'
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
    -- 'pending' | 'completed' | 'failed' | 'retrying'
  attempt_count   INT NOT NULL DEFAULT 0,
  last_error      TEXT,
  processed_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS: 僅 service_role 可寫，authenticated 可讀
ALTER TABLE paperclip_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON paperclip_webhook_logs
  TO service_role USING (true);
CREATE POLICY "authenticated_read" ON paperclip_webhook_logs
  FOR SELECT TO authenticated USING (true);
```

Migration 檔案：`supabase/migrations/20260414120001_paperclip_webhook_logs.sql`

#### 3.1.3 `sync_conflicts` 表（新建）

```sql
CREATE TABLE sync_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name    TEXT NOT NULL,
  vis_issue_id    TEXT NOT NULL,
  roadmap_snapshot  JSONB NOT NULL, -- RoadmapFeature 快照
  vis_snapshot      JSONB NOT NULL, -- VIS issue 快照
  conflict_fields   TEXT[] NOT NULL, -- 衝突欄位清單
  resolution      TEXT,
    -- 'roadmap' | 'vis' | 'manual' | null（未解決）
  resolved_by     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON sync_conflicts
  TO authenticated USING (true);
```

Migration 檔案：`supabase/migrations/20260414120002_sync_conflicts.sql`

### 3.2 RoadmapFeature Interface 擴充

```typescript
// apps/superadmin/app/data/roadmap.ts
export interface RoadmapFeature {
  // ... 現有欄位 ...

  // --- VIS 同步欄位（新增）---
  /** Paperclip VIS issue human-readable ID (e.g. "VIS-136") */
  vis_issue_id?: string;
  /** Paperclip VIS issue internal UUID */
  vis_issue_key?: string;
  /** Sync status with VIS */
  vis_sync_status?: "in_sync" | "diverged" | "conflict" | "pending";
  /** ISO timestamp of last successful sync */
  vis_last_synced_at?: string;
}
```

### 3.3 Engineer Profile 管理頁面

**路徑**：`apps/superadmin/app/superadmin/engineers/`

**檔案**：

| 檔案                                  | 行數上限 | 職責                                                |
| ------------------------------------- | -------- | --------------------------------------------------- |
| `page.tsx`                          | 60       | Server Component，獲取初始工程師列表                |
| `actions.ts`                        | 150      | Server Actions：list / create / update / deactivate |
| `components/EngineersTable.tsx`     | 300      | EnhancedTable 包裝（角色、時薪、容量、任務數）      |
| `components/EngineerEditDialog.tsx` | 200      | 新增/編輯 Dialog                                    |

**表格欄位**：姓名、角色、時薪（USD/hr）、最大並發任務、已分配、完成率、操作

**Sidebar 新增入口**：

- `apps/superadmin/components/layout/Sidebar.tsx` 中 `navItems` 加入 `{ label: 'Engineers', path: '/superadmin/engineers', icon: Users }`

### 3.4 Webhook 端點

**路徑**：`apps/superadmin/app/api/webhooks/paperclip/route.ts`

```typescript
// POST /api/webhooks/paperclip
// 1. 驗證 X-Paperclip-Signature HMAC-SHA256
// 2. 解析事件（issue.status_changed | issue.assigned | issue.updated）
// 3. INSERT paperclip_webhook_logs (status='pending')
// 4. 回覆 200 OK（不等待處理完成）
// 5. 觸發 processWebhookEvent()（非同步）
```

**環境變數**：`PAPERCLIP_WEBHOOK_SECRET`（新增至 `.env.local`）

### 3.5 Background Worker

**路徑**：`apps/superadmin/lib/paperclip/background-worker.ts`

- 非同步處理 `paperclip_webhook_logs` 中 status='pending' 的事件
- 重試邏輯：最多 3 次，間隔 30s / 60s / 120s（指數退退）
- 超過重試次數 → 更新 status='failed'，寫入 last_error

---

## 4. Phase 2 — 批量遷移（Row 137）

### 4.1 遷移腳本

**路徑**：`apps/superadmin/scripts/sync-roadmap-to-vis.ts`

**用法**：

```bash
# Dry-run（不實際調用 API）
npx ts-node scripts/sync-roadmap-to-vis.ts --dry-run

# 全量遷移
npx ts-node scripts/sync-roadmap-to-vis.ts --mode batch

# 增量遷移（僅未同步的 Feature）
npx ts-node scripts/sync-roadmap-to-vis.ts --mode incremental
```

**映射規則（roadmap → VIS）**：

| RoadmapFeature 欄位                                     | VIS Issue 欄位            | 備註                                            |
| ------------------------------------------------------- | ------------------------- | ----------------------------------------------- |
| `name`                                                | `title`                 | 前綴加 `[Category]`                           |
| `category`                                            | `labels[]`              | 字串陣列                                        |
| `phase`                                               | `module`                | development / testing / deployment / operations |
| `percentage`                                          | `custom.progress`       | 0-100                                           |
| `points`                                              | `story_points`          |                                                 |
| `acceptanceCriteria`                                  | `description`（第一段） | Markdown 格式                                   |
| `featureSpecDocPath`                                  | `description`（連結）   |                                                 |
| `phase='development', percentage<50`                  | `priority: 'low'`       | 動態計算                                        |
| `phase='development', percentage>=50`                 | `priority: 'medium'`    |                                                 |
| `phase='testing'`                                     | `priority: 'high'`      |                                                 |
| `deployStatus='production'` or `phase='operations'` | `priority: 'urgent'`    |                                                 |

**回寫邏輯**：遷移成功後，更新 `roadmap.ts` 對應 Feature 的 `vis_issue_id`、`vis_issue_key`、`vis_sync_status='in_sync'`、`vis_last_synced_at`。

**錯誤策略**：

- 單行失敗 → 記錄並繼續下一行（不中斷整批）
- Quota 超限 → 等待 60s 後重試，最多 3 次
- 網路斷線 → 指數退退重試

**輸出報告**：`/tmp/sync-roadmap-to-vis-YYYYMMDD.json`（成功清單 + 失敗清單 + 統計）

### 4.2 Superadmin 導出 UI

**路徑**：`apps/superadmin/app/superadmin/dashboard/project-progress/components/`

| 新檔案                       | 行數上限 | 職責                                 |
| ---------------------------- | -------- | ------------------------------------ |
| `ExportToVISButton.tsx`    | 80       | 頂部工具欄按鈕（僅 superadmin 可見） |
| `ExportProgressDialog.tsx` | 200      | 模式選擇 + 即時進度日誌 + 結果摘要   |

**後端 API**：`apps/superadmin/app/api/admin/sync-roadmap-to-vis/route.ts`

```typescript
// POST /api/admin/sync-roadmap-to-vis
// Body: { mode: 'batch' | 'incremental', dry_run: boolean }
// 使用 TransformStream 回傳 Server-Sent Events（SSE）即時進度
// 串流格式：
// data: {"type":"progress","current":50,"total":135,"message":"✅ VIS-136 created"}
// data: {"type":"done","success":123,"skipped":10,"failed":2}
```

---

## 5. Phase 3 — 雙向同步引擎（Row 138）

### 5.1 Sync Engine

**路徑**：`apps/superadmin/lib/paperclip/sync-engine.ts`

核心函式：

```typescript
// VIS → roadmap 方向
async function applyVISChangeToRoadmap(
  visIssueId: string,
  changes: Partial<PaperclipIssue>
): Promise<SyncResult>

// roadmap → VIS 方向
async function applyRoadmapChangeToVIS(
  featureName: string,
  changes: Partial<RoadmapFeature>
): Promise<SyncResult>

// 衝突偵測
function detectConflicts(
  roadmapFeature: RoadmapFeature,
  visIssue: PaperclipIssue,
  changedFields: string[]
): ConflictField[]
```

### 5.2 Webhook Handler

**路徑**：`apps/superadmin/lib/paperclip/webhook-handler.ts`

**VIS 事件 → roadmap 更新映射**：

| VIS 事件                              | 更新邏輯                                                           |
| ------------------------------------- | ------------------------------------------------------------------ |
| `status_changed` → `done`        | `percentage=100`，`phase='deployment'`（若 deployStatus 未設） |
| `status_changed` → `in_progress` | 若 `percentage < 50`，設 `percentage=50`                       |
| `status_changed` → `failed`      | 維持 `phase='development'`，記錄 `developmentProgress` 錯誤    |
| `assigned`                          | 記錄 `lastModifiedBy`（被指派的工程師名稱）                      |
| `updated` (priority)                | 不自動更新 roadmap（防循環）                                       |

### 5.3 Roadmap 更新工具

**路徑**：`apps/superadmin/lib/roadmap/update.ts`

```typescript
// 以 feature name 為 key，更新 RAW_FEATURES 陣列中對應物件的指定欄位
// 同時更新 lastModifiedBy: '[VIS-sync]', lastModifiedDate: today
async function updateRoadmapFeature(
  featureName: string,
  updates: Partial<RoadmapFeature>
): Promise<void>
```

**Git Auto-commit 策略**：

- 批量收集 5s 內的多個更新，合併成一次 commit（防止 git log 爆炸）
- Commit message：`[VIS-sync] 同步 N 個 feature 進度 (YYYY-MM-DD HH:MM)`
- 分支：直接 commit 到當前分支（main 或 feature branch）

### 5.4 Feature 編輯 API

**路徑**：`apps/superadmin/app/api/admin/features/[featureName]/route.ts`

```typescript
// PUT /api/admin/features/:featureName
// 1. 驗證 superadmin 身份
// 2. 更新 roadmap.ts（呼叫 updateRoadmapFeature）
// 3. 若 Feature 有 vis_issue_key，同步推送到 VIS
// 4. 偵測衝突：若 VIS 端 updated_at > vis_last_synced_at → 標記 diverged，INSERT sync_conflicts
// 5. 回傳更新後的 RoadmapFeature
```

### 5.5 衝突解決頁面

**路徑**：`apps/superadmin/app/superadmin/conflicts/`

| 檔案                                    | 職責                                              |
| --------------------------------------- | ------------------------------------------------- |
| `page.tsx`                            | 列表未解決的衝突（Server Component）              |
| `actions.ts`                          | resolveConflict（採 roadmap / 採 VIS / 手動合併） |
| `components/ConflictTable.tsx`        | EnhancedTable 顯示衝突清單                        |
| `components/ConflictDetailDialog.tsx` | Side-by-side diff 比較 + 解決按鈕                 |

**Sidebar 新增入口**：`{ label: 'Sync Conflicts', path: '/superadmin/conflicts', icon: AlertTriangle }`

---

## 6. Phase 4 — CEO 工作流（Row 139）

### 6.1 Engineer UI 優化

**Engineer 管理頁面**（Phase 1 建立的基礎上）新增：

- 工程師「可用容量」進度條：`(max_concurrent_tasks - 活躍任務數) / max_concurrent_tasks`
- 快速指派按鈕：選擇任務 → 指派給此工程師（呼叫現有 `/api/paperclip/task-queue/assign`）

### 6.2 Auto-assign 策略

**路徑**：`apps/superadmin/lib/paperclip/auto-assign.ts`

```typescript
// 根據 feature 的 category 選擇最合適的 agent/engineer
// 優先級：
// 1. 有 vis_issue_key 且 assigned_engineer != null 的直接指派
// 2. engineer_profiles 中最低負載且 role 匹配的工程師
// 3. Fallback: 對應 category 的 Paperclip agent（auto-route.ts 現有邏輯）
async function autoAssignFeature(feature: RoadmapFeature): Promise<string>
```

### 6.3 CI Coverage 回源（可選，依資源決定）

若 CI 環境支援，在測試完成後呼叫：

```bash
curl -X PATCH /api/admin/features/:featureName \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "testCoverage": 85, "unitTestCoverage": 90, "e2eTestCoverage": 70 }'
```

### 6.4 文檔

| 文件                 | 路徑                                                     |
| -------------------- | -------------------------------------------------------- |
| CEO 工作流指南       | `docs/user-guides/ceo-task-distribution.md`            |
| VIS-Roadmap 映射規則 | `docs/integration/vis-roadmap-mapping.md`              |
| 雙向同步開發者指南   | `docs/integration/vis-roadmap-sync-developer-guide.md` |
| Troubleshooting      | `docs/integration/vis-sync-troubleshooting.md`         |

---

## 7. 完整檔案清單

### 新建

| 檔案                                                                                              | Phase | 行數上限 |
| ------------------------------------------------------------------------------------------------- | ----- | -------- |
| `supabase/migrations/20260414120000_engineer_profiles_add_workload.sql`                         | 1     | 20       |
| `supabase/migrations/20260414120001_paperclip_webhook_logs.sql`                                 | 1     | 40       |
| `supabase/migrations/20260414120002_sync_conflicts.sql`                                         | 1     | 40       |
| `apps/superadmin/app/superadmin/engineers/page.tsx`                                             | 1     | 60       |
| `apps/superadmin/app/superadmin/engineers/actions.ts`                                           | 1     | 150      |
| `apps/superadmin/app/superadmin/engineers/components/EngineersTable.tsx`                        | 1     | 300      |
| `apps/superadmin/app/superadmin/engineers/components/EngineerEditDialog.tsx`                    | 1     | 200      |
| `apps/superadmin/app/api/webhooks/paperclip/route.ts`                                           | 1     | 80       |
| `apps/superadmin/lib/paperclip/background-worker.ts`                                            | 1     | 200      |
| `apps/superadmin/scripts/sync-roadmap-to-vis.ts`                                                | 2     | 400      |
| `apps/superadmin/app/api/admin/sync-roadmap-to-vis/route.ts`                                    | 2     | 100      |
| `apps/superadmin/app/superadmin/dashboard/project-progress/components/ExportToVISButton.tsx`    | 2     | 80       |
| `apps/superadmin/app/superadmin/dashboard/project-progress/components/ExportProgressDialog.tsx` | 2     | 200      |
| `apps/superadmin/lib/paperclip/sync-engine.ts`                                                  | 3     | 350      |
| `apps/superadmin/lib/paperclip/webhook-handler.ts`                                              | 3     | 200      |
| `apps/superadmin/lib/roadmap/update.ts`                                                         | 3     | 200      |
| `apps/superadmin/app/api/admin/features/[featureName]/route.ts`                                 | 3     | 100      |
| `apps/superadmin/app/superadmin/conflicts/page.tsx`                                             | 3     | 60       |
| `apps/superadmin/app/superadmin/conflicts/actions.ts`                                           | 3     | 100      |
| `apps/superadmin/app/superadmin/conflicts/components/ConflictTable.tsx`                         | 3     | 250      |
| `apps/superadmin/app/superadmin/conflicts/components/ConflictDetailDialog.tsx`                  | 3     | 250      |
| `apps/superadmin/lib/paperclip/auto-assign.ts`                                                  | 4     | 150      |
| `docs/user-guides/ceo-task-distribution.md`                                                     | 4     | —       |
| `docs/integration/vis-roadmap-mapping.md`                                                       | 4     | —       |

### 改動

| 檔案                                              | 改動說明                                                    |
| ------------------------------------------------- | ----------------------------------------------------------- |
| `apps/superadmin/app/data/roadmap.ts`           | 新增 vis_issue_id 等 4 個欄位到 interface；新增 Row 136-139 |
| `apps/superadmin/components/layout/Sidebar.tsx` | 新增 Engineers、Sync Conflicts 兩個 navItem                 |

---

## 8. 技術約束

- TypeScript strict，禁 `any`，單檔不超過 500 行
- CSS token（`text-text-primary`、`bg-bg-secondary`）
- Supabase client：`createAdminClient` from `@/utils/supabase/admin`（webhook handler 等 server-side）
- 色彩：Badge variants 只用 `'default' | 'success' | 'warning' | 'error' | 'info'`
- Git auto-commit 應 debounce（5s），防止大量更新造成 commit 爆炸
- Webhook HMAC 驗證使用 `crypto.subtle`（Web Crypto API，Next.js Edge-friendly）

---

## 9. 驗收條件（依 Phase）

### Phase 1 ✅ 完成條件

- [ ] 三個 Supabase 表建立成功，RLS 策略正確
- [ ] Engineer 管理頁面可 CRUD，顯示容量狀態
- [ ] Webhook 端點可接收測試事件，插入 webhook_logs 記錄
- [ ] RoadmapFeature interface 新增 4 個 VIS 欄位，TypeScript 無錯

### Phase 2 ✅ 完成條件

- [ ] dry-run 列印 135 行 issue 草稿，映射邏輯無誤
- [ ] 全量遷移後 VIS 顯示 ~135 個 issue，欄位正確
- [ ] roadmap.ts 所有 Feature 有 vis_issue_id 回寫
- [ ] Superadmin 按鈕可觸發導出，顯示實時進度

### Phase 3 ✅ 完成條件

- [ ] VIS issue status 變更，10s 內 roadmap.ts 自動 git commit 更新
- [ ] Superadmin 編輯 Feature，VIS issue 自動同步
- [ ] 衝突場景：人工製造衝突，確認標記 diverged
- [ ] Conflict 頁面可解決衝突，雙端一致

### Phase 4 ✅ 完成條件

- [ ] Engineer 頁面顯示容量和任務統計
- [ ] Auto-assign 可正確選擇最低負載的 agent/engineer
- [ ] CEO 完整工作流文檔可供使用

---

## 10. 衝突解決優先級

| 情境                                     | 自動解決策略                         |
| ---------------------------------------- | ------------------------------------ |
| VIS status =`done`                     | 優先 VIS（agent/engineer 已完成）    |
| `claimed_by` != null（工程師正在處理） | 優先 roadmap（人工在編輯）           |
| 僅 VIS 端更新（roadmap 未動）            | 優先 VIS                             |
| 僅 roadmap 更新（VIS 未動）              | 優先 roadmap                         |
| 雙邊同時更新                             | 標記 `diverged`，加入 CEO 審核佇列 |

---

## 11. 風險與緩解

| 風險                                      | 可能性 | 影響              | 緩解措施                                                |
| ----------------------------------------- | ------ | ----------------- | ------------------------------------------------------- |
| Paperclip API quota 不足（135 批量建立）  | 中     | 遷移中斷          | Rate limit: 5 req/s；超限等 60s；記錄斷點可續跑         |
| Git auto-commit 衝突（multiple webhooks） | 中     | 資料遺失          | Sequential queue + debounce 5s；失敗記錄到 webhook_logs |
| Webhook 遺漏（網路問題）                  | 低     | 資料不一致        | 重試 3 次 + 人工補償 API `/api/admin/sync-manual`     |
| roadmap.ts 檔案過大（>500 行 diff）       | 低     | TypeScript 慢     | 分離 vis sync 狀態到獨立 JSON 檔（備選方案）            |
| VIS issue 被外部刪除                      | 低     | 孤兒 vis_issue_id | 定期對帳 job（可後加）                                  |

---

## 12. 變更紀錄

| 日期       | 說明                          |
| ---------- | ----------------------------- |
| 2026/04/14 | 初版規格（Claude Sonnet 4.6） |
