# VIS ↔ Roadmap 同步基礎設施開發規格 — 2026/04/14

**Row 範圍**: 137–139
**更新日期**: 2026-04-14
**實作者**: Architect Agent
**ADR**: `/docs/technical-selection/adr-137-vis-sync-infrastructure.md`

---

## 一、功能背景

Paperclip VIS 儀表板目前與 Superadmin roadmap.ts 採「推送式」整合，工程師手動觸發。本規格建立 **雙向同步基礎設施**，讓 Paperclip issue 狀態變更可自動推送至 Superadmin，並支援批量遷移與衝突解決。

---

## 二、Row 137 — VIS 同步基礎設施（8 points）

### 2.1 驗收條件

| # | 條件 | 實作位置 |
| --- | --- | --- |
| AC-1 | `engineer_profiles` 管理頁面可 CRUD 工程師（role / hourly_rate / max_concurrent_tasks） | `apps/superadmin/app/superadmin/engineers/` |
| AC-2 | `paperclip_webhook_logs`、`sync_conflicts` 表建立，含 RLS 策略 | `supabase/migrations/20260413210000_create_vis_sync_tables.sql` |
| AC-3 | `POST /api/webhooks/paperclip` 可接收並驗證 HMAC-SHA256 事件，寫入 log，回傳 202 | `apps/superadmin/app/api/webhooks/paperclip/route.ts` |
| AC-4 | `RoadmapFeature` interface 新增 `vis_issue_id / vis_issue_key / vis_sync_status / vis_last_synced_at` | `apps/superadmin/app/data/roadmap.ts` |
| AC-5 | 環境驗證腳本確認 `PAPERCLIP_WEBHOOK_SECRET` 等必要變數存在 | `scripts/validate-vis-sync-env.sh` |

### 2.2 資料庫 Schema

#### `paperclip_webhook_logs`

```sql
CREATE TABLE paperclip_webhook_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type      TEXT NOT NULL,               -- 'issue.updated', 'issue.done', etc.
  issue_id        TEXT NOT NULL,               -- Paperclip issue UUID
  issue_key       TEXT,                        -- e.g., 'VIS-66'
  payload         JSONB NOT NULL DEFAULT '{}', -- 完整 event payload
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','processed','failed','skipped')),
  error_message   TEXT,
  attempt_count   INT NOT NULL DEFAULT 0,
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `sync_conflicts`

```sql
CREATE TABLE sync_conflicts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name    TEXT NOT NULL,               -- roadmap feature name
  vis_issue_key   TEXT NOT NULL,               -- VIS issue key
  conflict_type   TEXT NOT NULL,               -- 'percentage_mismatch', 'status_mismatch', 'stale_event'
  local_value     JSONB,                        -- 本地值快照
  remote_value    JSONB,                        -- Paperclip 值快照
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolution_note TEXT,
  webhook_log_id  UUID REFERENCES paperclip_webhook_logs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.3 Webhook 事件流程

```
Paperclip
    │  POST /api/webhooks/paperclip
    │  Header: X-Paperclip-Signature: sha256=<HMAC>
    ▼
[1] HMAC 驗證 (crypto.timingSafeEqual)
    │ 失敗 → 401 Unauthorized
    ▼
[2] 寫入 paperclip_webhook_logs (status='pending')
    ▼
[3] 回傳 202 Accepted
    │
    │ (非同步)
    ▼
[4] Cron Worker（每分鐘）讀取 status='pending' logs
    ▼
[5] 匹配 roadmap.ts feature（by vis_issue_key）
    │ 無匹配 → status='skipped'
    ▼
[6] 衝突偵測
    │ 有衝突 → 寫入 sync_conflicts，status='processed'
    │ 無衝突 → 更新 vis_sync_status / vis_last_synced_at，status='processed'
```

### 2.4 Engineer Profile V2 欄位

現有 `engineer_profiles` 表（migration 20260413190000）新增：
- `hourly_rate` NUMERIC(8,2) — 時薪（USD）
- `max_concurrent_tasks` INT DEFAULT 2 — 最大並發任務數

管理頁面 `/superadmin/engineers` 支援：
- 列出所有工程師（含 is_active 篩選）
- 新增工程師（連結到現有 auth.users）
- 編輯 display_name / preferred_ide / default_role / hourly_rate / max_concurrent_tasks
- 停用/啟用（is_active toggle）

---

## 三、Row 138 — VIS 批量遷移工具（5 points）

> 本 Row 依賴 Row 137 完成（需要 vis_issue_id / vis_issue_key 欄位與 VIS API 連線）。

### 3.1 驗收條件

1. `sync-roadmap-to-vis.ts` dry-run 列印 135 行 VIS issue 草稿
2. 實際執行後 VIS 儀表板出現 ~135 個 issue，title / labels / priority / story_points 正確
3. roadmap.ts 每個已遷移 Feature 均有 `vis_issue_id / vis_issue_key` 回寫
4. Superadmin 出現「導出到 VIS」按鈕，顯示實時進度日誌與完成摘要
5. 增量模式：再次執行跳過已有 `vis_issue_id` 的 Feature

---

## 四、Row 139 — VIS ↔ Roadmap 雙向同步引擎（13 points）

> 本 Row 依賴 Row 137（Webhook 框架）和 Row 138（VIS issue 存在）。

### 4.1 同步策略

| 方向 | 觸發 | 行為 |
| --- | --- | --- |
| Paperclip → Superadmin | Webhook event | 更新 vis_sync_status、percentage（若 done → 100%） |
| Superadmin → Paperclip | 管理員手動操作 | PUT /api/issues/{id} 更新 description/status |

### 4.2 衝突解決規則

| 場景 | 處理策略 |
| --- | --- |
| 本地 percentage > Paperclip done 暗示的 100% | 不覆蓋，記錄衝突 |
| Paperclip cancelled，本地仍 in_progress | 記錄衝突，標記 vis_sync_status='conflict' |
| Paperclip 事件時間戳 < vis_last_synced_at | 標記 stale，忽略 |

---

## 五、環境變數需求

| 變數 | 必要性 | 說明 |
| --- | --- | --- |
| `PAPERCLIP_WEBHOOK_SECRET` | 必要 | HMAC 驗證密鑰，與 Paperclip webhook 設定一致 |
| `NEXT_PUBLIC_PAPERCLIP_BASE_URL` | 已存在 | Paperclip API base URL |
| `PAPERCLIP_API_KEY` | 已存在 | Paperclip 服務帳號 API key |

---

## 六、測試規格

測試規格詳見：`/project-process/features/tdd-vis-roadmap-sync-20260414.md`

---

## 七、實作時程

| Row | 功能 | 預計完成 |
| --- | --- | --- |
| 137 | VIS 同步基礎設施 | 2026-04-14 |
| 138 | VIS 批量遷移工具 | 2026-04-15 |
| 139 | VIS ↔ Roadmap 雙向同步引擎 | 2026-04-17 |
