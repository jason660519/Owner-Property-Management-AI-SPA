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
2. **預檢敏感 / 不該 commit 的檔案**（不得加入 staging）：
   - `.env*`、`credentials.json` 等明確列在 `.gitignore` 裡的
   - **worktree 內常見的本機 symlink**：`node_modules`、`apps/*/node_modules`、`.claude/launch.json`、`.env.local` symlink（皆為本機 dev 起 server 用，不該入庫）
   - 用 `git status --ignored --short | grep -iE 'env|launch\.json|node_modules'` 二次確認 `!!` 標記為 ignored
3. 逐檔 `git add <path>`（**不要** `git add -A` / `git add .`，否則容易把 untracked symlinks 一起拖進來）。
4. 產生 commit message：`<type>: <繁體中文描述>`（type: feat / fix / docs / refactor / style / test / chore）。
5. **預檢 husky hook 是否可運作**（worktree 第一次 commit 必跑這檢查）：
   - 若 `.husky/_/husky.sh` 不存在 → 建一個 noop shim（`mkdir -p .husky/_ && printf '#!/usr/bin/env sh\n# husky shim\n' > .husky/_/husky.sh`）
   - 此 shim 不會被 git 追蹤（husky 慣例 `_/` 不入庫），單純讓 `commit-msg` hook 的 `. .husky/_/husky.sh` 不會 fail
   - **不要** `--no-verify` 跳過，那違反 hook 安全規則
6. 執行 commit，並 push 到目前分支（若無 upstream，使用 `-u` 設定）。
7. 用 `git log` 與 `git diff main...HEAD` 整理 PR 內容，接著以 `gh pr create` 建立 PR，回報 PR URL。
8. 讀取 PR 狀態：`gh pr view --json mergeStateStatus,isDraft,reviewDecision,statusCheckRollup`。
9. **若 CI 還在跑（`mergeStateStatus: UNSTABLE`）**：以 15s 間隔 polling `gh pr view ... --json statusCheckRollup`，直到無 `IN_PROGRESS` 為止；最多等 10 分鐘。
10. **若 CI 紅了**：抓失敗 job 的 log（`gh run view <run-id> --log-failed`）並擷取錯誤訊息；定位到具體 file/line；修正後 commit + push 同一條 branch（**不**開新 PR），再回到 step 8 重新檢查。
11. 僅在以下條件全成立時自動合併：
    - PR 非 draft
    - 可合併（無 conflict）：`mergeStateStatus: CLEAN`
    - 所有 checks `conclusion: SUCCESS`
    - 無 `CHANGES_REQUESTED`
12. 條件符合時執行：`gh pr merge --squash --delete-branch=false`；若因權限或 repo 設定無法自動合併，明確提示 reviewer 使用 Squash and merge 手動合併。
13. PR 確認已 merge 後執行 cleanup：
    - **若是 git worktree（branch 由 `.claude/worktrees/<name>/` 持有）**：
      - 不要在 worktree 內 `git checkout main`（worktree 不能 checkout 主 repo 已 checkout 的 branch）
      - 從**主 repo path** 跑：`git fetch origin main && git checkout main && git pull --ff-only`
      - 從**主 repo path** 跑：`git worktree remove --force .claude/worktrees/<name>`（會把 worktree dir 與 branch 一併清掉；若有未 commit 變更，先評估是否要保留）
      - 刪除遠端分支：`git push origin --delete <branch>`（若 user 已在 GitHub UI 上手動 delete，會回 `cannot lock ref ...`，視為 OK）
    - **若是普通本機 branch（非 worktree）**：
      - 切回 `main` 並同步（`git checkout main && git pull --ff-only`）
      - 刪除遠端分支：`git push origin --delete <branch>`
      - 刪除本地分支：`git branch -d <branch>`
        - **Squash merge 後常態**：若 PR 採 `Squash and merge`，本地 branch 的 commit SHA 與 main 上 squash 後的新 SHA 不同，`git branch -d` 會回 `not fully merged` 警告。此時改用 `git branch -D <branch>` 強制刪除即可（commits 已以新 SHA 在 main，安全）。
14. **產出 handoff**（**強制落地**，不能只在 chat 寫 markdown）：
    - 檔案：`project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`
    - 若 worktree 即將被 remove，**寫到主 repo path 的 project-process/handoffs/**，避免隨 worktree 一起被刪
    - 內容至少包含：變更摘要、測試結果、阻塞與下一步
    - 完成後 `ls project-process/handoffs/` 確認檔案存在
15. 若在 merge 階段被阻塞，仍需產出 handoff，明確記錄阻塞原因與待辦。

## 注意事項

- 不要 commit 含 secrets 的檔案
- 不要 force push
- 不要 amend 既有 commit（除非明確要求）
- 不要 `--no-verify` 跳過 hooks（hook fail 時調查根因，例如 husky shim 缺失就建 shim）
- 不要刪除保護分支（`main` / `master` / `develop`）
- **不要動主 repo 的 working tree**（user 可能正在 main 開發中，有 uncommitted 變更）：handoff / skill 更新若會落到主 repo path，先 `cd <main repo>` 並 `git status -s` 確認那邊狀態再決定是否 commit；不確定時只寫檔不 commit，由 user 自己決定怎麼處理。

## 已知踩雷（持續累積）

- **`.husky/_/husky.sh` 缺失導致 commit-msg hook fail**（worktree 沒裝 husky 套件時的常態）：建 noop shim（見步驟 5）。
- **post-commit `./scripts/generate-work-log.sh` permission denied**（worktree symlink 來源權限沒有 +x）：可忽略，不影響 commit 本體。
- **Worktree 內 `git checkout main` 會 fail**：因為 main 已被主 repo checkout。Cleanup 流程必須從主 repo 跑（見步驟 13）。
- **CI Typecheck 紅了往往是「型別重構後遺漏更新引用端」**：抓 `gh run view <run-id> --log-failed` 的錯誤行號修正即可，不需要重開 PR。
- **`git push origin --delete` 撞到 `cannot lock ref ... unable to resolve reference`**：通常是 user 已在 GitHub UI 手動 delete 了，視為 OK 跳過。
