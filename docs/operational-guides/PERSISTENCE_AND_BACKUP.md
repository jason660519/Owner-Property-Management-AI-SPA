# 持久化與備份策略（業界做法與本專案建議）

## 一、業界常見做法摘要

### 1. 持久化（Persistence）

| 層面 | 常見做法 | 說明 |
|------|----------|------|
| **關聯式資料庫** | 託管服務（Supabase / RDS / Cloud SQL）＋ 自動儲存與複寫 | 由雲端保證寫入磁碟、多副本，本地開發用 Docker volume 或 bind mount |
| **物件儲存（檔案）** | 託管 S3 相容儲存（Supabase Storage / S3 / GCS） | 版本控制、跨區複寫可選；本地用 volume 或專案目錄綁定 |
| **3-2-1 原則** | 3 份資料、2 種媒體、1 份異地 | 生產環境：主庫＋備份＋異地/離線副本 |

### 2. 備份（Backup）

| 項目 | 業界常見 | 說明 |
|------|----------|------|
| **資料庫** | 每日全量 ＋ 連續 WAL 歸檔（PITR） | 全量：`pg_dump` 或託管每日快照；PITR 用於還原到任意時間點（Supabase Pro 等） |
| **物件儲存** | 版本控制、跨區複製、或定期同步到另一桶/帳號 | 避免誤刪與區域故障 |
| **排程** | Cron / 雲端排程（GitHub Actions、AWS EventBridge） | 每日固定時間全量、每週/每月保留策略 |
| **還原演練** | 每季至少一次 | 用備份實際還原到測試環境，確認 RTO/RPO 可接受 |

### 3. RPO / RTO

- **RPO（Recovery Point Objective）**：最多能接受丟失多長時間的資料（例如 24 小時 → 至少每日備份）。
- **RTO（Recovery Time Objective）**：從故障到恢復服務的目標時間（例如 4 小時內還原）。

本專案建議：**RPO ≤ 24h、RTO ≤ 4h** 作為初始目標；正式上線後可依合規再收緊。

---

## 二、本專案環境對應

| 環境 | 資料庫 | 儲存（照片/文件） | 持久化誰負責 | 備份誰負責 |
|------|--------|-------------------|--------------|------------|
| **本地開發** | Supabase 本地（Docker PostgreSQL） | Docker volume 或 `supabase/storage-data/` | 開發者（不 `db reset` / 不 `stop --no-backup`） | 可選：本機腳本定時 pg_dump ＋ 壓縮 storage 目錄 |
| **測試 / Staging** | Supabase Cloud（Free 或 Pro） | Supabase Storage | Supabase | Supabase 內建 ＋ 可選自訂腳本 |
| **正式（Production）** | Supabase Cloud Pro | Supabase Storage | Supabase | Supabase 內建每日備份 ＋ 可選自訂異地/離線副本 |

---

## 三、本專案具體建議

### 1. 持久化（你已經在做／可補強的部分）

- **本地**
  - 已設定 `config.toml` 的 `objects_path` 指向 `supabase/storage-data/*`，並在 `start.sh` 建立目錄；若 CLI 支援，檔案會寫在專案目錄，重啟不丟。
  - 避免隨意執行 `supabase db reset`、`supabase stop --no-backup`（見 [local-storage-persistence.md](./local-storage-persistence.md)）。
- **Staging / Production**
  - 一律使用 **Supabase Cloud**：DB 與 Storage 由 Supabase 負責持久化與多副本，無需自建磁碟。

### 2. 備份策略建議

| 環境 | 資料庫備份 | 儲存備份 | 排程建議 |
|------|------------|----------|----------|
| **本地** | 可選：`pg_dump` 到 `backups/` | 可選：壓縮 `supabase/storage-data/` | 手動或 cron 每日一次 |
| **Staging（Supabase Free）** | 每日 `pg_dump` 到本機或 S3 | 使用 `supabase storage download` 定期下載到本機/S3 | GitHub Actions 或 cron 每日 |
| **Production（Supabase Pro）** | 使用 Dashboard 內建每日備份（＋ 可選 PITR） | 內建儲存＋可選：定期 `storage download` 到另一桶或 S3 | 以 Supabase 為主，自訂腳本為輔 |

### 3. 定時備份實作要點

- **資料庫**
  - 本地：`pg_dump $LOCAL_DATABASE_URL > backups/db_$(date +%Y%m%d).sql`
  - 遠端：用 `DATABASE_URL`（或 Supabase 提供的 connection string）做 `pg_dump`，寫到本機或上傳 S3/另一儲存。
- **Storage**
  - 本地：若使用 `supabase/storage-data/`，直接 `tar` 該目錄即可。
  - 遠端：`supabase storage download --all ./backups/storage_$(date +%Y%m%d)`，再壓縮並可上傳到 S3/異地。
- **排程**
  - 本機：cron 例：`0 2 * * * /path/to/scripts/backup-supabase.sh`
  - CI：GitHub Actions 每日 02:00 跑備份腳本，並上傳 artifact 或 S3。

### 4. 還原演練

- 每季至少一次：用最近一次備份還原到**測試專案**或本機，確認應用能正常讀寫。
- 記錄還原耗時，對齊 RTO；若有缺口再調整備份頻率或還原流程。

---

## 四、本專案提供的腳本

- **`scripts/backup-supabase.sh`**  
  - 支援**本地**（依 `supabase status` 取得 DB URL）與**遠端**（依 `DATABASE_URL` 環境變數）。
  - 產出：`backups/YYYYMMDD_HHMMSS/database.sql`、可選的 `storage.tar.gz`（本地為 `storage-data` 目錄）。
  - 可被 cron 或 GitHub Actions 呼叫；遠端時需在 CI 設定 `DATABASE_URL` 與 Supabase 專案權限（例如 `supabase link` 或 Service Role Key）。

使用方式與參數見腳本內註解；排程範例見本文件「定時備份實作要點」。

---

## 五、總結建議（對應你的專案）

1. **持久化**  
   - 本地：維持目前 `objects_path` ＋ 不隨便 `db reset` / `stop --no-backup`。  
   - 正式：只用 Supabase Cloud，不自己管磁碟。

2. **備份**  
   - 本地：可選每日 `backup-supabase.sh` 到 `backups/`。  
   - Staging：建議每日跑一次腳本（DB dump ＋ Storage 下載）並存到本機或 S3。  
   - Production：以 Supabase 內建備份為主，可再加每週一次自訂腳本把 DB dump ＋ Storage 複製到異地（例如 S3 另一 bucket）。

3. **定時**  
   - 用 cron 或 GitHub Actions 每日固定時間執行備份腳本；保留天數建議：每日 7 天、每週 4 週、每月 3 個月（與 Supabase Pro 邏輯類似）。

4. **還原**  
   - 每季用備份做一次還原演練，確認 RPO/RTO 達標並更新本文件或 runbook。

這樣可對齊業界常見的持久化與定時備份機制，並貼合你目前 Supabase ＋ 本地開發的架構。
