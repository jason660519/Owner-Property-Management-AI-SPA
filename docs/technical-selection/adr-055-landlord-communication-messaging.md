# ADR-055: 房東溝通頁面（即時訊息）架構決策

**建立日期**: 2026-04-13  
**建立者**: Architect Agent  
**狀態**: Accepted  
**Row ID**: 055  
**功能**: 房東的溝通頁面 — 架構設計  
**對應 UI**: `apps/web/app/(dashboard)/landlord/messages`（規格中的 `web/landlord/communication` 與此為同一產品能力；實作時以 dashboard 路由為準，或另設 `/landlord/communication` redirect）

---

## 背景 (Context)

房東需與租客／買家即時溝通，並滿足：

| # | 驗收 | 架構含義 |
|---|------|----------|
| 1 | 即時訊息 | 低延遲送達與列表更新 |
| 2 | 已讀／回條 | 每則訊息需有 `read_at`（收方視角） |
| 3 | 圖片與檔案（≤10MB） | 物件儲存 + metadata + 簽名 URL |
| 4 | 新訊息推播（站內 + Email） | 事件驅動通知管線 |
| 5 | 依日期搜尋、保留 2 年 | 索引與生命週期／歸檔策略 |

既有實作：

- 前端：`messageService` 仍以 `isMock = true` 為主，列表使用 **10s polling**（`refetchInterval`）。
- 資料庫：`public.messages` 已定義於 `20260130000001_common_user_tables.sql`（`thread_id`, `from_user_id`, `to_user_id`, `content`, `message_type`, `attachment_urls`, `is_read`, `read_at` 等）。
- 通知：`public.notification_queue` 與 `notification_preferences` 已存在，可承接離線 Email／站內通知。

---

## 決策 (Decisions)

### 1. 即時通道：Supabase Realtime（Postgres Changes）為主，Polling 為降級

**選定**：以 **Supabase Realtime** 訂閱 `public.messages` 的 `INSERT` / `UPDATE`（收／發方為目前使用者相關列），在聊天視窗與列表即時合併新訊息與已讀狀態。

**理由**：

- 專案已標準化 Supabase（見 `docs/technical-selection/tech-stack-overview.md`），無需自建 WebSocket 服務。
- Realtime 與 RLS 一併由 Supabase 驗證，與現有 `messages` 政策一致。
- 實作面：`supabase.channel(...).on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: '...' })` 即可。

**降級**：保留 **短時間隔 polling**（例如 10–30s）或手動 refetch，作為 Realtime 斷線、行動網路不穩時的後備。

**不採用自建 WebSocket 服務**：維運與水平擴展成本高，且與 BaaS 重複。

**不採「僅 polling」作為最終形態**：無法滿足「即時」體驗與 Acceptance #1；可作為 Phase 0 或降級。

---

### 2. 資料模型：`messages` 表延伸（非重造）

**既有欄位已涵蓋核心**：sender/receiver（`from_user_id` / `to_user_id`）、`content`、`message_type`、`read_at`、`attachment_urls`、`thread_id`。

**建議後續 migration（實作任務執行，非本 ADR 直接改檔）**：

| 欄位 / 結構 | 目的 |
|-------------|------|
| `conversation_id` UUID（可選，與 `thread_id` 語意統一） | 將多則訊息綁在同一對話串；若團隊同意，可約定 `thread_id` 即 conversation，不再新增欄位。 |
| `attachments` JSONB | 取代或補充 `attachment_urls[]`：每筆 `{ storage_path, file_name, mime_type, size_bytes }`，利於 10MB 驗證與顯示。 |
| `landlord_property_id` UUID（可選） | 對話與物件掛鉤，利於房東後台篩選（若產品需要「依物件」檢視）。 |

**已讀**：維持「收方列」上 `is_read` + `read_at`；房東讀取租客訊息時更新 `to_user_id = landlord` 且 `from_user_id = tenant` 的列（依實際收方欄位設計）。一對一對話足夠。

