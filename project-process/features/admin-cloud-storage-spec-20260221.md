# 功能規格：超級管理員-雲端空間管理平台 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`admin-cloud-storage-spec-20260221.html`

---

# 功能規格：超級管理員-雲端空間管理平台

超級管理員

0%

待開發

2026/02/21

5 SP

中

## 一、功能描述

超級管理員可透過此平台集中管理 Supabase Storage 的雲端空間使用狀況，包含查看各用戶的儲存配額、瀏覽全平台檔案（圖片、文件、音訊）、設定個別用戶配額上限、批次操作檔案，以及在配額超標時接收警示通知。

## 二、驗收標準 (Acceptance Criteria)

- 顯示總儲存空間與已用空間的視覺化圓餅圖及長條圖，數據即時從 Supabase Storage API 拉取

- 可瀏覽所有使用者上傳的檔案（圖片、文件、音訊），支援依檔案類型、上傳者、上傳時間篩選

- 可對個別使用者設定儲存配額上限（如：房東 5GB、租客 1GB），並即時生效

- 當某用戶使用空間超過配額 75% 時，自動警示管理員（系統通知 + Email）

- 支援批次刪除、下載（壓縮 ZIP）或移動檔案至封存資料夾

## 三、頁面版面示意

┌─────────────────────────────────────────────────────────┐
│  雲端空間管理                         [篩選] [批次操作]  │
├──────────────┬──────────────────────────────────────────┤
│  空間總覽     │  ┌──────────────┐  總容量：500 GB        │
│  ────────── │  │  圓餅圖       │  已使用：187 GB (37%)  │
│  [圓餅圖]    │  │              │  可用：313 GB           │
│              │  └──────────────┘                        │
│  配額警示     │  ─────────────────────────────────────── │
│  ⚠ 3 位超標  │  用戶配額使用率 Top 5：                   │
│              │  landlord_A   [██████████ 92%] 9.2/10GB │
│              │  landlord_B   [███████    73%] 3.6/5GB  │
│              │  tenant_C     [██████     65%] 0.65/1GB │
├──────────────┴──────────────────────────────────────────┤
│  篩選：用戶 [___]  檔案類型 [全部▼]  日期 [____~____]   │
├───────┬──────────────┬────────┬──────────┬─────────────┤
│選取   │  檔案名稱     │  大小  │  上傳者  │  上傳時間    │
├───────┼──────────────┼────────┼──────────┼─────────────┤
│  □   │ photo_001.jpg│ 2.3MB  │ user_123 │ 2026-02-20  │
│  □   │ contract.pdf │ 0.8MB  │ user_456 │ 2026-02-19  │
├───────┴──────────────┴────────┴──────────┴─────────────┤
│  [刪除選取]  [下載ZIP]  [移至封存]              [1/50頁] │
└─────────────────────────────────────────────────────────┘

## 四、資料模型

| 欄位 / 資料表 | 類型 | 說明 |
| --- | --- | --- |
| `storage_quotas` | 資料表 | 用戶配額設定（user_id, quota_bytes, used_bytes, updated_at） |
| `storage_files` | View | 從 Supabase Storage API 彙整的檔案清單（id, name, size, owner_id, bucket, path, created_at） |
| `storage_alerts` | 資料表 | 配額警示紀錄（user_id, threshold_percent, triggered_at, resolved_at） |
| `quota_bytes` | BIGINT | 配額上限（單位：Bytes） |
| `used_bytes` | BIGINT | 已使用空間（由 Storage API 定期同步） |

## 五、技術實作方向

空間統計：透過 Supabase Storage Management API (`supabase.storage.listBuckets()` + `listFiles()`) 統計各 Bucket 使用量，以 Server Action 定時同步至 `storage_quotas` 表。

配額警示：Supabase Edge Function（Cron Job）每小時執行一次，檢查 `used_bytes / quota_bytes > 0.75`，寫入 `storage_alerts` 並觸發 Email 通知（使用 Resend API）。

批次操作：刪除使用 `supabase.storage.from(bucket).remove(paths[])`；下載ZIP由 Next.js Route Handler 串流打包；移至封存資料夾使用 `copy()` + `remove()` 雙步驟。

安全性：所有 Storage 管理操作須使用 `service_role` key（透過 Server Action），前端不直接暴露；RLS 確保一般用戶只能存取自己的檔案。

## 六、相依功能

- Supabase Storage Buckets 設定（需預先建立 `properties`、`documents`、`avatars` 等 Bucket）

- 使用者身份驗證系統（需 user_id 映射）

- Email 通知系統（Resend API 整合）

- 超級管理員-網路安全－隱私審計管理功能（共用稽核日誌架構）
