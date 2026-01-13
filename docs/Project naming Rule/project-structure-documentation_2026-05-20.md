# Owner Real Estate Agent SaaS - 專案文件架構說明書

> 生成日期：2026-05-20  
> 版本：1.0  
> 目的：提供完整的專案目錄結構與檔案組織規範說明

---

## 📋 目錄

- [專案概述](#專案概述)
- [目錄結構總覽](#目錄結構總覽)
- [各層級說明](#各層級說明)
- [命名規範快速參考](#命名規範快速參考)
- [文件遷移指南](#文件遷移指南)

---

## 專案概述

**專案名稱**：Owner Real Estate Agent SaaS  
**技術架構**：Monorepo (前後端分離)  
**主要技術棧**：

- **Frontend**: React/Next.js/Expo
- **Backend**: Node.js/Express 或 Python
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel/AWS/GCP

**文件管理原則**：

1. 所有程式碼使用英文命名
2. 文檔可使用中文，但需搭配 ISO 日期格式
3. 根目錄保持乾淨，僅放置必要配置檔
4. 定期歸檔過時文件

---

## 目錄結構總覽

```text
/Users/jason66/Owner Real Estate Agent SaaS/
│
├── .github/                          # GitHub Actions & CI/CD 配置
│   └── workflows/
│       ├── ci.yml                    # 持續整合流程
│       └── deploy.yml                # 自動部署流程
│
├── backend/                          # 後端服務層
│   ├── src/
│   │   ├── controllers/              # 控制器 (camelCase)
│   │   │   ├── authController.ts
│   │   │   ├── propertyController.ts
│   │   │   └── userController.ts
│   │   ├── models/                   # 數據模型 (PascalCase)
│   │   │   ├── User.ts
│   │   │   ├── Property.ts
│   │   │   └── Agent.ts
│   │   ├── services/                 # 業務邏輯層 (camelCase)
│   │   │   ├── authService.ts
│   │   │   ├── emailService.ts
│   │   │   └── paymentService.ts
│   │   ├── utils/                    # 工具函數 (camelCase)
│   │   │   ├── dateFormatter.ts
│   │   │   ├── validator.ts
│   │   │   └── logger.ts
│   │   ├── middleware/               # 中間件
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   └── config/                   # 配置文件
│   │       ├── database.ts
│   │       └── env.ts
│   ├── tests/                        # 後端測試
│   │   ├── unit/                     # 單元測試
│   │   └── integration/              # 整合測試
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                         # 前端應用層
│   ├── src/
│   │   ├── components/               # React 組件 (PascalCase)
│   │   │   ├── common/               # 通用組件
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Modal.tsx
│   │   │   ├── layout/               # 佈局組件
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── property/             # 物業相關組件
│   │   │       ├── PropertyCard.tsx
│   │   │       ├── PropertyList.tsx
│   │   │       └── PropertyDetail.tsx
│   │   ├── hooks/                    # 自定義 Hooks (camelCase + use 前綴)
│   │   │   ├── useAuth.ts
│   │   │   ├── useProperty.ts
│   │   │   └── useWindowSize.ts
│   │   ├── pages/                    # 路由頁面 (kebab-case 或 PascalCase)
│   │   │   ├── index.tsx
│   │   │   ├── dashboard.tsx
│   │   │   └── properties/
│   │   │       ├── [id].tsx          # 動態路由
│   │   │       └── new.tsx
│   │   ├── store/                    # 狀態管理
│   │   │   ├── authStore.ts
│   │   │   ├── propertyStore.ts
│   │   │   └── index.ts
│   │   ├── utils/                    # 前端工具函數 (camelCase)
│   │   │   ├── apiClient.ts
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   ├── styles/                   # 全域樣式 (kebab-case)
│   │   │   ├── global-styles.css
│   │   │   └── variables.css
│   │   └── types/                    # TypeScript 類型定義
│   │       ├── api.ts
│   │       └── models.ts
│   ├── assets/                       # 靜態資源 (snake_case)
│   │   ├── images/
│   │   │   ├── logo_main.png
│   │   │   ├── icon_user.png
│   │   │   └── banner_home.jpg
│   │   └── fonts/
│   ├── public/                       # 公開靜態文件
│   ├── package.json
│   └── next.config.js
│
├── supabase/                         # Supabase 配置
│   ├── migrations/                   # 資料庫遷移 (timestamp 格式)
│   │   ├── 20260520000000_initial_schema.sql
│   │   └── 20260521000000_add_properties_table.sql
│   ├── seed/                         # 種子資料
│   │   └── initial_data.sql
│   └── config.toml
│
├── docs/                             # 📚 專案文檔中心
│   ├── architecture/                 # 系統架構文檔
│   │   ├── system-overview.md
│   │   ├── database-schema.md
│   │   ├── tech-stack-decisions.md
│   │   └── project-structure-documentation_2026-05-20.md  # 本文件
│   ├── api/                          # API 文檔
│   │   ├── api-reference.md
│   │   ├── authentication.md
│   │   └── openapi.yaml
│   ├── guides/                       # 開發指南
│   │   ├── getting-started.md
│   │   ├── deployment-guide.md
│   │   ├── coding-standards.md
│   │   └── project-naming-and-filing-guidelines_2026-05-20.md
│   ├── meetings/                     # 會議記錄 (ISO 日期格式)
│   │   ├── 2026-05-15_kickoff-meeting.md
│   │   └── 2026-05-20_sprint-planning.md
│   ├── drafts/                       # 草稿文件 (臨時使用)
│   ├── assets/                       # 文檔用圖片/附件
│   │   └── diagrams/
│   └── archive/                      # 歷史歸檔
│       └── archived_20260101_old-structure.md
│
├── scripts/                          # 自動化腳本 (kebab-case)
│   ├── deploy-prod.sh
│   ├── setup-env.sh
│   ├── db-backup.sh
│   └── generate-docs.sh
│
├── .env.example                      # 環境變數範本
├── .gitignore
├── .editorconfig
├── package.json                      # 根 package.json (Monorepo 管理)
├── pnpm-workspace.yaml              # PNPM Workspace 配置
├── tsconfig.json                     # TypeScript 全域配置
├── eslint.config.js                  # ESLint 配置
├── prettier.config.js                # Prettier 配置
├── README.md                         # 專案說明文件
├── CONTRIBUTING.md                   # 貢獻指南
└── LICENSE                           # 授權條款
```

---

## 各層級說明

### 1. Backend (`/backend`)

**用途**：後端 API 服務，處理業務邏輯、資料存取與第三方整合。

**關鍵目錄**：

- `controllers/`：處理 HTTP 請求與回應
- `models/`：定義資料模型與 ORM 映射
- `services/`：核心業務邏輯
- `utils/`：共用工具函數（日期處理、加密、驗證等）

**範例檔案**：

```typescript
// authController.ts - 處理使用者登入/註冊請求
// userService.ts - 使用者相關業務邏輯
// User.ts - 使用者資料模型
```

---

### 2. Frontend (`/frontend`)

**用途**：前端 UI 應用，使用者互動介面。

**關鍵目錄**：

- `components/`：可重用的 React 組件
- `pages/`：頁面路由（Next.js 規範）
- `hooks/`：自定義 React Hooks
- `store/`：全域狀態管理（Zustand/Redux）

**組件分類原則**：

- `common/`：通用 UI 組件（按鈕、卡片、表單等）
- `layout/`：頁面佈局組件（Header、Footer、Sidebar）
- `{feature}/`：功能模組組件（如 `property/`, `user/`）

---

### 3. Supabase (`/supabase`)

**用途**：資料庫遷移、種子資料與 Supabase 配置。

**重要規範**：

- Migration 檔案必須使用 timestamp 格式：`YYYYMMDDHHMMSS_description.sql`
- 所有 SQL 變更必須透過 migration 進行，不可直接修改資料庫

---

### 4. Docs (`/docs`)

**用途**：集中管理所有專案文檔。

**分類邏輯**：

- `architecture/`：技術架構、系統設計、技術決策
- `api/`：API 規格書、Swagger/OpenAPI 定義
- `guides/`：開發指南、部署手冊、編碼規範
- `meetings/`：會議記錄（按日期命名）
- `drafts/`：草稿文件（定稿後移至對應目錄）
- `archive/`：過時但需保留的歷史文件

---

## 命名規範快速參考

| 文件類型      | 命名規則              | 範例                  |
| :------------ | :-------------------- | :-------------------- |
| React 組件    | PascalCase            | `UserProfile.tsx`     |
| 工具函數      | camelCase             | `dateFormatter.ts`    |
| Hooks         | camelCase (use 前綴)  | `useAuth.ts`          |
| 樣式檔        | kebab-case            | `global-styles.css`   |
| 模型類別      | PascalCase            | `User.ts`             |
| 控制器        | camelCase             | `authController.ts`   |
| 配置檔        | kebab-case            | `tailwind.config.js`  |
| 資料夾        | kebab-case            | `api-routes/`         |
| Markdown 文檔 | snake_case + ISO 日期 | `guide_2026-05-20.md` |
| 圖片          | snake_case            | `logo_main.png`       |
| Shell 腳本    | kebab-case            | `deploy-prod.sh`      |

**詳細規範請參考**：`docs/guides/project-naming-and-filing-guidelines_2026-05-20.md`

---

## 文件遷移指南

### 當前需要處理的文件

1. **中文檔名文件**
   - **原路徑**：`/Users/jason66/Owner Real Estate Agent SaaS/本專案檔案命名規則與新增文件歸檔總則.md`
   - **新路徑**：`docs/guides/project-naming-and-filing-guidelines_2026-05-20.md`
   - **狀態**：✅ 已遷移

2. **專案架構說明書**
   - **路徑**：`docs/architecture/project-structure-documentation_2026-05-20.md`
   - **狀態**：✅ 已建立

### 未來新增文件流程

1. **確定文件類型**（架構文檔/API 文檔/開發指南/會議記錄）
2. **選擇對應目錄**（`architecture/`, `api/`, `guides/`, `meetings/`）
3. **使用正確命名規則**（英文 + ISO 日期）
4. **更新本文件**（若有重大架構變更）

### 歸檔舊文件

若文件已過時但需保留：

```bash
# 移至 archive/ 並重新命名
mv docs/guides/old-guide.md \
   docs/archive/archived_20260520_old-guide.md
```

在文件開頭加上標註：

```markdown
> ⚠️ This document is deprecated and preserved for historical reference only.
> Replaced by: [new-guide.md](../guides/new-guide.md)
```

---

## 維護計畫

**本文件更新時機**：

- ✅ 新增主要目錄層級
- ✅ 重大架構調整
- ✅ 命名規範變更
- ✅ 每季度定期審查

**最後審查日期**：2026-05-20  
**下次審查日期**：2026-08-20  
**文件負責人**：開發團隊

---

## 相關文件

- [專案命名與歸檔總則](../guides/project-naming-and-filing-guidelines_2026-05-20.md)
- [開發入門指南](../guides/getting-started.md)
- [API 文檔](../api/api-reference.md)
- [資料庫架構](./database-schema.md)

---

**Document Version**: 1.0  
**Generated**: 2026-05-20  
**Format**: Markdown  
**Encoding**: UTF-8
