# 資料備份管理系統 — Dev Spec

> **Row ID**: 027 | **建立日期**: 2026-04-06 | **最後更新**: 2026-04-06
> **頁面路徑**: `/superadmin/settings/backup`

---

## 1. 功能概述

完整的資料備份系統，涵蓋 DB 全表自動備份 + Supabase Storage 檔案下載 + 多目的地排程 + 雲端同步 + 結構化備份報告。

## 2. 架構分層

| Layer | 名稱 | 說明 |
|:------|:-----|:-----|
| L1 | 腳本保護 | `scripts/backup-metadata.sh`、`stop.sh` 停機前自動備份、`start.sh` 偵測不一致提示還原 |
| L2 | 排程總覽表格 UI | 橫向表格，每行一個目的地，行內編輯排程，每行有手動備份按鈕 |
| L2.5 | 資料夾選擇器 Modal | `/api/backup/browse-dirs`，自動偵測 macOS/Linux/Windows 磁碟，子目錄瀏覽 |
| L3 | 雲端備份整合 | Google Drive Service Account + AWS S3 Access Key |
| L3.5 | 排程執行器 | `/api/cron/backup-schedules`，CRON_SECRET 驗證 |
| L4 | 執行稽核 | `backup_run_logs` migration，手動/排程皆寫入 |
| L5 | 全表自動備份 v2.0 | PostgREST schema 自動發現所有 public 表，SKIP_TABLES 可排除 |
| L6 | Storage 檔案備份 | 遞迴下載 property-photos + property-documents bucket 實際檔案 |
| L7 | 備份完成 Toast 報告 | 固定右上角結構化報告卡片，可 resize |

## 3. 備份結構

```
backups/backup_YYYYMMDD_HHMMSS/
├── backup_YYYYMMDD_HHMMSS.json   ← DB 全部表資料（~2.5 MB）
└── files/
    ├── property-photos/            ← 照片（按 property UUID 分資料夾）
    │   ├── {property-id}/
    │   │   ├── xxx.jpg
    │   │   └── ...
    │   └── ...
    └── property-documents/         ← 附件文檔（PDF 等）
        └── {property-id}/
            └── xxx.PDF
```

## 4. 備份目的地

| 目的地 | 啟用方式 | 說明 |
|:-------|:---------|:-----|
| 專案目錄 | 常駐（不可關閉） | `apps/superadmin/backups/`，最多保留 30 份 |
| 本地設備 | Toggle + 資料夾選擇器 | 使用者自選路徑（如 `/Volumes/USB`、`D:\Backups`） |
| Google Drive | 需先設定金鑰 → Toggle | Service Account JSON，上傳至指定資料夾 |
| AWS S3 | 需先設定金鑰 → Toggle | Access Key + Secret，上傳至指定 bucket/prefix |

## 5. API Routes

| Route | Method | 說明 |
|:------|:-------|:-----|
| `/api/backup` | GET | 列出所有備份 |
| `/api/backup` | POST | 建立新備份（全表 + 檔案下載） |
| `/api/backup/[id]` | GET | 下載備份 JSON |
| `/api/backup/[id]` | DELETE | 刪除備份 |
| `/api/backup/restore` | POST | 冪等還原（支援 v1 + v2） |
| `/api/backup/health` | GET | 儲存健康檢查 |
| `/api/backup/settings` | GET/POST | 備份設定（目的地、排程） |
| `/api/backup/cloud-settings` | GET/POST | 雲端目的地設定 |
| `/api/backup/run-logs` | GET | 備份執行記錄 |
| `/api/backup/browse-dirs` | GET | 本地資料夾瀏覽 |
| `/api/cron/backup-schedules` | GET | 排程觸發（CRON_SECRET） |

## 6. 關鍵檔案

| 檔案 | 說明 |
|:-----|:-----|
| `apps/superadmin/app/superadmin/settings/backup/page.tsx` | 備份管理頁面（排程表格 + Toast 報告） |
| `apps/superadmin/lib/backup/run-backup.ts` | 備份核心邏輯（全表發現 + 檔案下載） |
| `apps/superadmin/lib/backup/settings.ts` | 備份設定型別與預設值 |
| `apps/superadmin/lib/backup/cloudUpload.ts` | 雲端上傳（Google Drive / S3） |
| `apps/superadmin/lib/backup/log-backup-run.ts` | 執行記錄寫入 |
| `apps/superadmin/app/api/backup/browse-dirs/route.ts` | 資料夾瀏覽 API |

## 7. 擴充指南

### 新增 DB 表
無需修改。`run-backup.ts` 自動發現所有 `public` schema 表。若要排除某表，加入 `SKIP_TABLES` set。

### 新增 Storage bucket
在 `run-backup.ts` 的 `STORAGE_BUCKETS` 陣列加入新 bucket 名稱：
```typescript
const STORAGE_BUCKETS = ['property-photos', 'property-documents', 'user-avatars'];
```

### 新增備份目的地
1. 在 `page.tsx` 的 `DestinationKey` type 加入新 key
2. 在 `rows` 陣列加一行（含 icon、label）
3. 在 `isDestEnabled` / `handleDestToggle` / `getDestChecked` 加對應邏輯
4. 在 `run-backup.ts` 的 `buildDestinations` 加入新目的地判斷

### 增量備份（未來需要時）
目前全量備份（DB ~2.5MB + 檔案 ~45MB = 2.3 秒），短期內不需要增量。資料量成長後可在 `runBackup` 中：
- 比對上次備份 JSON 的 hash
- 或使用 `updated_at > lastBackupTime` 篩選差異資料
