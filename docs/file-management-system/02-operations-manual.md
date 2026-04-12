# 檔案整理與歸檔系統：操作手冊

## UI（推薦）

路徑：

- http://localhost:3001/superadmin/tools/file-manager

流程：

1. 規則配置：可用「簡易編輯模式（白話）」勾選常用策略，或直接編輯 JSON
2. 執行掃描：取得違規清單、重複檔案候選與摘要
3. 產生整理計畫：依規則產生可套用的歸檔/刪除動作（點「觀看計畫」查看細節與風險警告）
4. 套用計畫：系統會先備份，再搬移/刪除
5. 回滾：若套用後發現誤判，選擇 planId 進行回滾

產出位置：

- backups/file-manager/<planId>/manifest.json
- backups/file-manager/<planId>/files/…
- backups/file-manager/<planId>/plan.md
- backups/file-manager/<planId>/apply.md
- backups/file-manager/metrics.json（掃描趨勢）

## CLI（自動化/排程用）

前置：

- 以 workspace superadmin 執行（或在 monorepo 根目錄用 npm scripts）

掃描（只輸出報告，不產生 plan）：

```bash
npm run file-manager:scan
```

掃描 + 產生 plan：

```bash
npm run file-manager:plan
```

需要讓 CI 或 pre-push 依掃描結果失敗（例如有 error 就 fail）：

```bash
cd apps/superadmin
npm run file-manager:scan -- --fail-on error
```

用 plan.json 直接套用（高風險，建議只在本機、且先在 UI 內確認 plan）：

```bash
cd apps/superadmin
npm run file-manager:apply -- --plan backups/file-manager/reports/<id>.plan.json
```

回滾：

```bash
cd apps/superadmin
npm run file-manager:rollback -- --planId <planId>
```

清理過舊備份（依 backupRetentionDays）：

```bash
npm run file-manager:cleanup
```

## 常見問題

- 套用計畫沒有動作？
  - 代表目前規則只會處理特定 pattern（保守預設），可在 UI 調整 archiveRules/deleteRules
- 報告檔案越來越多？
  - 以 npm run file-manager:cleanup 清理過舊備份與報告