**索引**（既有 `created_at DESC` 已支援日期排序）：

- 新增複合索引建議：`(to_user_id, created_at DESC)`、`(from_user_id, created_at DESC)`（若尚未存在）以優化列表與日期區間查詢。

**2 年保留**：

- 應用層或排程 Job：刪除／歸檔 `created_at < now() - 2 years` 的列（或搬到冷儲存 `archived_messages`）。
- 法遵與備援需求應由營運單獨確認；本 ADR 僅定「保留策略必須可自動化」。

---

### 3. 附件：Supabase Storage

**選定**：專用 bucket（例如 `message-attachments`），路徑規則 `{conversation_id}/{message_id}/{filename}`。

**理由**：

- 與 DB 中大檔二進位分離，利於 CDN 與權限邊界。
- Supabase Storage 與 Auth 整合，可對 **signed URL** 限時下載。

**限制**：

- 上傳前於 API Route 或 Edge Function 驗證 **≤ 10MB**（與驗收一致）。
- MIME 白名單（圖片 + 常見文件）可選，降低惡意檔案風險。

**DB**：訊息列只存 `attachments` metadata 或 `storage` path，不存完整二進位。

---

### 4. 通知：站內 + Email

**站內（新訊息）**：

- **優先**：Realtime 訂閱 `messages` 後，前端立即更新未讀數與 toast（若產品需要）。
- **補充**：`notification_preferences.notify_new_message` 為 true 時，於 `INSERT` 訊息後寫入 **in_app** 類型記錄（可沿用 `notification_queue` 或另建輕量 `user_notifications` 表—若實作選擇佇列，與 Email 一致）。

**Email（離線／摘要）**：

- 訊息寫入後，非同步 enqueue `notification_queue`（`notification_type = 'email'`），由既有或新建的 **worker**（Supabase Edge Function / Next.js cron / 外部 worker）發送。
- 尊重 `notification_preferences`（digest、quiet hours）。

**不強制行動推播（FCM/APNs）**：驗收寫「系統通知」— 瀏覽器 Web Push 可列為 Phase 2。

---

### 5. 前端整合要點

- 將 `messageService.isMock` 改為 false 後，需接上 Realtime + 既有 REST／Supabase client。
- React Query：`invalidateQueries` 仍可在 mutation 後使用；Realtime 事件應 `setQueryData` 或 `invalidate` 以減少閃爍。
- 與 `customer-details` 內 `channel: 'message'` 的溝通紀錄可視為同一 domain 的摘要入口，避免重複造輪子（連結深淺層 conversation）。

---

## 備選方案 (Alternatives Considered)

| 方案 | 結論 |
|------|------|
| 自建 WebSocket | 拒絕：成本高，與 Supabase 重疊。 |
| 僅 HTTP 長輪詢 | 拒絕：連線數與延遲不如 Realtime。 |
| 將訊息只存 JSONB 於單一「對話文件」 | 拒絕：不利於已讀、搜尋、RLS 與 Realtime 細粒度事件。 |

---

## 後果 (Consequences)

**優點**：

- 與現有 `messages` + `notification_queue` 一致，實作增量小。
- Realtime 滿足即時性且無需新基礎設施。

**風險與待辦**：

- Realtime 訂閱需正確 `filter`，避免客戶端收到無關列（RLS 仍會擋，但流量與電池需留意）。
- 2 年保留需 **scheduled job** 與備份策略，應由實作任務附帶 runbook。
- 需一次 migration 啟用 `attachments` JSONB／Storage（遵守專案「僅新增 migration 檔」規範）。

---

## Related

- `supabase/migrations/20260130000001_common_user_tables.sql`（`messages`, `notification_queue`）
- `apps/web/services/messageService.ts`、`apps/web/app/(dashboard)/landlord/messages/page.tsx`
- `docs/technical-selection/tech-stack-overview.md`
- `docs/product-overview/technical-architecture.md`（即時通訊項）
