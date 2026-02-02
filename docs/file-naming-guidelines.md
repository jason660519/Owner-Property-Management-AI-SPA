# Project File Naming and Archiving Guidelines
# 專案檔案命名與歸檔總則

> **Created Date**: 2026-02-02  
> **Created By**: Claude Sonnet 4.5  
> **Last Modified**: 2026-02-02  
> **Modified By**: Claude Sonnet 4.5  
> **Version**: 3.0 (English-First Edition)  
> **Document Type**: Technical Documentation / 技術文件

---

## 📋 Table of Contents / 目錄

- [Core Principles / 核心原則](#core-principles--核心原則)
- [Critical Rule: English-Only File Names / 關鍵規則：英文檔案名](#critical-rule-english-only-file-names--關鍵規則英文檔案名)
- [AI Collaborator Identification / AI 協作者識別](#ai-collaborator-identification--ai-協作者識別)
- [File Metadata Standards / 文件 Metadata 標準](#file-metadata-standards--文件-metadata-標準)
- [Naming Conventions / 命名規範](#naming-conventions--命名規範)
- [Directory Structure / 目錄結構](#directory-structure--目錄結構)
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

### 中文原則

1. **一致性**：同一類型的檔案必須遵守相同的命名規則。
2. **可預測性**：看到檔名就能知道內容與用途。
3. **語義化**：優先使用全稱，僅使用通用的縮寫（如 `config`, `utils`, `img`）。
4. **英文專用命名**：**所有檔案和資料夾名稱必須使用英文**，避免編碼問題。
5. **雙語內容**：檔案內容應先用英文說明，再用繁體中文翻譯。
6. **可追溯性**：所有文件必須標記創建者與修改者，重要文件需附上修改歷史。

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
SDLC開發進度表報告_2026-01-30.md
database-architecture-design.md
```

#### ✅ CORRECT / 正確

```
docs/technical-selection/
docs/daily-reports/
sdlc-progress-report_2026-01-30.md
database-architecture-design.md
```

---

## AI Collaborator Identification / AI 協作者識別

### Standard AI Names / 標準 AI 名稱

| AI Model              | Standard Name            | Short Name | Usage                  |
| :-------------------- | :----------------------- | :--------- | :--------------------- |
| **Claude Sonnet 4.5** | `Claude Sonnet 4.5`      | `Claude`   | File headers, comments |
| **Claude Opus 4**     | `Claude Opus 4`          | `Claude`   | File headers, comments |
| **Gemini 2.5 Pro**    | `Gemini 2.5 Pro`         | `Gemini`   | File headers, comments |
| **Gemini 2.0 Flash**  | `Gemini 2.0 Flash`       | `Gemini`   | File headers, comments |
| **GPT-4.5**           | `GPT-4.5`                | `GPT-4`    | File headers, comments |
| **GPT-4o**            | `GPT-4o`                 | `GPT-4`    | File headers, comments |
| **DeepSeek V3**       | `DeepSeek V3`            | `DeepSeek` | File headers, comments |
| **Human Developer**   | Actual name or GitHub ID | -          | File headers, comments |

| AI 模型               | 標準名稱             | 簡稱       | 使用情境       |
| :-------------------- | :------------------- | :--------- | :------------- |
| **Claude Sonnet 4.5** | `Claude Sonnet 4.5`  | `Claude`   | 文件頭部、註解 |
| **Claude Opus 4**     | `Claude Opus 4`      | `Claude`   | 文件頭部、註解 |
| **Gemini 2.5 Pro**    | `Gemini 2.5 Pro`     | `Gemini`   | 文件頭部、註解 |
| **Gemini 2.0 Flash**  | `Gemini 2.0 Flash`   | `Gemini`   | 文件頭部、註解 |
| **GPT-4.5**           | `GPT-4.5`            | `GPT-4`    | 文件頭部、註解 |
| **GPT-4o**            | `GPT-4o`             | `GPT-4`    | 文件頭部、註解 |
| **DeepSeek V3**       | `DeepSeek V3`        | `DeepSeek` | 文件頭部、註解 |
| **人類開發者**        | 實際姓名或 GitHub ID | -          | 文件頭部、註解 |

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

### Complete Example / 完整範例

```markdown
# Database Migration Guide
# 資料庫遷移指南

> **Created Date**: 2026-01-20  
> **Created By**: Gemini 2.5 Pro  
> **Last Modified**: 2026-01-30  
> **Modified By**: Claude Sonnet 4.5  
> **Version**: 1.3  
> **Document Type**: Technical Documentation  
> **Summary**: This document explains how to execute Supabase database migrations and testing procedures.  
> **摘要**: 本文件說明如何執行 Supabase 資料庫遷移與測試流程。

## Change History / 修改歷史

| Date       | Version | Modified By       | Changes                              |
| ---------- | ------- | ----------------- | ------------------------------------ |
| 2026-01-30 | 1.3     | Claude Sonnet 4.5 | Added RLS Policy testing chapter     |
| 2026-01-25 | 1.2     | Gemini 2.5 Pro    | Added index optimization suggestions |
| 2026-01-20 | 1.0     | Gemini 2.5 Pro    | Initial version                      |

| 日期       | 版本 | 修改者            | 修改內容                 |
| ---------- | ---- | ----------------- | ------------------------ |
| 2026-01-30 | 1.3  | Claude Sonnet 4.5 | 新增 RLS Policy 測試章節 |
| 2026-01-25 | 1.2  | Gemini 2.5 Pro    | 補充索引優化建議         |
| 2026-01-20 | 1.0  | Gemini 2.5 Pro    | 初始版本                 |
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

```python
"""
OCR Document Parser
OCR 文件解析器

Created Date: 2026-01-10
Created By: DeepSeek V3
Last Modified: 2026-01-29
Modified By: Claude Sonnet 4.5
Version: 3.2
"""

def parse_building_title(image_path: str) -> dict:
    pass
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

| 類型           | 規則                        | 範例                                          | 備註             |
| :------------- | :-------------------------- | :-------------------------------------------- | :--------------- |
| **React 組件** | **PascalCase**              | `UserProfile.tsx`, `Sidebar.tsx`              | 組件名首字母大寫 |
| **工具函數**   | **camelCase**               | `dateFormatter.ts`, `apiClient.ts`            | 工具函數         |
| **Hooks**      | **camelCase (usePrefix)**   | `useAuth.ts`, `useWindowSize.ts`              | React Hooks 慣例 |
| **樣式**       | **kebab-case** 或與組件同名 | `global-styles.css`, `UserProfile.module.css` | -                |
| **後端模型**   | **PascalCase**              | `User.ts`, `PropertyListing.ts`               | 類別定義         |
| **後端控制器** | **camelCase**               | `authController.ts`, `paymentService.ts`      | 服務邏輯         |
| **配置文件**   | **kebab-case**              | `tailwind.config.js`, `tsconfig.json`         | 配置文件慣例     |

### 2. Directories / 資料夾

**ALL directory names MUST be in English and use kebab-case.**  
**所有資料夾名稱必須使用英文並採用 kebab-case。**

| Type                   | Rule           | Example                                      |
| :--------------------- | :------------- | :------------------------------------------- |
| **General Folders**    | **kebab-case** | `components`, `hooks`, `utils`, `api-routes` |
| **Special Categories** | **kebab-case** | `__tests__`, `__mocks__`                     |

| 類型           | 規則           | 範例                                         |
| :------------- | :------------- | :------------------------------------------- |
| **一般資料夾** | **kebab-case** | `components`, `hooks`, `utils`, `api-routes` |
| **特殊分類**   | **kebab-case** | `__tests__`, `__mocks__`                     |

### 3. Documentation & Assets / 文件與資源

**ALL documentation file names MUST be in English.**  
**所有文檔檔案名必須使用英文。**

| Type                 | Rule                      | Example                                               | Notes                            |
| :------------------- | :------------------------ | :---------------------------------------------------- | :------------------------------- |
| **Markdown Docs**    | **kebab-case + ISO Date** | `api-documentation.md`, `2026-01-30_meeting-notes.md` | Important files need date prefix |
| **Progress Reports** | **type + ISO Date**       | `sdlc-progress-report_2026-01-30.md`                  | Must include date suffix         |
| **Images**           | **snake_case**            | `logo_main.png`, `banner_home.jpg`                    | No date needed                   |
| **Shell Scripts**    | **kebab-case**            | `deploy-prod.sh`, `setup-env.sh`                      | Version controlled               |

| 類型              | 規則                      | 範例                                                  | 備註                 |
| :---------------- | :------------------------ | :---------------------------------------------------- | :------------------- |
| **Markdown 文檔** | **kebab-case + ISO 日期** | `api-documentation.md`, `2026-01-30_meeting-notes.md` | 重要文件需加日期前綴 |
| **進度報告**      | **類型 + ISO 日期**       | `sdlc-progress-report_2026-01-30.md`                  | 必須加日期後綴       |
| **圖片**          | **snake_case**            | `logo_main.png`, `banner_home.jpg`                    | 不需日期             |
| **Shell 腳本**    | **kebab-case**            | `deploy-prod.sh`, `setup-env.sh`                      | 版本控制追蹤         |

---

## Directory Structure / 目錄結構

**This project uses a Monorepo structure with English-only directory names.**  
**本專案採用 Monorepo 結構，所有目錄名稱使用英文。**

```text
root/
├── .github/                    # CI/CD workflows
├── .husky/                     # Git hooks
├── backend/                    # Backend services (Node.js/Python)
│   └── ocr-service/           # OCR microservice
├── apps/                       # Monorepo applications
│   ├── web/                    # Next.js Web App + PWA (Main Development)
│   │   ├── app/                # Route pages
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom Hooks
│   │   └── lib/                # Utility functions
│   └── mobile/                 # Expo App (Paused, code preserved)
│       └── src/
│           ├── components/     # React Native components
│           ├── screens/        # Screens
│           └── lib/            # Utility functions
├── packages/                   # Shared packages
│   ├── ui/                     # Shared UI components
│   ├── utils/                  # Shared utilities
│   └── types/                  # Shared TypeScript types
├── supabase/                   # Supabase (Migrations, Seeds)
│   ├── migrations/
│   └── config.toml
├── docs/                       # Documentation center (ALL docs here)
│   ├── deployment-guides/      # Deployment guides, environment setup
│   ├── design-guidelines/      # UI/UX design specs, Figma files
│   │   └── references/         # Design references
│   ├── implementation-plans/   # Implementation plans
│   ├── progress-reports/       # Progress reports and status tracking
│   │   ├── ocr-development/    # OCR development reports
│   │   ├── daily-reports/      # Daily work reports
│   │   └── database-reports/   # Database progress reports
│   ├── product-overview/       # Product requirements and use cases
│   ├── technical-selection/    # Technical architecture and selection
│   └── file-naming-guidelines.md  # This file
└── scripts/                    # Automation scripts (Build, Deploy, Maintenance)
    └── clean-macos-files.sh    # macOS hidden files cleaner
```

---

## Archiving Process / 歸檔流程

**To avoid cluttering the project root, all non-code files should follow this archiving process:**  
**為避免專案根目錄混亂，所有非代碼類文件應遵循以下歸檔流程：**

### 1. New Files / 新增文件

**English Guidelines**:
- **Deployment & Environment**: Store in `docs/deployment-guides/`
- **Design Specs & UI/UX**: Store in `docs/design-guidelines/`
- **Progress Reports**:
  - OCR related → `docs/progress-reports/ocr-development/`
  - Project planning & Roadmap → `docs/progress-reports/roadmap/`
  - Daily work reports → `docs/progress-reports/daily-reports/`
  - Database related → `docs/progress-reports/database-reports/`
  - Other reports → `docs/progress-reports/`
- **Product Requirements & Use Cases**: Store in `docs/product-overview/`
- **Technical Selection & Architecture**: Store in `docs/technical-selection/`
- **Implementation Plans**: Store in `docs/implementation-plans/`
- **Temporary Notes/Drafts**: Store in `docs/drafts/` (move to official directory after finalization)
- **Images/Videos**: Store in `docs/design-guidelines/references/` or `apps/*/assets/` (if UI-related)

**中文指引**:
- **部署與環境文件**：存入 `docs/deployment-guides/`
- **設計規範與 UI/UX 文件**：存入 `docs/design-guidelines/`
- **進度報告**：
  - OCR 相關進度 → `docs/progress-reports/ocr-development/`
  - 專案規劃與 Roadmap → `docs/progress-reports/roadmap/`
  - 每日工作報告 → `docs/progress-reports/daily-reports/`
  - 資料庫相關進度 → `docs/progress-reports/database-reports/`
  - 其他進度報告 → `docs/progress-reports/`
- **產品需求與使用場景**：存入 `docs/product-overview/`
- **技術選型與架構文件**：存入 `docs/technical-selection/`
- **implementation-plan**：存入 `docs/implementation-plans/`
- **臨時筆記/草稿**：存入 `docs/drafts/`（確認定稿後移至正式目錄）
- **圖片影音**：存入 `docs/design-guidelines/references/` 或 `apps/*/assets/`（若為 UI 相關）

### 2. Version Control / 版本控管

**English Guidelines**:
- **Outdated Files**:
  - **Do NOT delete**, move to `docs/archive/`
  - Add prefix `archived_YYYYMMDD_filename.md` to file name
  - Add note at file beginning: `> This document is deprecated and preserved for historical reference.`

**中文指引**:
- **過時文件**：
  - **不要刪除**，將其移動至 `docs/archive/`
  - 在檔名加上前綴 `archived_YYYYMMDD_filename.md`
  - 在文件開頭標註：`> This document is deprecated and preserved for historical reference.`

### 3. Root Cleanup / 根目錄淨空

**The root directory should ONLY contain the following types of core files:**  
**根目錄僅保留以下各類型的核心檔案：**

- **Environment Config**: `.env.*`, `.gitignore`, `.editorconfig`
- **Dependency Management**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- **Project Entry**: `README.md`, `CONTRIBUTING.md`, `LICENSE`
- **AI Collaboration**: `CLAUDE.md`, `FILE_CREATION_CHECKLIST.md`
- **Tool Config**: `tsconfig.json`, `eslint.config.js`

**ALL other Markdown files MUST be archived to the corresponding category directory under `docs/`.**  
**所有其他 Markdown 文件必須歸檔至 `docs/` 下對應分類目錄。**

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

| Type       | 說明     | 範例                                                  |
| :--------- | :------- | :---------------------------------------------------- |
| `feat`     | 新功能   | `[Claude] feat(auth): add OAuth2 integration`         |
| `fix`      | Bug 修復 | `[Gemini] fix(ui): resolve button alignment issue`    |
| `docs`     | 文件更新 | `[GPT-4] docs(api): add endpoint documentation`       |
| `refactor` | 代碼重構 | `[DeepSeek] refactor(utils): simplify date formatter` |
| `test`     | 測試相關 | `[Claude] test(auth): add unit tests for login flow`  |
| `chore`    | 維護任務 | `[Gemini] chore(deps): update dependencies`           |

---

## ⚡ Quick Checklist / 快速檢查表

### 📝 File Creation Checklist / 文件創建檢查表

**When creating new files / 創建新文件時：**

- [ ] Is the file/folder name in English? / 檔案/資料夾名稱是否使用英文？
- [ ] Does the Markdown file include complete Metadata (creator, date, version)? / Markdown 文件是否已加入完整 Metadata？
- [ ] Is the creator's identity indicated at the file beginning or in comments? / 是否在檔案開頭或註解中標注了創建者身份？
- [ ] Do important files include a "Change History" table? / 重要文件是否加入了「修改歷史」表格？
- [ ] Does the file name follow naming conventions (PascalCase/camelCase/kebab-case)? / 檔名是否符合命名規範？
- [ ] Is the file placed in the correct directory category? / 文件是否已放入正確的目錄分類？

### 🔧 File Modification Checklist / 文件修改檢查表

**When modifying existing files / 修改現有文件時：**

- [ ] Is the "Last Modified" date and "Modified By" in Metadata updated? / 是否更新了 Metadata 中的「最後修改」日期與「修改者」？
- [ ] Is a new record added to the "Change History" table? / 是否在「修改歷史」表格中新增一筆記錄？
- [ ] For major changes, is the version number upgraded (Major/Minor)? / 修改範圍較大時，是否考慮升級版本號？
- [ ] Does the Git Commit message include the `[AI Name]` prefix? / Git Commit 訊息是否加入了 `[AI名稱]` 前綴？
- [ ] Is the team notified of important file changes? / 是否通知團隊重要文件的變更？

### 💻 Code Commit Checklist / 程式碼提交檢查表

**Before committing code / 提交代碼前：**

- [ ] Are component file names in `PascalCase`? (e.g., `Button.tsx`) / 元件檔名是否為 `PascalCase`？
- [ ] Are utility function file names in `camelCase`? (e.g., `formatDate.ts`) / 函數工具檔名是否為 `camelCase`？
- [ ] Are all file and folder names in English? / 所有檔案和資料夾名稱是否使用英文？
- [ ] Are temporary files removed from the root directory? / 是否移除了根目錄下的臨時文件？
- [ ] Do important code files include file header comments (creator, modifier)? / 重要程式碼檔案是否加入了檔案頭部註解？
- [ ] Does the commit message follow `[AI Name] type(scope): message` format? / Commit 訊息是否符合格式？

---

## 📝 Change History / 修改歷史

| Date       | Version | Modified By            | Changes                                                      |
| ---------- | ------- | ---------------------- | ------------------------------------------------------------ |
| 2026-02-02 | 3.0     | Claude Sonnet 4.5      | Complete rewrite: English-only file names, bilingual content |
| 2026-02-01 | 2.2     | Gemini 3 Pro (Preview) | Updated directory structure, archiving process               |
| 2026-01-30 | 2.1     | Claude Sonnet 4.5      | Added AI collaborator identification and change tracking     |
| 2026-01-30 | 1.0     | Project Team           | Initial version                                              |

| 日期       | 版本 | 修改者                 | 修改內容                           |
| ---------- | ---- | ---------------------- | ---------------------------------- |
| 2026-02-02 | 3.0  | Claude Sonnet 4.5      | 完全重寫：英文專用檔案名、雙語內容 |
| 2026-02-01 | 2.2  | Gemini 3 Pro (Preview) | 更新目錄結構、歸檔流程             |
| 2026-01-30 | 2.1  | Claude Sonnet 4.5      | 新增 AI 協作者識別與修改追蹤       |
| 2026-01-30 | 1.0  | Project Team           | 初始版本                           |

---

## 📚 References / 參考資源

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

> **Note / 注意**: Good naming is the best comment, clear history is the best collaboration tool.  
> **注意**: 好的命名是最好的註解，清楚的歷史記錄是最好的協作工具。
