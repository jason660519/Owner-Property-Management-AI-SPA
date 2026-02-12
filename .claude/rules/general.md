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
