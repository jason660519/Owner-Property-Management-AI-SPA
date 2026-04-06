# 資料備份管理系統 — TDD Progress Report

> **Row ID**: 027 | **報告日期**: 2026-04-06
> **對應 TDD Spec**: `/project-process/features/tdd-backup-system-20260406.md`

---

## 測試進度總覽

| 類型 | 計劃 | 已寫 | 通過 | 覆蓋率 |
|:-----|:-----|:-----|:-----|:-------|
| 單元測試 | 12 | 0 | 0 | 0% |
| 整合測試 | 4 | 0 | 0 | 0% |
| E2E 測試 | 5 | 0 | 0 | 0% |

**整體進度**: 0%（規格已定義，尚未開始撰寫測試腳本）

---

## 手動驗證紀錄（2026-04-06）

以下功能已透過手動測試驗證通過：

| 功能 | 驗證方式 | 結果 |
|:-----|:---------|:-----|
| 全表自動備份 | `curl POST /api/backup` → 154 張表、3850 筆 | Pass |
| Storage 檔案下載 | 備份後檢查 `files/` 目錄 → 16 檔案、44.6 MB | Pass |
| 備份結構正確性 | `find backup_xxx/ -type f` → JSON + photos + documents | Pass |
| v2 JSON 格式 | 檢查 `version: "2.0"`、`stats.tables` 物件 | Pass |
| 排程總覽表格 UI | 瀏覽器開啟頁面，4 行目的地、行內編輯 | Pass |
| 資料夾選擇器 Modal | 點「選擇資料夾」→ 顯示磁碟列表 → 進入子目錄 | Pass |
| browse-dirs API | `curl /api/backup/browse-dirs` → 回傳 /Volumes 列表 | Pass |
| 手動備份按鈕 | 點表格行的「備份」→ loading → Toast 報告 | Pass |
| Toast 報告內容 | 顯示目的地路徑、檔案結構、統計數字、耗時 | Pass |
| 本地設備同步 | 啟用 + 設定路徑 → 備份 → 檢查目的地資料夾 | Pass |
| 備份歷史表格 | 顯示表數、筆數、大小、操作按鈕 | Pass |

---

## 待辦

- [ ] 撰寫 `run-backup.ts` 單元測試（全表發現、SKIP_TABLES、Storage 遞迴）
- [ ] 撰寫 `settings.ts` 單元測試（normalizeBackupSettings 邊界值）
- [ ] 撰寫備份 → 還原 round-trip 整合測試
- [ ] 撰寫 v1/v2 相容性整合測試
- [ ] 撰寫 E2E 手動備份流程測試
- [ ] 撰寫 E2E 資料夾選擇器測試
