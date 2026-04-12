# 檔案整理與歸檔系統：維護指南

## 主要檔案位置

- 規則預設值：apps/superadmin/config/file-manager.rules.json
- 引擎：apps/superadmin/lib/file-manager/*
- UI：apps/superadmin/app/superadmin/tools/file-manager/page.tsx
- API：apps/superadmin/app/superadmin/api/file-manager/*
- CLI scripts：apps/superadmin/scripts/file-manager-*.ts

## 擴充規則（建議做法）

1. 先把新規則設定為「只報告」：
   - 用 standards.namingRules 增加違規偵測
   - 用 archiveRules/deleteRules 先對非常確定的 pattern 下手（例如 .DS_Store、*.tmp、tmp-*.yml）
2. 觀察一段時間 metrics.json 與 scan 報告，再逐步擴大自動化範圍
3. 避免把自動化動作直接套用在 apps/ 與 packages/ 的原始碼，除非能保證不影響 build

## 變更引擎時的測試建議

- 以 UI 跑一次 Scan / Plan（不 apply）確認報告格式與效能
- 用 CLI：
  - npm run file-manager:scan
  - npm run file-manager:plan
- 若要測試 apply：
  - 先用新增的暫存檔做 end-to-end（例如在 repo 根目錄新增 tmp-test.txt），套用後再回滾

## 風險控管

- 所有套用必備份，備份路徑固定在 backups/file-manager/<planId>/files
- apply 時會避免覆寫目的地檔案（若目的地存在會改用 __<n> 後綴）
- rollback 會優先移除目前目的地檔案後再還原來源（避免同名衝突）

## 版本與相容性

- Config 目前為 version=1；若要升級，建議：
  - 新增 schema v2
  - 支援從 v1 轉換到 v2（或提供 migrate 命令）
  - UI 顯示當前版本與 migrate 提示

## 停用/限制

- production 若要全面停用，設定環境變數：
  - FILE_MANAGER_ENABLE=false（或不要設定，並依 NODE_ENV 控制）
- 若需要更嚴格，可把 enable 條件改成必須 FILE_MANAGER_ENABLE=true
