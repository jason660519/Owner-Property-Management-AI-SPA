# Commit Push PR

用於「開發完成後、PR 建立前」的前段流程：分析變更 → commit → push → 建立 PR。

## 流程

1. 執行 `git status` 與 `git diff`，分析變更與風險。
2. 排除敏感檔案（如 `.env`、`credentials.json`），不得加入 staging。
3. 逐檔 `git add`（避免 `git add -A`）。
4. 優先維持「單一主題、單一 commit」：
   - 若變更跨多個主題，先拆成多個邏輯清楚的 commit。
   - 讓 reviewer 與後續 squash 都能保留清楚脈絡。
5. 產生 commit message：`<type>: <繁體中文描述>`。
   - type: feat / fix / docs / refactor / style / test / chore
   - 若使用者提供 `$ARGUMENTS` 文案，優先採用並做必要潤飾
6. 執行 commit。
7. push 到目前分支（若無 upstream，使用 `-u` 設定）。
8. 當 `$ARGUMENTS` 含 `--pr` 或 `--pull-request` 時，建立 PR：
   - 先用 `git log` 與 `git diff main...HEAD` 整理 PR 內容
   - 用 `gh pr create` 建立 PR
   - PR Body 需包含 Summary / Test plan，並建議使用 Squash and merge
   - 回報 PR URL

## 與其他命令的分工

- 本命令只處理 commit、push、PR 建立。
- merge、cleanup、handoff 由 `/commit-push-pr-merge-cleanup-handoff` 負責。

## 注意事項

- 不要 commit 含 secrets 的檔案
- 不要 force push
- 不要 amend 既有 commit（除非明確要求）
- commit message 的描述部分使用繁體中文