# 通用開發規則

---

## 命名規範

詳細規範：[docs/file-naming-guidelines.md](../../docs/file-naming-guidelines.md)

| 文件類型   | 規則                    | 範例                            |
| :--------- | :---------------------- | :------------------------------ |
| React 組件 | PascalCase.tsx          | `UserProfile.tsx`               |
| Hooks      | camelCase + use 前綴    | `useAuth.ts`                    |
| 工具函數   | camelCase.ts            | `dateFormatter.ts`              |
| 資料夾     | kebab-case              | `api-routes/`                   |
| 文檔       | snake_case (日期選用)   | `2026-01-15_meeting_notes.md`   |
| 單元測試   | .test.ts(x)             | `LoginPage.test.tsx`            |
| E2E 測試   | .spec.ts                | `login.spec.ts`                 |
| Migration  | YYYYMMDDHHmmss_name.sql | `20260115120000_add_status.sql` |

---

## Git 工作流

**Commit**: `<type>: <description>` — feat / fix / docs / refactor / style / test / chore

**分支**: `feature/xxx` / `fix/xxx` / `docs/xxx`

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
- 共用工具 → `apps/web/lib/`
- 單元測試 → 同目錄 `__tests__/` (colocated)
- E2E 測試 → `apps/web/e2e/flows/{module}/`
- 文檔 → `docs/` 下對應分類

**禁止**：根目錄放文檔/臨時檔、巢狀超過 4 層、單檔超過 500 行、中文檔名

**Skills 優先級**：`.claude/rules/` > `.claude/skills/` > 系統 Skills

---

## 工作日誌 / 進度更新

> 完整說明：[docs/update-project-progress-guide.md](../../docs/update-project-progress-guide.md)

**每次完成工作後**，將成果更新至 `apps/superadmin/app/data/roadmap.ts`（`RAW_FEATURES` 陣列末端新增或修改對應項目）。

### 必填欄位

| 欄位 | 說明 |
| :--- | :--- |
| `name` | 功能名稱 |
| `category` | 分類（見下方常用分類） |
| `percentage` | 開發進度 0–100 |
| `lastModifiedBy` | 修改者（如 `Claude Sonnet 4.6`） |
| `lastModifiedDate` | 日期（如 `2026/02/19`） |

### Phase 欄位（四階段）

不填預設 `development`；系統會自動推導（有 `testCoverage > 0` 或 `testProgress` → `testing`）。

| `phase` 值 | 何時使用 | 額外欄位 |
| :--- | :--- | :--- |
| `development` | 功能開發中 | — |
| `testing` | 開始寫測試 | `testStatus`, `testCoverage`, `unitTestCoverage`, `e2eTestCoverage`, `defectCount` |
| `deployment` | 已部署至環境 | `deployStatus`, `deployEnv`, `version`, `deployDate` |
| `operations` | 上線監控中 | `uptimePercent`, `errorRate`, `avgResponseTime`, `lastIncident` |

### 文件放置規則

| 內容 | 放這裡 | `docPath` 寫法 |
| :--- | :--- | :--- |
| 開發日誌 | `project-process/dev-logs/` | `/project-process/dev-logs/dev-主題-YYYY-MM-DD.md` |
| 測試報告 | `project-process/test-logs/` | `/project-process/test-logs/test-主題-YYYY-MM-DD.md` |
| 功能規格 | `project-process/features/` | `/project-process/features/功能名-YYYYMMDD.html` |
| 操作指南 | `docs/` 下對應分類 | `/docs/operational-guides/xxx.md` |

### 常用分類

`超級管理員 (Super Admin)` / `通用/系統 (General/System)` / `專案管理與工具 (Project Management)` / `房東 (Landlord)` / `租客 (Tenant)` / `買家 (Buyer)` / `測試與品質保證 (Testing & QA)`
