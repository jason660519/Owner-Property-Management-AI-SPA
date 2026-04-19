# Commit Push PR

根據目前的 git diff 與 untracked files，執行以下整合流程（commit → PR → merge/cleanup → handoff）：

## 步驟一：Commit & Push

1. 執行 `git status` 和 `git diff`，分析所有變更
2. 排除敏感檔案（`.env`、`credentials.json` 等），不加入 staging
3. 將相關檔案 `git add`（優先逐檔加入，避免 `git add -A`）
4. 產生 commit message，格式：`<type>: <繁體中文描述>`
   - type: feat / fix / docs / refactor / style / test / chore
   - 若使用者提供 `$ARGUMENTS`，以此作為 commit message 或補充說明
5. 執行 commit
6. Push 到當前分支的 remote（若無 upstream，用 `-u` 設定）

## 步驟二：建立 Pull Request（可選）

如果 `$ARGUMENTS` 包含 `--pr` 或 `--pull-request`，則繼續：

1. 用 `git log` 和 `git diff main...HEAD` 分析所有 commits
2. 用 `gh pr create` 建立 PR：
   - Title: 簡短描述（< 70 字元）
   - Body 格式：

   ```markdown
     ## Summary
     - <變更摘要>

     ## Test plan
     - [ ] <測試項目>

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```

3. 回傳 PR URL

如果沒有 `--pr` 參數，只執行步驟一。

## 步驟三：PR 審核與合併（可選）

如果 `$ARGUMENTS` 包含 `--auto-merge` 或 `--full-auto`，則在 PR 建立後自動檢查並判斷是否合併：

1. 透過 `gh pr view --json` 取得 PR 狀態（包含 mergeStateStatus、isDraft、reviewDecision、statusCheckRollup）
2. 僅在以下條件全部成立時自動 merge：
   - PR 非 draft
   - 無 conflict（mergeStateStatus 可合併）
   - CI 全綠（status checks 全部成功）
   - 無 `CHANGES_REQUESTED`
3. 條件符合時執行 `gh pr merge --squash --delete-branch=false`
4. 條件不符合時，回報阻塞原因並停止在 PR 階段（不進行 cleanup）

## 步驟四：審核後刪除分支（可選）

如果 `$ARGUMENTS` 包含 `--cleanup`、`--cleanup-branch`、`--delete-branch` 或 `--full-auto`，則在完成審核後執行：

1. 先確認 PR 狀態：已完成 review、CI 通過、且 PR 已 merge 到 `main`
2. 取得當前分支名稱並做防呆檢查：
   - 禁止刪除 `main`、`master`、`develop`
   - 若目前仍在該分支，先切回 `main` 並 `git pull`
3. 刪除遠端分支：`git push origin --delete <branch>`
4. 刪除本地分支（安全模式）：`git branch -d <branch>`
5. 回報刪除結果（本地 / 遠端是否成功）

若 PR 尚未 merge，僅提示「目前不可刪除分支」並跳過此步驟。

## 步驟五：產生 handoff（可選）

如果 `$ARGUMENTS` 包含 `--handoff` 或 `--full-auto`，則在最後執行：

1. 依 `.claude/commands/handoff.md` 的規範產出自包含 handoff prompt
   - 若由 `--full-auto` 觸發，預設採用 handoff 的「Full-Auto 最小必要輸出模式」
2. 同時輸出到 chat fenced code block 與檔案
3. 檔案路徑：`project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`
4. 回報 handoff 檔案實際路徑

若前面流程在 PR 檢查階段被阻塞，handoff 仍需產出，並明確記錄阻塞原因與待辦。

## 建議參數組合

- 只做提交：`/commit-push-pr`
- 提交 + 建 PR：`/commit-push-pr --pr`
- 提交 + 建 PR + 自動合併：`/commit-push-pr --pr --auto-merge`
- 全流程到底：`/commit-push-pr --pr --full-auto`

## 注意事項

- 不要 commit 包含 secrets 的檔案
- 不要 force push
- 不要 amend 現有 commit（除非明確要求）
- 不要刪除保護分支（`main` / `master` / `develop`）
- Commit message 以繁體中文撰寫描述部分
- `--full-auto` 等同：`--pr --auto-merge --cleanup --handoff`
