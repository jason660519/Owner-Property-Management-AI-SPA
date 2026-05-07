# Handoff — Roadmap 新增「安全與合規」分類

- **日期**：2026-05-04
- **PR**：[#67](https://github.com/jason660519/Owner-Property-Management-AI-SPA/pull/67)（已 squash merge，commit `a1ea183`）
- **Branch**：`claude/beautiful-shaw-d24f81`（已併入 main，worktree 將被清除）
- **觸發者**：使用者在討論 roadmap id 128「AI Prompt 安全強化」分類時，提出新增獨立分類

## 變更摘要

`apps/superadmin/app/data/roadmap.ts` 將 4 筆既有安全相關 row 的 `category` 從原分類搬到新的 `安全與合規 (Security & Compliance)`：

| ID | name | 原 category |
|---|---|---|
| 009 | 超級管理員-網路安全－隱私審計管理功能 | 超級管理員 (Super Admin) |
| 098 | 登入／Portal／IAM 角色流程與 Superadmin 全角色選單 | 通用/系統 (General/System) |
| 099 | OAuth 用戶新增角色功能修復 | 通用/系統 (General/System) |
| 128 | AI Prompt 安全強化 | 超級管理員 (Super Admin) |

Diff：4 行（4 + / 4 -），純資料整理，無邏輯改動。

## 設計判斷

- **沒動 PhaseTabBar**（[`PhaseTabBar.tsx`](apps/superadmin/app/superadmin/dashboard/project-progress/components/PhaseTabBar.tsx)）：截圖上「開發 / 測試 / 部署 / 運維」是 phase（生命週期），不是 category；安全功能也會經歷 dev → test → deploy → ops，硬塞會語意衝突。
- **沒動 UI code**：dashboard 既有的 [`useDevTableData.ts:81`](apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/useDevTableData.ts#L81) `categoryFilterSingle` / `selectedCategories` 已從 roadmap 動態收集 categoryList，自動偵測新分類。
- **保守搬遷策略**：僅搬 4 筆強候選（核心 IAM / OAuth / Prompt 安全 / 隱私審計）；未搬 079/080/083（登入 UI 偏 UX）、106（OAuth Avatar 欄位）、064（會計查帳）、091（測試報告），避免新分類被稀釋成「沾邊就丟進來」。

## 測試結果

CI 全綠（4 checks SUCCESS）：

- ✅ Critical dependency guard
- ✅ Typecheck (superadmin)
- ✅ Lint (superadmin)
- ✅ GitGuardian Security Checks
- mergeStateStatus: CLEAN

## 阻塞與下一步

### ⚠️ 主 repo main 尚未 pull

主 repo（`/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA`）有 6 個 modified + 3 個 untracked（CLI capability evaluation 相關，與本 PR 無重疊），所以 cleanup 流程**沒有** `git pull --ff-only`，避免動到 in-progress 工作區。

**請手動執行**（在主 repo path）：

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
git pull --ff-only
```

預期會 fast-forward 1 commit（`babc5df` → `a1ea183`），與 working tree 變動不衝突。

### 驗證新分類

主 repo pull 完後（dev server hot reload）：

1. 開 `http://localhost:3001/superadmin/dashboard/project-progress#development`
2. 在 category filter 下拉確認多一個「安全與合規 (Security & Compliance)」選項
3. 選該分類後應看到 4 筆 row：009, 098, 099, 128

### 後續可選工作

- **邊界 row 重新評估**：079 / 080 / 083 / 106 是否搬到「安全與合規」？目前留通用/系統。等新分類密度上來後再決定。
- **真正的 cron job 候選**：使用者最初的提議「定期掃 `ai_prompt_audit_logs` 抓 injection 異常並 alert」目前 id 128 沒涵蓋；若要做，新開一個 row（建議分類「通用/系統」或「安全與合規」），這個才是 SRE/運維工程師範疇的安全自動化。

## 中途事故記錄（避免下次再犯）

第一輪 4 個 Edit 把 `file_path` 寫成主 repo 路徑（`/Volumes/.../Owner-Property-Management-AI-SPA/apps/...`）而不是 worktree 路徑（`/Volumes/.../.claude/worktrees/beautiful-shaw-d24f81/apps/...`）。Edit tool 報告 success 但實際寫到主 repo 的 working tree。已用 `git -C <main repo> restore` 還原乾淨後重做。

**教訓**：在 worktree 工作時，每個 Edit 的 `file_path` 必須包含 `.claude/worktrees/<name>/` 完整前綴，不能用主 repo 的絕對路徑——它們指向不同檔案。
