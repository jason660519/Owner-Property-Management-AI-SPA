根據目前的 git diff 與 untracked files，執行以下流程：

## 步驟一：Commit & Push

1. 執行 `git status` 和 `git diff`，分析所有變更
2. 排除敏感檔案（`.env`、`credentials.json` 等），不加入 staging
3. 將相關檔案 `git add`（優先逐檔加入，避免 `git add -A`）
4. 產生 commit message，格式：`<type>: <繁體中文描述>`
   - type: feat / fix / docs / refactor / style / test / chore
   - 若使用者提供 `$ARGUMENTS`，以此作為 commit message 或補充說明
5. 執行 commit（結尾加 `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`）
6. Push 到當前分支的 remote（若無 upstream，用 `-u` 設定）

## 步驟二：建立 Pull Request（可選）

如果 `$ARGUMENTS` 包含 `--pr` 或 `--pull-request`，則繼續：

1. 用 `git log` 和 `git diff main...HEAD` 分析所有 commits
2. 用 `gh pr create` 建立 PR：
   - Title: 簡短描述（< 70 字元）
   - Body 格式：
     ```
     ## Summary
     - <變更摘要>

     ## Test plan
     - [ ] <測試項目>

     🤖 Generated with [Claude Code](https://claude.com/claude-code)
     ```
3. 回傳 PR URL

如果沒有 `--pr` 參數，只執行步驟一。

## 注意事項

- 不要 commit 包含 secrets 的檔案
- 不要 force push
- 不要 amend 現有 commit（除非明確要求）
- Commit message 以繁體中文撰寫描述部分
