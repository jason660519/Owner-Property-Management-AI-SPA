# ADR-137: VIS 同步基礎設施架構設計

**Date**: 2026-04-14
**Status**: Accepted
**Author**: Architect Agent
**Row ID**: 137 — VIS 同步基礎設施 (8 points)

---

## Context

Paperclip 的 VIS 儀表板（`apps/superadmin`）目前與 Paperclip 任務系統是「推送式」整合（Superadmin 主動呼叫 Paperclip API）。Row 136–139 計畫建立雙向同步，使得：

1. Paperclip issue 狀態變更可即時推送到 Superadmin（Webhook）
2. Superadmin 的 roadmap 功能與 Paperclip VIS issue 保持雙向一致
3. 多工程師協作時的任務派遣可追蹤工程師能力與負載（Engineer Profile V2）

Row 137 是整個同步框架的基礎層（Foundation），後續 Row 138–139 建立於此之上。

---

## Decision

### 1. Webhook 驗證：HMAC-SHA256

**選定**：接收端（`POST /api/webhooks/paperclip`）以 HMAC-SHA256 驗證請求完整性。

**理由**：
- Paperclip 原生支援 webhook 事件並在 header `X-Paperclip-Signature` 帶 HMAC 值
- HMAC-SHA256 驗證是業界標準（GitHub Webhooks、Stripe 均採用）
- 無需額外依賴，Next.js API 使用 Node.js 原生 `crypto` 模組即可實作
- 拒絕無法驗證的請求（回傳 401）防止偽造事件影響同步狀態

**密鑰管理**：`PAPERCLIP_WEBHOOK_SECRET` 環境變數，與 Paperclip 管理後台設定的 webhook secret 一致。

### 2. 事件處理：非同步背景 Worker 模式

**選定**：Webhook endpoint 驗證後立即寫入 `paperclip_webhook_logs`（event queue），回傳 `202 Accepted`，由背景 worker 非同步消費並更新 roadmap 狀態。

**理由**：
- Paperclip 要求 webhook endpoint 在 5 秒內回應，否則視為失敗並重試
- 同步更新 Supabase 可能超時（DB 網路延遲 + 衝突解決邏輯）
- 非同步模式提供天然的重試緩衝：若 worker 失敗，log 記錄仍在，可重播
- 符合 Event Sourcing 原則：`webhook_logs` 是事件的不可變記錄

**Worker 觸發**：初期使用 Superadmin 的 cron job（`/api/cron`），每分鐘消費 `pending` 狀態的 log。後續可升級為 Supabase Edge Functions。

### 3. 衝突解決：Last-Write-Wins + 衝突日誌

**選定**：當 Paperclip 事件與本地 roadmap 狀態不一致時，記錄到 `sync_conflicts` 表，預設採用 Last-Write-Wins（LWW）策略，但保留衝突記錄供人工審查。

**衝突場景**：
| 場景 | 處理 |
| --- | --- |
| 本地 percentage > Paperclip status 暗示的進度 | 記錄衝突，不覆蓋本地值（本地優先） |
| Paperclip issue 被 cancelled，本地 percentage < 100 | 記錄衝突，設 vis_sync_status = 'conflict' |
| Paperclip issue 更新比本地更新時間戳更舊 | 忽略，標記為 stale event |

**理由**：
- 完全自動解決衝突風險高（可能覆蓋工程師手動修正的數據）
- 人工審查 + 衝突日誌提供安全網
- LWW 適用於大多數情況（Paperclip 是 source of truth for task status）

### 4. Engineer Profile V2：獨立 CRUD 管理頁

**選定**：在 `/superadmin/engineers` 建立獨立管理頁面，使用已存在的 `engineer_profiles` 表（migration 20260413190000），新增 `hourly_rate` 和 `max_concurrent_tasks` 欄位。

**理由**：
- `engineer_profiles` 表已在 Row 135 建立，節省 schema migration 成本
- 分離工程師管理頁面提高可維護性（不混入 Users 頁面）
- CRUD 使用 Server Actions 保持與現有 Superadmin 模式一致

### 5. RoadmapFeature VIS 欄位

**選定**：在 `RoadmapFeature` interface 新增 4 個可選欄位：
- `vis_issue_id?: string` — Paperclip VIS issue UUID
- `vis_issue_key?: string` — VIS issue identifier (e.g., `VIS-66`)
- `vis_sync_status?: 'synced' | 'pending' | 'conflict' | 'error'`
- `vis_last_synced_at?: string` — ISO 8601 timestamp

**理由**：
- Optional 欄位保持向後相容（現有 135+ 功能不受影響）
- 為 Row 138 批量遷移和 Row 139 雙向同步引擎提供型別支援

---

## Alternatives Considered

### Alternative A: 使用 Supabase Realtime 而非 Webhook

**拒絕理由**：Paperclip 運行在獨立容器，無法直接訂閱 Supabase。Webhook 是 Paperclip 原生支援的推送機制。

### Alternative B: 直接 DB-to-DB 同步（Postgres FDW）

**拒絕理由**：Paperclip 的資料庫不對外暴露，且 FDW 增加運維複雜度。Webhook 更輕量且易除錯。

### Alternative C: 完全自動 LWW 無衝突記錄

**拒絕理由**：工程師手動調整的 `percentage` 值可能被 Paperclip 舊事件覆蓋，造成數據遺失。

---

## Consequences

**Positive**:
- 建立可擴展的事件驅動同步架構
- 衝突記錄提供可審計性
- Engineer Profile V2 支援 Row 138 的多工程師派遣優化

**Negative**:
- 非同步處理引入 eventual consistency（最長 ~1 分鐘延遲）
- 需要額外管理 `PAPERCLIP_WEBHOOK_SECRET` 環境變數

**Neutral**:
- `sync_conflicts` 表需要定期清理（建議 90 天保留期）

---

## Related

- Row 135: PromptEngineer 重建（`engineer_profiles` 表源頭）
- Row 138: VIS 批量遷移工具
- Row 139: VIS ↔ Roadmap 雙向同步引擎
- `docs/technical-selection/api-integration-layer-design.md`
