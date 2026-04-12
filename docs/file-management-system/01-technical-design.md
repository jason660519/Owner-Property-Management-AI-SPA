# 檔案整理與歸檔系統：技術設計

## 目標

- 以「規則配置」定義檔名/目錄規範與可自動化動作（歸檔、刪除、重複檔案處理）。
- 提供掃描報告（JSON + Markdown）與整理計畫（Plan）。
- 套用計畫前自動備份；支援回滾以確保資料安全。
- 支援 CLI 與 Superadmin UI（http://localhost:3001/superadmin/tools/file-manager）。

## 架構

- UI：Next.js（apps/superadmin）頁面
  - 路徑：/superadmin/tools/file-manager
  - 功能：編輯規則 JSON、掃描、產生計畫、套用、回滾、查看報告
- API（受 middleware 保護，Superadmin 才可存取）
  - /superadmin/api/file-manager/config：讀寫規則
  - /superadmin/api/file-manager/scan：掃描並回傳報告
  - /superadmin/api/file-manager/plan：掃描 + 產生整理計畫
  - /superadmin/api/file-manager/apply：套用計畫（含備份）
  - /superadmin/api/file-manager/rollback：回滾指定 planId
  - /superadmin/api/file-manager/history：套用歷史
- 引擎（Node 檔案系統操作）：apps/superadmin/lib/file-manager

## 規則配置（Config）

預設配置位置：

- apps/superadmin/config/file-manager.rules.json

主要區塊：

- scan.skipDirs：掃描時忽略的目錄（避免 node_modules、.git、build 產物）
- standards.allowedRoot：根目錄允許的檔案/資料夾清單（用於偵測「根目錄雜物」）
- standards.namingRules：命名規範（glob + regex）
- actions.archiveRules：歸檔規則（glob → archiveRoot/date/subdir/...）
- actions.deleteRules：刪除規則（glob）
- actions.backupRetentionDays：備份保留天數（cleanup 用）
- redundancy：重複檔案偵測（hash）

## 整理計畫（Plan）

Plan 由掃描結果 + Config 推導，動作類型：

- archive：搬移至 archiveRoot（保留原相對路徑）
- delete：刪除檔案（套用前會先備份）
- move：保留給未來擴充（目前預設不產生）

Plan 會做「同來源路徑」去重，並對高風險動作產生 warnings（例如刪除 apps/ 下的檔案）。

## 備份與回滾

套用計畫時會建立：

- backups/file-manager/<planId>/files/…：原檔案快照（以原相對路徑存放）
- backups/file-manager/<planId>/manifest.json：套用紀錄（含備份位置、來源、目的地）
- backups/file-manager/<planId>/plan.md、apply.md：人類可讀報告

回滾會依 manifest 將備份檔複製回原路徑；對於 archive/move，會嘗試移除目前目的地檔案後再還原。

## 安全策略

- 預設採「安全優先」：歸檔目的地預設在 backups/file-manager/archive（避免把暫存物或敏感檔移入 docs/ 造成誤提交）。
- 套用前必備份，且每個動作都會檢查路徑必須在 projectRoot 下。
- File Manager 可透過環境變數停用（production 預設仍可用，但可用 FILE_MANAGER_ENABLE 進一步控管）。
