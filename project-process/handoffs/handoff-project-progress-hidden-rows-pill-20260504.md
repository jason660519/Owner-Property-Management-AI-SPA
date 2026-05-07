# Handoff — Project Progress 隱藏列管理 split-button pill

- 日期：2026-05-04
- 分支：`claude/exciting-brahmagupta-e3c8c9`（已 squash merge 至 main）
- PR：[#66](https://github.com/jason660519/Owner-Property-Management-AI-SPA/pull/66) · merge commit `babc5df`
- Worktree：`.claude/worktrees/exciting-brahmagupta-e3c8c9`（cleanup 流程已移除）

## 變更摘要

改善 `superadmin/dashboard/project-progress` 的「隱藏列管理」UX，源自 user 反映「不知道現在哪一個 row 被隱藏了」。

### UI 行為

- **TableToolbar.tsx**：在 View 旁新增複合 pill `[ ☑ 顯示隱藏列 (N) | ▾ ]`
  - **左半 checkbox**：1-click 切換顯示/隱藏全部隱藏列；勾選時整顆 pill 變綠
  - **右半 chevron**：開 popover，列出每個被藏的 row（顯示 `roadmap:NNN` + 名稱），點任一筆即取消那一列的隱藏，另有「取消所有隱藏」連結
  - 無隱藏列時 chevron 自動 disable + opacity 50%
  - 取消最後一筆隱藏後，popover 自動關閉
  - 點 pill 外部 / Escape 都會關閉 popover
- **View dropdown**：移除原本的「顯示隱藏列」checkbox 與「已隱藏的 Row」清單區塊（避免兩處重複，UX 集中於 pill）
- **行內眼睛圖示反轉**（`columns.tsx`）：圖示反映「目前狀態」（可見 = `Eye` 睜眼、隱藏 = `EyeOff` 閉眼），tooltip 仍描述點擊後動作

### 連帶清理

- **page.tsx**：移除 header 描述段「Track development progress across all modules. Last updated: …」
- **roadmap.ts**：移除已不被任何 UI 使用的 `RoadmapData.lastUpdated` 型別與資料欄位
- **docs/update-project-progress-guide.md**：移除 3 處「同時更新 ROADMAP_DATA.lastUpdated」指示
- **.claude/rules/general.md**：移除 1 處 lastUpdated 核對欄位
- 歷史 `dev-log` / `handoff` 內提及 `ROADMAP_DATA.lastUpdated` 的紀錄保留未動（凍結紀錄）

## 測試結果

本機 dev server（worktree port 3091）逐項驗證通過：

| 測試 | 結果 |
|---|---|
| checkbox click → pill 變綠、隱藏列出現 | ✓ |
| 再次 click → pill 變灰、隱藏列消失 | ✓ |
| chevron click → popover 顯示「已隱藏的 ROW (1) / roadmap:113 / 113 — FinePrint .fp 謄本轉檔工具」 | ✓ |
| popover 內點 row → 取消該列隱藏；最後一筆取消後 popover 自動關閉 | ✓ |
| 無隱藏列時 chevron disabled | ✓ |
| 點 pill 外部 / Escape 關閉 popover | ✓ |
| View dropdown 已不再含「顯示隱藏列」/「已隱藏的 Row」區塊 | ✓ |
| 行內眼睛圖示：可見列 = `eye`、隱藏列 = `eye-off` | ✓ |
| Header 描述段已消失 | ✓ |
| TypeScript typecheck 對修改檔案無錯誤 | ✓ |
| ESLint 對 TableToolbar.tsx 無新增錯誤 | ✓ |

CI（PR #66）：`Critical dependency guard / Typecheck (superadmin) / Lint (superadmin) / GitGuardian Security Checks` 4 項全綠。

## 主要修改檔案

- `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/TableToolbar.tsx`
- `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/columns.tsx`
- `apps/superadmin/app/superadmin/dashboard/project-progress/page.tsx`
- `apps/superadmin/app/data/roadmap.ts`
- `docs/update-project-progress-guide.md`
- `.claude/rules/general.md`

## 給下個 session 的提醒

- **主 repo 在合併當下有 uncommitted 變更（CLI eval / api-key-setting 相關）**：cleanup 流程**未**對主 repo working tree `git pull` / `git checkout`，避免覆蓋 user 開發中的工作。Merge 後 user 在主 repo 方便時自行 `git stash && git pull --ff-only && git stash pop`（或 `git pull --rebase`）即可同步 main。
- **Roadmap row 113 (FinePrint .fp 謄本轉檔工具) 仍被隱藏在 user 的 localStorage**：這是本次 user 一開始忘記怎麼還原的入口；新版 pill 已讓 user 能從 ▾ popover 一鍵取消隱藏，無需再手動改 localStorage。
- **沒有未動工的後續任務**：本次需求是純 UX 改善，無 follow-up scope。

## 阻塞 / 已知踩雷

- 無阻塞。
- post-commit `./scripts/generate-work-log.sh` permission denied（worktree symlink 來源無 +x）— 不影響 commit，已在 `.claude/rules/claude-code-background-shell.md` 等規範記錄為已知雜訊。
