# 通用開發規則

> Monorepo 結構與 port 對照見 `.claude/rules/frontend/react-next.md`（前端視角）與 `.claude/rules/backend/supabase.md`（後端視角）。啟動指令見 `CLAUDE.md`。

---

## 命名規範

詳細規範：[docs/file-naming-guidelines.md](../../docs/file-naming-guidelines.md)

| 文件類型   | 規則                         | 範例                              |
| :--------- | :--------------------------- | :-------------------------------- |
| React 組件 | PascalCase.tsx               | `UserProfile.tsx`                 |
| Hooks      | camelCase + `use` 前綴       | `useAuth.ts`                      |
| 工具函數   | camelCase.ts                 | `dateFormatter.ts`                |
| 資料夾     | kebab-case                   | `api-routes/`                     |
| 文檔檔名   | 英文為主；內容可中英並陳   | 見 `docs/file-naming-guidelines` |
| 單元測試   | `.test.ts(x)`                | `LoginPage.test.tsx`              |
| E2E 測試   | `.spec.ts`                   | `login.spec.ts`                   |
| Migration  | `YYYYMMDDHHMMSS_description.sql` | `20260411120000_add_qwen_provider.sql` |

---

## Git 工作流

**Commit**: `<type>: <description>` — feat / fix / docs / refactor / style / test / chore

**分支**: `feature/xxx` / `fix/xxx` / `docs/xxx` / `chore/xxx`（勿在 `main` 直接開發）

---

## 程式碼風格

- 2 空格縮排，單引號，行尾不留空白，檔案結尾一空行
- TypeScript strict mode，禁止 `any`，Interface PascalCase，`export type`
- 註解用英文，TODO/FIXME 格式：`// TODO: description`

---

## 語言偏好

| 場景                         | 語言     |
| :--------------------------- | :------- |
| 程式碼註解 / 變數命名        | 英文     |
| Commit 訊息 / 文檔 / UI 文字 | 繁體中文 |

---

## 檔案組織

**新增檔案位置**：

- Web 頁面 → `apps/web/app/`
- Web 組件 → `apps/web/components/`
- Web 工具 / actions → `apps/web/lib/`（Supabase 見 `backend/supabase.md`）
- 澳洲站 → `apps/web-au/app/`、`apps/web-au/components/`、`apps/web-au/lib/`
- Superadmin 頁面 → `apps/superadmin/app/`
- Superadmin 組件 → `apps/superadmin/components/`
- Mobile → `apps/mobile/`（Expo 專案慣例）
- 單元測試 → 同目錄鄰近 `__tests__/` 或與來源同層的 `*.test.ts(x)`（依各 app 現況）
- Web E2E → `apps/web/e2e/flows/{module}/`（Playwright）
- 文檔 → `docs/` 下對應分類（勿堆在 repo 根目錄）

**禁止**：根目錄放文檔/臨時檔、巢狀過深、單檔超過 500 行、非英文檔名/路徑名（見命名指南）

---

## 工作日誌 / 進度更新

> 完整說明：[docs/update-project-progress-guide.md](../../docs/update-project-progress-guide.md)

**每次完成工作後**，將成果更新至 `apps/superadmin/app/data/roadmap.ts`（`RAW_FEATURES` 陣列末端新增或修改對應項目）。

- Feature ID 一律以 `apps/superadmin/app/data/roadmap.ts` 內每個 feature 物件的固定 `id` 欄位為準；**不要**用 `RAW_FEATURES` index、table row 順序、或依賴可選欄位（如 `devLogDocPath`、`testScriptPath`）的 regex / parser 估算，否則會把文件掛到錯列。
- 若 user 已提供 Feature ID / 截圖，先信任該 ID，再核對 `id`、`name`、`testScriptPath`、`devLogDocPath` 是否一致。

### 必填欄位

