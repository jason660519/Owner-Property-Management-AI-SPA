# Commit Push PR Merge Cleanup Handoff

用於單一命令全自動流程：commit → push → 建立 PR → 檢查與 merge → cleanup 分支 → handoff。

## 執行模式

- 預設即為 full-auto，等同 `--pr --auto-merge --cleanup --handoff`
- 可選參數（需要時覆蓋預設）：
  - `--pr` / `--pull-request`
  - `--auto-merge`
  - `--cleanup` / `--cleanup-branch` / `--delete-branch`
  - `--handoff`

## 流程

1. 讀取 `git status` 與 `git diff`，分析所有變更。
2. 排除敏感檔案（如 `.env`、`credentials.json`），不得加入 staging。
3. 逐檔 `git add`（避免 `git add -A`）。
4. 產生 commit message：`<type>: <繁體中文描述>`（type: feat / fix / docs / refactor / style / test / chore）。
5. 執行 commit，並 push 到目前分支（若無 upstream，使用 `-u` 設定）。
6. 用 `git log` 與 `git diff main...HEAD` 整理 PR 內容，接著以 `gh pr create` 建立 PR，回報 PR URL。
7. 讀取 PR 狀態：`gh pr view --json mergeStateStatus,isDraft,reviewDecision,statusCheckRollup`。
8. 僅在以下條件全成立時自動合併：
   - PR 非 draft
   - 可合併（無 conflict）
   - CI 全綠
   - 無 `CHANGES_REQUESTED`
9. 條件符合時執行：`gh pr merge --squash --delete-branch=false`；若因權限或 repo 設定無法自動合併，明確提示 reviewer 使用 Squash and merge 手動合併。
10. PR 確認已 merge 後執行 cleanup：
    - 切回 `main` 並同步
    - 刪除遠端分支：`git push origin --delete <branch>`
    - 刪除本地分支：`git branch -d <branch>`
11. 產出 handoff：
    - 檔案：`project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`
    - 內容至少包含：變更摘要、測試結果、阻塞與下一步
12. 若在 merge 階段被阻塞，仍需產出 handoff，明確記錄阻塞原因與待辦。

## 注意事項

- 不要 commit 含 secrets 的檔案
- 不要 force push
- 不要 amend 既有 commit（除非明確要求）
- 不要刪除保護分支（`main` / `master` / `develop`）
