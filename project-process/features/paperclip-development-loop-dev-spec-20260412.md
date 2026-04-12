# Superadmin × Paperclip 開發流程整合 — DEV-SPEC

**功能 ID**: 130  
**功能名稱**: Superadmin × Paperclip 開發流程整合（Prompt→Issue→Worktree→Diff→Merge）  
**版本**: 1.0  
**日期**: 2026/04/12  
**狀態**: 測試中（99%，主流程可用）

---

## 1. 目標與範圍

建立一條可在 Superadmin 內閉環運作的 AI 開發流程，讓使用者可從 Project Progress row 直接：

1. 產生與預覽工程 Prompt。
2. 建立 Paperclip issue。
3. 自動建立隔離 git worktree/branch。
4. 即時查看 issue status、run log、cost。
5. 在工作台做 diff 檢視、dry-run、merge、cleanup。

不在本規格範圍：Paperclip 平台本體能力、跨 repo 多專案派工、第三方通知（Slack/Email）流程。

---

## 2. 使用者流程

1. 進入 `project-progress`（Development tab）。
2. 開啟 row 的 `PromptEngineerModal`。
3. 選 IDE / 工作類別，生成 Prompt 並做 Preview。
4. 點擊「送出到 Paperclip」後，後端建立 worktree 並建立 issue。
5. Modal 顯示 issue link、status badge、run log、cost、worktree command。
6. 進入 `paperclip-worktrees` 管理頁做 diff 檢視與 merge（可 dry-run）。
7. merge 後可選擇自動 cleanup，或手動 cleanup。

---

## 3. 核心架構

### 3.1 前端

- `PromptEngineerModal`
  - 產生標準化 prompt（含 Feature/TDD Spec 路徑）
  - Preview `buildIssuePayload` 結果
  - 送出 `/api/paperclip/issues`
  - 輪詢 `status / run-log / cost`
- `PaperclipWorktreesClient`
  - 10 秒輪詢 `/api/paperclip/worktrees`
  - 支援搜尋、篩選、排序（含 cost）
  - 每列提供 diff、merge、merge+cleanup、delete
- `DiffViewer`
  - 檔案級摺疊
  - 行級 diff 著色
  - 快捷鍵支援（J/K/E/C/?）

### 3.2 後端 API（Next.js Route Handlers）

- `POST /api/paperclip/issues`
  - 驗證 payload
  - 先建立隔離 worktree
  - server-side auto-route（缺 assignee 時）
  - 呼叫 Paperclip API 建 issue
  - 寫入 `.paperclip-meta.json` 映射 issue/worktree
  - 失敗時 best-effort 回收 worktree
- `GET /api/paperclip/worktrees`
- `POST /api/paperclip/worktrees/cleanup`
- `GET /api/paperclip/worktrees/[slug]/diff`
- `POST /api/paperclip/worktrees/[slug]/merge`
- `GET /api/paperclip/issues/[issueId]/status`
- `GET /api/paperclip/issues/[issueId]/run-log`
- `GET /api/paperclip/issues/[issueId]/cost`

### 3.3 安全護欄

- 強制 worktree isolation，避免在主工作樹直接改動。
- git hooks：`pre-commit` + `pre-merge-commit`。
- merge route 內建 forbidden-path 檢查（server-side 二次防線）。
- slug/path traversal 防護。
- issue 建立失敗時自動回收（best-effort）避免殘留。

---

## 4. 已落地功能對照（Acceptance Criteria）

- [x] Modal 支援預覽與真送出 issue。
- [x] 每任務自動建立 `feature/paperclip-<slug>` worktree。
- [x] hooks + server-side forbidden path 防護。
- [x] worktrees 管理頁（列表、查詢、篩選、排序、diff、merge、cleanup）。
- [x] diff viewer 互動能力與快捷鍵。
- [x] live status、run log、cost。
- [x] API 路由完整。
- [x] links builder 統一 deep-link/search-link。

---

## 5. 目前進度評估（2026/04/12）

- 功能完整度：`99%`（主流程可用，測試綠燈）。
- 已驗證結果：`paperclip` 測試全集通過（15 suites / 234 tests）。
- 仍建議補強：
  - 補充一條從 `project-progress` 到 `paperclip-worktrees` 的 E2E happy-path 驗收腳本。
  - 對 merge 失敗（衝突）情境增加更清楚的 UI 導引文案。

---

## 6. 相關檔案

- 前端
  - `apps/superadmin/app/superadmin/dashboard/project-progress/components/development-table/PromptEngineerModal.tsx`
  - `apps/superadmin/app/superadmin/dashboard/paperclip-worktrees/PaperclipWorktreesClient.tsx`
  - `apps/superadmin/components/paperclip/DiffViewer.tsx`
- 後端
  - `apps/superadmin/app/api/paperclip/issues/route.ts`
  - `apps/superadmin/app/api/paperclip/worktrees/route.ts`
  - `apps/superadmin/app/api/paperclip/worktrees/[slug]/diff/route.ts`
  - `apps/superadmin/app/api/paperclip/worktrees/[slug]/merge/route.ts`
  - `apps/superadmin/app/api/paperclip/worktrees/cleanup/route.ts`
- 共用模組
  - `apps/superadmin/lib/paperclip/auto-route.ts`
  - `apps/superadmin/lib/paperclip/worktree.ts`
  - `apps/superadmin/lib/paperclip/git-hook.ts`
  - `apps/superadmin/lib/paperclip/links.ts`
