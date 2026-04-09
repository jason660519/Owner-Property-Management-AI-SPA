# 資料備份管理系統 — TDD Spec

> **Row ID**: 027 | **建立日期**: 2026-04-06
> **對應 Dev Spec**: `/project-process/features/backup-system-dev-spec-20260406.md`

---

## 1. 測試範圍

### 單元測試（Unit Test）

| 模組 | 測試目標 | 優先級 |
|:-----|:---------|:-------|
| `run-backup.ts` | 全表自動發現邏輯、SKIP_TABLES 過濾、Storage 遞迴列檔、備份 JSON 結構驗證 | P0 |
| `settings.ts` | `normalizeBackupSettings` 預設值填充、`normalizeSchedule` 邊界值 | P1 |
| `log-backup-run.ts` | `insertBackupRunLog` 參數正確性 | P1 |
| `cloudUpload.ts` | Google Drive / S3 上傳成功/失敗路徑 | P2 |

### 整合測試（Integration Test）

| 測試案例 | 說明 |
|:---------|:-----|
| 備份 → 還原 round-trip | 建立備份後還原，驗證資料完整性 |
| v1 → v2 相容性 | v1 格式備份檔可被 v2 還原 API 正確處理 |
| browse-dirs API | macOS 環境下回傳正確的 /Volumes 列表 |
| 排程觸發 | 模擬 CRON 呼叫，驗證 auto_schedule 備份建立 |

### E2E 測試（Acceptance Test）

| 測試案例 | 使用者流程 |
|:---------|:-----------|
| 手動備份流程 | 開啟備份頁 → 點「立即備份」→ 驗證 Toast 報告顯示 → 備份歷史新增一筆 |
| 單一目的地備份 | 啟用本地設備 → 選擇資料夾 → 點該行「備份」→ 驗證檔案寫入目的地 |
| 排程設定 | 設定每日排程 → 儲存 → 重新載入 → 驗證排程保持 |
| 還原流程 | 點備份歷史的還原按鈕 → 確認 → 驗證 Toast 顯示還原結果 |
| 資料夾選擇器 | 啟用本地設備 → 點「選擇資料夾」→ 瀏覽磁碟 → 進入子目錄 → 選擇 → 驗證路徑更新 |

## 2. 測試腳本目錄

```
apps/superadmin/unit_test/027/    ← 單元與整合測試
apps/superadmin/e2e/027/          ← E2E 驗收測試
```

## 3. 測試資料準備

- 測試用 Supabase 需有至少 1 筆 `system_settings`、1 筆 `saved_prompts`
- Storage bucket `property-photos` 需有至少 1 張圖片
- 測試用本地設備路徑使用 `/tmp/test-backup-dest/`

## 4. Mock 策略

| 依賴 | Mock 方式 |
|:-----|:----------|
| Supabase Admin Client | 使用真實本地 Supabase（整合測試） |
| Storage download | 使用真實本地 Storage（整合測試） |
| Google Drive / S3 | Mock fetch（單元測試） |
| 檔案系統 | 使用 `/tmp` 暫存目錄（整合測試） |
