# Project File Naming and Archiving Guidelines
# 專案檔案命名與歸檔總則

> **Created Date**: 2026-02-02
> **Created By**: Claude Sonnet 4.5
> **Last Modified**: 2026-03-07
> **Modified By**: Antigravity
> **Version**: 4.2 (Directory Structure Update)
> **Document Type**: Technical Documentation / 技術文件

---

## 📋 Table of Contents / 目錄

- [Core Principles / 核心原則](#core-principles--核心原則)
- [Critical Rule: English-Only File Names / 關鍵規則：英文檔案名](#critical-rule-english-only-file-names--關鍵規則英文檔案名)
- [AI Collaborator Identification / AI 協作者識別](#ai-collaborator-identification--ai-協作者識別)
- [File Metadata Standards / 文件 Metadata 標準](#file-metadata-standards--文件-metadata-標準)
- [Naming Conventions / 命名規範](#naming-conventions--命名規範)
- [Test File Naming Standards / 測試檔案命名規範](#test-file-naming-standards--測試檔案命名規範)
- [Directory Structure / 目錄結構](#directory-structure--目錄結構)
- [Test Directory Structure / 測試目錄結構](#test-directory-structure--測試目錄結構)
- [Archiving Process / 歸檔流程](#archiving-process--歸檔流程)
- [Change History Tracking / 修改歷史追蹤](#change-history-tracking--修改歷史追蹤)

---

## Core Principles / 核心原則

### English Principles

1. **Consistency**: Files of the same type must follow the same naming rules.
2. **Predictability**: File names should clearly indicate their content and purpose.
3. **Semantics**: Use full words; only use common abbreviations (e.g., `config`, `utils`, `img`).
4. **English-Only Names**: **All file and folder names MUST be in English** to avoid encoding issues.
5. **Bilingual Content**: File content should be in English first, followed by Traditional Chinese translation.
6. **Traceability**: All files must indicate creator and modifier; important files need change history.
7. **Colocated Testing**: Test files should be placed near source files for maintainability.

### 中文原則

1. **一致性**：同一類型的檔案必須遵守相同的命名規則。
2. **可預測性**：看到檔名就能知道內容與用途。
3. **語義化**：優先使用全稱，僅使用通用的縮寫（如 `config`, `utils`, `img`）。
4. **英文專用命名**：**所有檔案和資料夾名稱必須使用英文**，避免編碼問題。
5. **雙語內容**：檔案內容應先用英文說明，再用繁體中文翻譯。
6. **可追溯性**：所有文件必須標記創建者與修改者，重要文件需附上修改歷史。
7. **就近測試**：測試檔案應放在源代碼附近，以便維護。

---

## Critical Rule: English-Only File Names / 關鍵規則：英文檔案名

### ⚠️ IMPORTANT / 重要

**ALL file names and folder names MUST be in English.**
**所有檔案名和資料夾名必須使用英文。**

### Why? / 為什麼？

**English Reason**:
- Chinese characters can cause encoding issues on different systems (Windows, Linux, macOS)
- exFAT file systems may corrupt Chinese file names
- Better compatibility with Git, CI/CD, and deployment tools
- Easier for international collaboration
- Prevents `._*` metadata file issues

**中文原因**:
- 中文字元在不同系統（Windows、Linux、macOS）可能產生編碼問題
- exFAT 檔案系統可能損壞中文檔案名
- 與 Git、CI/CD 和部署工具有更好的兼容性
- 便於國際協作
- 避免 `._*` 元數據檔案問題

### Examples / 範例

#### ❌ WRONG / 錯誤

```
docs/硬體與軟體技術選型說明/
docs/工程師每日工作報告/
components/用戶資料.test.tsx
__tests__/登入頁面.test.tsx
```

#### ✅ CORRECT / 正確

```
docs/technical-selection/
docs/daily-reports/
components/UserProfile/__tests__/UserProfile.test.tsx
app/(auth)/login/__tests__/page.test.tsx
```

---

## AI Collaborator Identification / AI 協作者識別

### Standard AI Names / 標準 AI 名稱

| AI Model              | Standard Name            | Short Name | Usage                  |
| :-------------------- | :----------------------- | :--------- | :--------------------- |
| **Claude Opus 4.5**   | `Claude Opus 4.5`        | `Claude`   | File headers, comments |
| **Claude Sonnet 4.5** | `Claude Sonnet 4.5`      | `Claude`   | File headers, comments |
| **Claude Opus 4**     | `Claude Opus 4`          | `Claude`   | File headers, comments |
| **Gemini 2.5 Pro**    | `Gemini 2.5 Pro`         | `Gemini`   | File headers, comments |
| **Gemini 2.0 Flash**  | `Gemini 2.0 Flash`       | `Gemini`   | File headers, comments |
| **GPT-4.5**           | `GPT-4.5`                | `GPT-4`    | File headers, comments |
| **GPT-4o**            | `GPT-4o`                 | `GPT-4`    | File headers, comments |
| **DeepSeek V3**       | `DeepSeek V3`            | `DeepSeek` | File headers, comments |
| **Human Developer**   | Actual name or GitHub ID | -          | File headers, comments |

---

## File Metadata Standards / 文件 Metadata 標準

### Required Fields / 必填欄位

**All Markdown documents MUST include the following metadata at the beginning:**
**所有 Markdown 文檔必須在開頭包含以下 metadata：**

```markdown
> **Created Date**: YYYY-MM-DD
> **Created By**: AI Name or Developer Name
> **Last Modified**: YYYY-MM-DD
> **Modified By**: AI Name or Developer Name
> **Version**: Major.Minor
> **Document Type**: Technical Doc / Progress Report / Development Guide / API Spec / Meeting Notes
```

### Code File Headers / 程式碼檔案頭部

**For important code files (core modules, utilities), add comments at the beginning:**
**對於重要的程式碼檔案（核心模組、工具函數），在檔案開頭加入註解：**

```typescript
/**
 * @file UserAuthService.ts
 * @description User authentication service core logic
 * @description 用戶認證服務核心邏輯
 * @created 2026-01-15
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-28
 * @modifiedBy GPT-4o
 * @version 2.1
 */

export class UserAuthService {
  // ...
}
```

---

## Naming Conventions / 命名規範

### 1. Source Code Files / 程式碼檔案

| Type                    | Rule                              | Example                                       | Notes                                     |
| :---------------------- | :-------------------------------- | :-------------------------------------------- | :---------------------------------------- |
| **React Components**    | **PascalCase**                    | `UserProfile.tsx`, `Sidebar.tsx`              | Component names start with capital letter |
| **Utilities/Helpers**   | **camelCase**                     | `dateFormatter.ts`, `apiClient.ts`            | Utility functions                         |
| **Hooks**               | **camelCase (usePrefix)**         | `useAuth.ts`, `useWindowSize.ts`              | React Hooks convention                    |
| **Styles**              | **kebab-case** or match component | `global-styles.css`, `UserProfile.module.css` | -                                         |
| **Backend Models**      | **PascalCase**                    | `User.ts`, `PropertyListing.ts`               | Class definitions                         |
| **Backend Controllers** | **camelCase**                     | `authController.ts`, `paymentService.ts`      | Service logic                             |
| **Configuration**       | **kebab-case**                    | `tailwind.config.js`, `tsconfig.json`         | Config file convention                    |

### 2. Directories / 資料夾

**ALL directory names MUST be in English and use kebab-case.**
**所有資料夾名稱必須使用英文並採用 kebab-case。**

| Type                   | Rule           | Example                                      |
| :--------------------- | :------------- | :------------------------------------------- |
| **General Folders**    | **kebab-case** | `components`, `hooks`, `utils`, `api-routes` |
| **Special Categories** | **kebab-case** | `__tests__`, `__mocks__`, `__fixtures__`     |

### 3. Documentation & Assets / 文件與資源

**ALL documentation file names MUST be in English.**
**所有文檔檔案名必須使用英文。**

| Type                 | Rule                      | Example                                               | Notes                            |
| :------------------- | :------------------------ | :---------------------------------------------------- | :------------------------------- |
| **Markdown Docs**    | **kebab-case + ISO Date** | `api-documentation.md`, `2026-01-30_meeting-notes.md` | Important files need date prefix |
| **Progress Reports** | **type + ISO Date**       | `sdlc-progress-report_2026-01-30.md`                  | Must include date suffix         |
| **Images**           | **snake_case**            | `logo_main.png`, `banner_home.jpg`                    | No date needed                   |
| **Shell Scripts**    | **kebab-case**            | `deploy-prod.sh`, `setup-env.sh`                      | Version controlled               |

### 4. SQL Files / SQL 檔案

> ⚠️ **CRITICAL: SQL files (`*.sql`) MUST ONLY exist in `supabase/migrations/`.**
> ⚠️ **關鍵規則：SQL 檔案（`*.sql`）僅允許存在於 `supabase/migrations/` 目錄。**

| Rule / 規則          | Details / 說明                                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Allowed Location** | `supabase/migrations/` ONLY / 僅限 `supabase/migrations/`                                                                  |
| **Naming Format**    | `YYYYMMDDHHMMSS_descriptive_name.sql` (e.g., `20260214100000_create_users_table.sql`)                                      |
| **Prohibited**       | Creating `.sql` files anywhere else in the project / 禁止在專案其他任何位置建立 `.sql` 檔                                  |
| **Ad-hoc Queries**   | Use Supabase Dashboard SQL Editor directly; do NOT commit scratch queries / 臨時查詢請使用 Supabase Dashboard，不要 commit |
| **Schema Dumps**     | Do NOT commit schema dump `.sql` files; use migrations instead / 不要 commit schema dump，改用 migration                   |

#### ❌ WRONG / 錯誤

```
supabase/snippets/Untitled query 353.sql   # Supabase Studio 草稿
supabase/queries/audit-queries.sql          # 散落的查詢檔
apps/superadmin/supabase_schema.sql         # 散落的 schema 檔
src/db/setup.sql                            # 任何非 migrations 位置
```

#### ✅ CORRECT / 正確

```
supabase/migrations/20260214100000_create_ai_api_keys.sql
supabase/migrations/20260214110000_add_rls_policies.sql
```

---

## Test File Naming Standards / 測試檔案命名規範

### Test File Types / 測試檔案類型

| Test Type                | File Suffix                       | Example                    | Framework         |
| :----------------------- | :-------------------------------- | :------------------------- | :---------------- |
| **Unit Test**            | `.test.ts(x)`                     | `Button.test.tsx`          | Jest              |
| **Integration Test**     | `.integration.test.ts(x)`         | `auth.integration.test.ts` | Jest              |
| **E2E Test**             | `.spec.ts`                        | `login.spec.ts`            | Playwright        |
| **Hook Test**            | `.test.ts` (in hooks/__tests__/)  | `useAuth.test.ts`          | React Testing Lib |
| **API Route Test**       | `route.test.ts`                   | `route.test.ts`            | Jest              |
| **Component Test (alt)** | `.test.tsx` (in component folder) | `PhotoUpload.test.tsx`     | React Testing Lib |

| 測試類型             | 檔案後綴                         | 範例                       | 框架              |
| :------------------- | :------------------------------- | :------------------------- | :---------------- |
| **單元測試**         | `.test.ts(x)`                    | `Button.test.tsx`          | Jest              |
| **整合測試**         | `.integration.test.ts(x)`        | `auth.integration.test.ts` | Jest              |
| **E2E 測試**         | `.spec.ts`                       | `login.spec.ts`            | Playwright        |
| **Hook 測試**        | `.test.ts` (在 hooks/__tests__/) | `useAuth.test.ts`          | React Testing Lib |
| **API 路由測試**     | `route.test.ts`                  | `route.test.ts`            | Jest              |
| **組件測試（替代）** | `.test.tsx` (在組件資料夾)       | `PhotoUpload.test.tsx`     | React Testing Lib |

### Source to Test Mapping / 原始碼與測試對應

| Source File Path            | Test File Path                                   |
| :-------------------------- | :----------------------------------------------- |
| `app/(auth)/login/page.tsx` | `app/(auth)/login/__tests__/page.test.tsx`       |
| `components/ui/Button.tsx`  | `components/ui/Button/__tests__/Button.test.tsx` |
| `hooks/useAuth.ts`          | `hooks/useAuth/__tests__/useAuth.test.ts`        |
| `lib/supabase/auth.ts`      | `lib/supabase/__tests__/auth.test.ts`            |
| `actions/auth.ts`           | `actions/__tests__/auth.test.ts`                 |
| `app/api/contact/route.ts`  | `app/api/contact/__tests__/route.test.ts`        |
| E2E: Login flow             | `e2e/flows/auth/login.spec.ts`                   |
| E2E: Add property flow      | `e2e/flows/landlord/add-property.spec.ts`        |

| 原始碼路徑                  | 測試檔案路徑                                     |
| :-------------------------- | :----------------------------------------------- |
| `app/(auth)/login/page.tsx` | `app/(auth)/login/__tests__/page.test.tsx`       |
| `components/ui/Button.tsx`  | `components/ui/Button/__tests__/Button.test.tsx` |
| `hooks/useAuth.ts`          | `hooks/useAuth/__tests__/useAuth.test.ts`        |
| `lib/supabase/auth.ts`      | `lib/supabase/__tests__/auth.test.ts`            |
| `actions/auth.ts`           | `actions/__tests__/auth.test.ts`                 |
| `app/api/contact/route.ts`  | `app/api/contact/__tests__/route.test.ts`        |
| E2E: 登入流程               | `e2e/flows/auth/login.spec.ts`                   |
| E2E: 新增房產流程           | `e2e/flows/landlord/add-property.spec.ts`        |

### Test Naming Best Practices / 測試命名最佳實踐

```typescript
// ✅ GOOD: Clear, descriptive test names
describe('LoginPage', () => {
  describe('表單驗證', () => {
    test('應該在 email 格式錯誤時顯示錯誤訊息', () => {});
    test('應該在密碼少於 8 字元時顯示錯誤訊息', () => {});
  });
});

// ❌ BAD: Vague test names
describe('LoginPage', () => {
  test('test 1', () => {});
  test('works correctly', () => {});
});
```

---

## Directory Structure / 目錄結構

**This project uses a Monorepo structure with English-only directory names.**
**本專案採用 Monorepo 結構，所有目錄名稱使用英文。**

```text
root/
├── .claude/                    # AI 協作規則（rules/ + memory/）
├── .github/                    # CI/CD workflows
├── .husky/                     # Git hooks
├── apps/                       # Monorepo applications
│   ├── web/                    # Next.js Web App（前台，Port 3000）
│   │   ├── app/                # App Router 頁面
│   │   │   ├── (auth)/         # 登入/註冊/密碼重置
│   │   │   ├── (dashboard)/    # 通用後台（需登入）
│   │   │   ├── landlord/       # 房東功能
│   │   │   ├── tenant/         # 租客功能
│   │   │   ├── buyer/          # 買家功能
│   │   │   ├── portal/         # 已登入用戶共用頁
│   │   │   └── onboarding/     # 新用戶角色設定
│   │   ├── components/         # UI 元件
│   │   ├── hooks/              # Custom Hooks
│   │   ├── lib/                # 工具函式、actions
│   │   └── e2e/                # E2E 測試（Playwright）
│   │       └── flows/          # 依模組分類的 E2E flow
│   └── superadmin/             # Next.js Superadmin 後台（Port 3001）
│       ├── app/
│       │   ├── superadmin/     # 所有後台頁面（/superadmin/* 前綴）
│       │   │   ├── dashboard/  # 主控台（行為監控、IAM、LLM monitor 等）
│       │   │   ├── properties/ # 物件管理
│       │   │   ├── settings/   # AI 設定（API 金鑰與模型）
│       │   │   └── ...         # 其他後台功能
│       │   └── data/
│       │       └── roadmap.ts  # ⭐ 專案進度資料（唯一真相來源）
│       ├── unit_test/          # 單元與整合測試（依 Row ID 編號）
│       │   ├── 002/            # 行為監控相關測試
│       │   └── 004/            # 雲端空間管理相關測試
│       └── e2e/                # Superadmin E2E 測試
│           ├── 004/            # 編號 subdir
│           ├── ai-settings/    # 命名 subdir（AI 設定）
│           └── *.spec.ts       # 其他 E2E 測試
├── backend/                    # 後端微服務
│   └── ocr-service/            # Python OCR 微服務（ruff + mypy）
├── packages/                   # Monorepo 共用套件
│   ├── ui/                     # 共用 UI 元件
│   ├── utils/                  # 共用工具函式
│   ├── types/                  # 共用 TypeScript 型別（@repo/shared-types）
│   └── tsconfig/               # 共用 tsconfig
├── supabase/                   # Supabase（唯一合法 .sql 存放位置）
│   ├── migrations/             # 格式：YYYYMMDDHHMMSS_描述.sql
│   └── config.toml
├── tools/                      # 開發輔助工具
│   ├── local-agent/            # Local Agent（Cursor / Claude CLI 整合）
│   │   ├── dev-tasks-agent.ts  # Agent 主程式
│   │   ├── run-cursor.sh       # 啟動 Cursor Agent
│   │   └── run-claude.sh       # 啟動 Claude CLI Agent
│   └── cursor-extension/       # Cursor 擴充
├── docs/                       # 文件中心（所有非程式碼文件放這裡）
│   ├── design-guidelines/      # UI/UX 設計規範
│   │   └── references/         # 設計參考資料
│   ├── proposals/              # 設計提案
│   ├── implementation-plans/   # 實作計畫
│   ├── product-overview/       # 產品需求與使用場景
│   ├── operational-guides/     # 操作指南
│   │   ├── deployment-guides/  # 部署與環境
│   │   └── iam/                # IAM 權限架構、SOP
│   ├── technical-selection/    # 技術選型文件
│   ├── reports/                # 分析報告
│   ├── VLM/                    # VLM 相關文件
│   ├── prompts/                # Prompt 範本
│   ├── file-naming-guidelines.md   # 本文件
│   └── update-project-progress-guide.md  # 進度更新指南
├── project-process/            # 專案流程文件（Feature Spec、TDD、開發日誌）
│   ├── features/               # Feature Spec (.md) + TDD Spec (.md)
│   │   └── *.md                # 所有 .html 已於 2026-03-07 清除，統一使用 .md
│   ├── dev-logs/               # 開發日誌（roadmap devLogDocPath 指向此處）
│   ├── test-logs/              # 測試日誌
│   ├── progress-reports/       # 進度報告
│   │   ├── daily-reports/
│   │   ├── database-reports/
│   │   └── ...                 # 其他分類
│   ├── iam-reports/            # IAM 審計報告
│   └── project-packages-analysis/  # 套件分析
├── scripts/                    # 自動化腳本
│   ├── complete-dev-task.sh    # 標記 dev task 完成
│   ├── clean-macos-files.sh
│   ├── generate-work-log.sh
│   └── migrate-tests.sh
└── resources/                  # 靜態資源
```

> ⚠️ `project-process/features/` 自 2026-03-07 起，**所有 `.html` 已刪除**，文件統一採用 `.md` 格式。
> ⚠️ `project-process/` 根層的舊靜態網站檔案（`analysis.html`、`build.js`、`roadmap.js` 等）亦於同日清除。

---

## Test Directory Structure / 測試目錄結構

### Colocated Testing Approach / 就近測試方法

**Tests should be placed near the source code they test, using `__tests__` directories.**
**測試應放在被測試的源代碼附近，使用 `__tests__` 目錄。**

```text
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx                    # Source
│   │   │   └── __tests__/
│   │   │       └── page.test.tsx           # ✅ Test next to source
│   │   └── register/
│   │       ├── page.tsx
│   │       └── __tests__/
│   │           └── page.test.tsx
│   └── api/
│       └── contact/
│           ├── route.ts                    # Source
│           └── __tests__/
│               └── route.test.ts           # ✅ Test next to source
│
├── components/
│   ├── ui/
│   │   └── Button/
│   │       ├── Button.tsx                  # Source
│   │       └── __tests__/
│   │           └── Button.test.tsx         # ✅ Test next to source
│   └── property/
│       └── PhotoUpload/
│           ├── PhotoUpload.tsx
│           └── __tests__/
│               └── PhotoUpload.test.tsx
│
├── hooks/
│   └── useAuth/
│       ├── useAuth.ts                      # Source
│       └── __tests__/
│           └── useAuth.test.ts             # ✅ Test next to source
│
├── lib/
│   └── supabase/
│       ├── auth.ts                         # Source
│       └── __tests__/
│           └── auth.test.ts                # ✅ Test next to source
│
├── actions/
│   ├── auth.ts                             # Source
│   └── __tests__/
│       └── auth.test.ts                    # ✅ Test next to source
│
├── e2e/                                    # ✅ E2E tests (centralized)
│   ├── flows/
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── register.spec.ts
│   │   │   └── password-reset.spec.ts
│   │   ├── landlord/
│   │   │   ├── add-property.spec.ts
│   │   │   └── photo-upload.spec.ts
│   │   └── admin/
│   │       └── user-management.spec.ts
│   ├── fixtures/                           # Test data
│   │   ├── users.json
│   │   └── properties.json
│   └── utils/                              # E2E utilities
│       ├── auth.helper.ts
│       └── test.utils.ts
│
├── __mocks__/                              # Global mocks
│   ├── supabase.ts
│   └── nodemailer.ts
│
├── jest.config.js
├── jest.setup.js
└── playwright.config.ts
```

### Jest Configuration / Jest 配置

```javascript
// jest.config.js
module.exports = {
  testMatch: [
    '<rootDir>/**/__tests__/**/*.test.{ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/e2e/',           // Exclude E2E tests (run by Playwright)
  ],
  // ...
}
```

---

## Archiving Process / 歸檔流程

**To avoid cluttering the project root, all non-code files should follow this archiving process:**
**為避免專案根目錄混亂，所有非代碼類文件應遵循以下歸檔流程：**

### 1. New Files / 新增文件

**English Guidelines**:
- **Deployment & Environment**: Store in `docs/operational-guides/deployment-guides/`
- **Design Specs & UI/UX**: Store in `docs/design-guidelines/`
- **Progress Reports**:
  - OCR related → `project-process/progress-reports/ocr-development/`
  - Project planning & Roadmap → `project-process/progress-reports/roadmap/`
  - Daily work reports → `project-process/progress-reports/daily-reports/`
  - Database related → `project-process/progress-reports/database-reports/`
- **Product Requirements**: Store in `docs/product-overview/`
- **Technical Selection**: Store in `docs/technical-selection/`
- **Implementation Plans**: Store in `docs/implementation-plans/`
- **Testing Documentation**: Store in `docs/testing/`
- **Temporary Notes/Drafts**: Store in `docs/drafts/` (move after finalization)
- **Images/Videos**: Store in `docs/design-guidelines/references/` or `apps/*/assets/`

**中文指引**:
- **部署與環境文件**：存入 `docs/operational-guides/deployment-guides/`
- **設計規範與 UI/UX 文件**：存入 `docs/design-guidelines/`
- **進度報告**：
  - OCR 相關 → `project-process/progress-reports/ocr-development/`
  - 專案規劃 → `project-process/progress-reports/roadmap/`
  - 每日報告 → `project-process/progress-reports/daily-reports/`
  - 資料庫相關 → `project-process/progress-reports/database-reports/`
- **產品需求**：存入 `docs/product-overview/`
- **技術選型**：存入 `docs/technical-selection/`
- **實作計畫**：存入 `docs/implementation-plans/`
- **測試文件**：存入 `docs/testing/`
- **臨時筆記**：存入 `docs/drafts/`（確認後移至正式目錄）
- **圖片影音**：存入 `docs/design-guidelines/references/` 或 `apps/*/assets/`

### 2. Test Files / 測試檔案

**Test files have special archiving rules:**
**測試檔案有特殊的歸檔規則：**

- **Unit/Integration Tests**: Place in `__tests__/` next to source code
- **E2E Tests**: Place in `e2e/flows/{module}/` directory
- **Test Fixtures**: Place in `e2e/fixtures/` directory
- **Test Utilities**: Place in `e2e/utils/` or module `__tests__/utils/`

**測試檔案歸檔：**
- **單元/整合測試**：放在源代碼旁的 `__tests__/` 目錄
- **E2E 測試**：放在 `e2e/flows/{模組}/` 目錄
- **測試固定資料**：放在 `e2e/fixtures/` 目錄
- **測試工具**：放在 `e2e/utils/` 或模組 `__tests__/utils/`

### 3. Version Control / 版本控管

**Outdated Files**:
- **Do NOT delete**, move to `docs/archive/`
- Add prefix `archived_YYYYMMDD_filename.md`
- Add note: `> This document is deprecated and preserved for historical reference.`

**過時文件**：
- **不要刪除**，移至 `docs/archive/`
- 檔名加前綴 `archived_YYYYMMDD_filename.md`
- 標註：`> This document is deprecated and preserved for historical reference.`

### 4. Root Cleanup / 根目錄淨空

**The root directory should ONLY contain:**
**根目錄僅保留：**

- **Environment Config**: `.env.*`, `.gitignore`, `.editorconfig`
- **Dependency Management**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- **Project Entry**: `README.md`, `CONTRIBUTING.md`, `LICENSE`
- **AI Collaboration**: `CLAUDE.md`, `FILE_CREATION_CHECKLIST.md`
- **Tool Config**: `tsconfig.json`, `eslint.config.js`

---

## Change History Tracking / 修改歷史追蹤

### Git Commit Message Standards / Git Commit 訊息規範

**All commit messages MUST indicate the executor's identity:**
**所有 Commit 訊息必須標注執行者身份：**

```bash
# Format / 格式
[AI Name] type(scope): commit message

# Examples / 範例
[Claude] feat(database): add RLS policies for super admin tables
[Claude] test(auth): add unit tests for login flow
[Gemini] fix(api): resolve authentication token refresh issue
[GPT-4] docs(readme): update installation instructions
[DeepSeek] refactor(ocr): optimize image preprocessing pipeline
```

### Commit Type Standards / Commit Type 標準

| Type       | Description      | Example                                               |
| :--------- | :--------------- | :---------------------------------------------------- |
| `feat`     | New feature      | `[Claude] feat(auth): add OAuth2 integration`         |
| `fix`      | Bug fix          | `[Gemini] fix(ui): resolve button alignment issue`    |
| `docs`     | Documentation    | `[GPT-4] docs(api): add endpoint documentation`       |
| `refactor` | Code refactoring | `[DeepSeek] refactor(utils): simplify date formatter` |
| `test`     | Testing          | `[Claude] test(auth): add unit tests for login flow`  |
| `chore`    | Maintenance      | `[Gemini] chore(deps): update dependencies`           |

---

## ⚡ Quick Checklist / 快速檢查表

### 📝 File Creation Checklist / 文件創建檢查表

**When creating new files / 創建新文件時：**

- [ ] Is the file/folder name in English? / 檔案/資料夾名稱是否使用英文？
- [ ] Does the Markdown file include complete Metadata? / Markdown 文件是否已加入完整 Metadata？
- [ ] Does the file name follow naming conventions (PascalCase/camelCase/kebab-case)? / 檔名是否符合命名規範？
- [ ] Is the file placed in the correct directory? / 文件是否已放入正確的目錄？
- [ ] For test files: Is it in `__tests__/` next to source code? / 測試檔案是否在源代碼旁的 `__tests__/`？
- [ ] For E2E tests: Is it in `e2e/flows/{module}/`? / E2E 測試是否在 `e2e/flows/{模組}/`？
- [ ] For SQL files: Is it in `supabase/migrations/` with timestamp naming? / SQL 檔案是否在 `supabase/migrations/` 且使用時間戳命名？

### 🧪 Test File Creation Checklist / 測試文件創建檢查表

**When creating test files / 創建測試文件時：**

- [ ] Unit/Integration test uses `.test.ts(x)` suffix? / 單元/整合測試使用 `.test.ts(x)` 後綴？
- [ ] E2E test uses `.spec.ts` suffix? / E2E 測試使用 `.spec.ts` 後綴？
- [ ] Test is placed in `__tests__/` directory next to source? / 測試在源代碼旁的 `__tests__/` 目錄？
- [ ] Test file name matches source file name? / 測試檔名與源檔案對應？
- [ ] Test descriptions use clear, descriptive names (preferably in Chinese)? / 測試描述清楚（建議用中文）？
- [ ] Tests are independent and don't rely on execution order? / 測試獨立且不依賴執行順序？

### 🔧 File Modification Checklist / 文件修改檢查表

**When modifying existing files / 修改現有文件時：**

- [ ] Is "Last Modified" date and "Modified By" updated in Metadata? / 是否更新 Metadata 的「最後修改」？
- [ ] Is a new record added to "Change History"? / 是否在「修改歷史」新增記錄？
- [ ] For major changes, is version number upgraded? / 重大修改是否升級版本號？
- [ ] Does Git Commit include `[AI Name]` prefix? / Git Commit 是否包含 `[AI名稱]` 前綴？

---

## 📝 Change History / 修改歷史

| Date       | Version | Modified By       | Changes                                                                                                                                    |
| ---------- | ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-07 | 4.2     | Antigravity       | Updated full directory structure (superadmin, tools, backend); corrected unit_test/ path; removed stale static files from project-process/ |
| 2026-02-14 | 4.1     | Antigravity       | Added SQL file management rules, prohibited scattered .sql                                                                                 |
| 2026-02-06 | 4.0     | Claude Opus 4.5   | Integrated testing standards, colocated testing approach                                                                                   |
| 2026-02-02 | 3.0     | Claude Sonnet 4.5 | Complete rewrite: English-only file names, bilingual content                                                                               |
| 2026-02-01 | 2.2     | Gemini 3 Pro      | Updated directory structure, archiving process                                                                                             |
| 2026-01-30 | 2.1     | Claude Sonnet 4.5 | Added AI collaborator identification and change tracking                                                                                   |
| 2026-01-30 | 1.0     | Project Team      | Initial version                                                                                                                            |

| 日期       | 版本 | 修改者            | 修改內容                                                                                                  |
| ---------- | ---- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| 2026-03-07 | 4.2  | Antigravity       | 更新完整目錄結構（補 superadmin/tools/backend）；修正 unit_test/ 路徑；清除 project-process/ 中的舊靜態檔 |
| 2026-02-14 | 4.1  | Antigravity       | 新增 SQL 檔案管理規則，禁止散落 .sql                                                                      |
| 2026-02-06 | 4.0  | Claude Opus 4.5   | 整合測試規範、就近測試方法                                                                                |
| 2026-02-02 | 3.0  | Claude Sonnet 4.5 | 完全重寫：英文專用檔案名、雙語內容                                                                        |
| 2026-02-01 | 2.2  | Gemini 3 Pro      | 更新目錄結構、歸檔流程                                                                                    |
| 2026-01-30 | 2.1  | Claude Sonnet 4.5 | 新增 AI 協作者識別與修改追蹤                                                                              |
| 2026-01-30 | 1.0  | Project Team      | 初始版本                                                                                                  |

---

## 📚 References / 參考資源

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

> **Note / 注意**: Good naming is the best comment, clear testing is the best documentation.
> **注意**: 好的命名是最好的註解，清楚的測試是最好的文檔。
