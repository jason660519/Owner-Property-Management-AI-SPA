# 通用開發規則

---

## Monorepo 概要（npm workspaces）

| 路徑 | 說明 | 本機埠 / 備註 |
| :--- | :--- | :--- |
| `apps/web` | Next.js App Router，主站（房東 / 租客 / 買家等）+ PWA | 3000 |
| `apps/superadmin` | Next.js 超級管理員後台 | 3001 |
| `apps/web-au` | Next.js 澳洲區站（結構與主站相近） | 3002 |
| `apps/mobile` | Expo / React Native | `expo start` |
| `backend/` | Python FastAPI（OCR 等） | 8819（見專案啟動腳本） |
| `supabase/` | 本地 Supabase（PostgreSQL 17 + Auth + Storage） | API 54321、Studio 54323 |
| `packages/` | 共用套件（如 types） | — |

詳細啟動指令以根目錄 `CLAUDE.md` / `AGENTS.md` 為準（避免與 `package.json` 腳本重複貼兩份）。

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