| 欄位               | 說明                              |
| :----------------- | :-------------------------------- |
| `name`             | 功能名稱                          |
| `category`         | 分類（見下方常用分類）            |
| `percentage`       | 開發進度 0–100                    |
| `lastModifiedBy`   | 修改者（如 `Claude`）             |
| `lastModifiedDate` | 日期（如 `2026/04/11`）           |

### Phase 欄位（四階段）

不填預設 `development`；系統會自動推導（有 `testCoverage > 0` 或 `testProgress` → `testing`）。

| `phase` 值    | 何時使用         | 額外欄位                                                                    |
| :------------ | :--------------- | :-------------------------------------------------------------------------- |
| `development` | 功能開發中       | —                                                                           |
| `testing`     | 開始寫測試       | `testStatus`, `testCoverage`, `unitTestCoverage`, `e2eTestCoverage`, `defectCount` |
| `deployment`  | 已部署至環境     | `deployStatus`, `deployEnv`, `version`, `deployDate`                        |
| `operations`  | 上線監控中       | `uptimePercent`, `errorRate`, `avgResponseTime`, `lastIncident`             |

### 文件放置規則

專案進度相關規格與報告以 **Markdown（`.md`）為主**；路徑欄位請依 `docs/update-project-progress-guide.md` 填寫。

| 內容       | 放這裡                           | 備註 |
| :--------- | :------------------------------- | :--- |
| 開發日誌   | `project-process/dev-logs/`      | 連結格式見進度指南 |
| 測試報告   | `project-process/test-logs/`     | 同上 |
| 功能 / TDD 規格 | `project-process/features/` 等 | 優先 `.md` |
| 操作指南   | `docs/` 下對應分類               | — |

### 常用分類

`超級管理員 (Super Admin)` / `通用/系統 (General/System)` / `專案管理與工具 (Project Management)` / `房東 (Landlord)` / `租客 (Tenant)` / `買家 (Buyer)` / `測試與品質保證 (Testing & QA)`

---

## Session 結束規範（強制 handoff 落地）

Session 收尾時，**若本 session 有以下任一交付**，**必須**呼叫 `/handoff` skill 產出接手紀錄，不得以「在 chat 訊息裡手寫 markdown」替代：

- 有 PR 被 merged（特別是 Sprint 推進或功能落地的 PR）
- 新增 `project-process/features/`、`project-process/dev-logs/`、`supabase/migrations/` 等結構性檔案
- Roadmap `percentage` 推進或 Sprint 完成
- 有明確的「下一步任務」尚未動工（下個 session 需要接手）

### 判斷流程

1. Session 內有上述任一項 ✓ → **走 `/handoff` skill**（詳見 `.claude/commands/handoff.md` 的「觸發條件」與「完成檢查清單」）
2. 使用者已用自然語言暗示（「收尾」「handoff」「寫接手 prompt」「給下個 session 的指引」「選項 X = 收尾」）→ **走 `/handoff` skill**（不得視為普通請求在 chat 裡手寫）
3. 僅修小 bug、純 docs typo、單一 refactor 且沒「下一步」→ 可略過（留 commit message 就夠）

### 落地驗證

`/handoff` skill 會要求：
- Chat 輸出 fenced markdown block（給 user 複製）
- **同時** `Write` tool 落地到 `project-process/handoffs/handoff-{topic}-{YYYYMMDD}.md`
- `ls project-process/handoffs/` 確認檔案存在

**兩件事都要做，缺一不可**（命名 pattern + 檔案結構見 handoff.md）。

### 為什麼強制

Chat 輸出會隨 session 結束消失。只口頭 handoff → 下次開新 session 時 user 找不到、要重新挖 session log → context 斷層 → 新 AI 接手效率大跌。檔案進 git 後永久可追溯、儀表板可 cross-link、search 可索引。

---

## 除錯備註

- 本機服務連不上（瀏覽器 vs macOS vs server 分層 triage）→ `docs/operational-guides/localhost-debug-triage.md`
