# Commit Push PR

根據目前的 git diff 與 untracked files，執行整合流程（commit → PR → merge/cleanup → handoff）。

## 適用參數

- `--pr` / `--pull-request`：建立 PR
- `--auto-merge`：建立 PR 後自動檢查並嘗試合併
- `--cleanup` / `--cleanup-branch` / `--delete-branch`：PR 合併後清理分支
- `--handoff`：產出 handoff
- `--full-auto`：等同 `--pr --auto-merge --cleanup --handoff`

## 步驟一：Commit 與 Push

1. 執行 `git status` 與 `git diff`，分析變更。
2. 排除敏感檔案（如 `.env`、`credentials.json`），不得加入 staging。
3. 逐檔 `git add`（避免 `git add -A`）。
4. 優先維持「單一主題、單一 commit」：
   - 若變更跨多個主題，先拆成多個邏輯清楚的 commit。
   - 目標是讓最終 squash 後仍保留清楚脈絡。
5. 產生 commit message：`<type>: <繁體中文描述>`。
   - type: feat / fix / docs / refactor / style / test / chore
   - 若使用者提供 `$ARGUMENTS`，可作為 message 或補充說明
6. 執行 commit。
7. push 到目前分支（若無 upstream，使用 `-u` 設定）。

## 步驟二：建立 PR（可選）

當 `$ARGUMENTS` 含 `--pr` 或 `--pull-request` 時執行。

1. 用 `git log` 與 `git diff main...HEAD` 分析 commits。
2. 用 `gh pr create` 建立 PR。
   - Title：簡短描述（建議 < 70 字元）
   - 合併策略預設：優先使用 Squash and merge
   - 若分支有多個 commit，PR Body 必須註記建議採用 squash
3. PR Body 建議格式：

```markdown
## Summary
- <變更摘要>

## Test plan
- [ ] <測試項目>

## Merge strategy
- 建議使用 Squash and merge

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

4. 回報 PR URL。

若未提供 `--pr`，只執行步驟一。

## 步驟三：審核與合併（可選）

當 `$ARGUMENTS` 含 `--auto-merge` 或 `--full-auto` 時執行。

1. 用 `gh pr view --json` 讀取狀態（`mergeStateStatus`、`isDraft`、`reviewDecision`、`statusCheckRollup`）。
2. 僅在以下條件全成立時自動 merge：
   - PR 非 draft
   - 無 conflict（可合併）
   - CI 全綠
   - 無 `CHANGES_REQUESTED`
3. 條件符合時執行：`gh pr merge --squash --delete-branch=false`。
4. 若無法自動 merge（權限或 repo 設定），需明確提示 reviewer 以 Squash and merge 手動合併。
5. 條件不符合時，回報阻塞原因並停在 PR 階段（不執行 cleanup）。

## 步驟四：清理分支（可選）

當 `$ARGUMENTS` 含 `--cleanup`、`--cleanup-branch`、`--delete-branch` 或 `--full-auto` 時執行。

1. 先確認 PR 已完成 review、CI 通過，且已 merge 到 `main`。
2. 取得目前分支並做防呆：
   - 禁止刪除 `main`、`master`、`develop`
   - 若仍在目標分支，先切回 `main` 並 `git pull`
3. 刪除遠端分支：`git push origin --delete <branch>`。
4. 刪除本地分支（安全模式）：`git branch -d <branch>`。
5. 回報本地與遠端刪除結果。

若 PR 未 merge，僅提示目前不可刪除分支並跳過。

## 步驟五：產出 Handoff（可選）

當 `$ARGUMENTS` 含 `--handoff` 或 `--full-auto` 時執行。

1. 依 `.claude/commands/handoff.md` 規範產出 handoff prompt。
   - 若由 `--full-auto` 觸發，預設採用 Full-Auto 最小必要輸出模式
2. 輸出 handoff 工作交接檔。
3. 路徑格式：`project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`。
4. 回報 handoff 實際路徑。

若 PR 檢查階段被阻塞，handoff 仍需產出並記錄阻塞原因與待辦。

## 注意事項

- 不要 commit 含 secrets 的檔案
- 不要 force push
- 不要 amend 既有 commit（除非明確要求）
- 不要刪除保護分支（`main` / `master` / `develop`）
- commit message 的描述部分使用繁體中文
- PR 合併策略預設採用 squash（自動與人工合併皆相同）
