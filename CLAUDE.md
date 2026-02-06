# Owner Management Agent AI App - AI Assistant Rules

> **創建日期**: 2026-01-17
> **創建者**: Project Team
> **最後修改**: 2026-02-06
> **最後修改者**: Claude Sonnet 4.5
> **版本**: 2.9 (整合測試檔案管理規範)
> **適用於**: Claude, GPT, Gemini, DeepSeek 等所有 AI 助手
> **重要性**: 🔴 **強制遵守** - AI 必須在每次創建或修改文件前檢查本規範

---

## 🚨 創建檔案前必讀（30 秒快速檢查）

> **⚠️ 在創建任何檔案之前，請先閱讀：[FILE_CREATION_CHECKLIST.md](FILE_CREATION_CHECKLIST.md)**

**快速檢查三要素**：

1. ✅ **檔名符合規則嗎？** (PascalCase / camelCase / kebab-case)
2. ✅ **Metadata 或文件頭部註解加了嗎？**
3. ✅ **放對位置了嗎？** (apps / docs / packages / backend)

**範本位置**：

- Markdown 範本 → [FILE_CREATION_CHECKLIST.md](FILE_CREATION_CHECKLIST.md) 第 15 行
- TypeScript 範本 → [FILE_CREATION_CHECKLIST.md](FILE_CREATION_CHECKLIST.md) 第 40 行
- Python 範本 → [FILE_CREATION_CHECKLIST.md](FILE_CREATION_CHECKLIST.md) 第 62 行

**自動驗證**：創建檔案後執行 `python scripts/validate_file_headers.py` 檢查是否符合規範

---

## 📌 核心規範速查

| 規範類型           | 文檔路徑                                                                                               | 強制性 |
| :----------------- | :----------------------------------------------------------------------------------------------------- | :----- |
| **檔案命名與歸檔** | [docs/file-naming-guidelines.md](docs/file-naming-guidelines.md) (含測試檔案管理規範)                 | 🔴 強制 |
| **測試快速參考**   | [docs/testing/TEST_QUICK_REFERENCE.md](docs/testing/TEST_QUICK_REFERENCE.md)                          | 🟡 推薦 |
| **AI 協作者識別**  | 見本文件「AI 身份標記規範」章節                                                                        | 🔴 強制 |
| **通用開發規則**   | [.claude/rules/general.md](.claude/rules/general.md)                                                   | 🔴 強制 |
| **前端規則**       | [.claude/rules/frontend/react-expo.md](.claude/rules/frontend/react-expo.md)                           | 🔴 強制 |
| **後端規則**       | [.claude/rules/backend/supabase.md](.claude/rules/backend/supabase.md)                                 | 🔴 強制 |
| **UI/UX 設計規範** | [docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md](docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md) | 🔴 強制 |

---

## ⚠️ AI 行為強制要求

### 1. 🔴 文件創建前必須檢查

在創建或修改**任何**文件之前，AI 必須：

1. **檢查文件類型**並確定正確的命名規則：

   - React 組件 → `PascalCase.tsx`
   - Utilities → `camelCase.ts`
   - 資料夾 → `kebab-case`
   - 文檔 → `snake_case_YYYY-MM-DD.md`
2. **確定正確的歸檔位置**：

   - Web 頁面 → `apps/web/app/`
   - Mobile 頁面 → `apps/mobile/src/app/` 或 `apps/mobile/app/`
   - 程式碼文件 → `apps/*/src/`, `packages/*/src/` 或 `backend/*/src/`
   - 技術文檔 → `docs/` 下對應分類 (如 `project-process/progress-reports/`)
   - 臨時文件 → `docs/drafts/`
   - **禁止**直接在專案根目錄創建文檔類文件
3. **添加必要的元數據**：

   - 程式碼文件需包含 `// filepath: <path>` 註解
   - Markdown 文檔需包含完整 Metadata（創建日期、創建者、最後修改、修改者、版本）
   - 重要文檔需包含「修改歷史」表格
   - 所有文件必須標記創建者/修改者身份（見下方「AI 身份標記規範」）

### 2. 🔴 命名規則強制執行

| 文件類型            | 規則                    | 範例                    | 錯誤範例               |
| :------------------ | :---------------------- | :---------------------- | :--------------------- |
| **React Component** | PascalCase.tsx          | `UserProfile.tsx`       | ❌`userProfile.tsx`     |
| **Hook**            | camelCase.ts            | `useAuth.ts`            | ❌`UseAuth.ts`          |
| **Utility**         | camelCase.ts            | `dateFormatter.ts`      | ❌`DateFormatter.ts`    |
| **資料夾**          | kebab-case              | `user-profiles/`        | ❌`userProfiles/`       |
| **文檔**            | snake_case              | `api_doc.md`            | ❌`API-Doc.md`          |
| **帶日期文檔**      | YYYY-MM-DD_name.md      | `2026-01-30_notes.md`   | ❌`notes-2026-01-30.md` |
| **Migration**       | YYYYMMDDHHmmss_name.sql | `202601221200_init.sql` | ❌`init-db.sql`         |

### 3. 🔴 文件歸檔路徑規則

#### 禁止的操作 ❌

- ❌ 在專案根目錄創建 `.md`、`.txt`、`.doc` 等文檔文件
- ❌ 在專案根目錄創建測試或臨時文件（如 `test.js`, `temp.md`）
- ❌ 使用中文命名程式碼文件或資料夾

#### 正確的歸檔位置 ✅

```
✅ docs/                       # 所有文檔的家
├── deployment-guides/        # 部署指南、環境設定
├── design-guidelines/        # UI/UX 設計規範、Figma 文件
│   └── references/           # 設計參考資料
├── product-overview/  # 產品需求與使用場景
└── 硬體與軟體技術選型說明/  # 技術架構與選型決策

✅ project-process/              # 專案流程與進度
├── progress-reports/            # 進度報告
│   ├── ocr-development/
│   ├── roadmap/
│   ├── daily-reports/
│   └── database-reports/

✅ apps/web/                   # Next.js 應用
├── app/                      # 路由頁面
└── components/               # UI 組件

✅ apps/mobile/                # Expo 應用
├── src/components/           # UI 組件
└── src/lib/                  # 工具函數

✅ backend/                    # 後端服務
└── ocr_service/              # OCR 微服務

✅ supabase/migrations/        # 資料庫遷移
└── YYYYMMDDHHmmss_desc.sql
```

### 4. 🔴 創建文件時的檢查清單

AI 在創建文件後必須自我確認：

- [ ] 文件名是否符合正確的 casing 規則？
- [ ] 文件是否放在正確的 Monorepo 目錄中？
- [ ] 程式碼文件是否包含 `// filepath: ` 註解？
- [ ] Markdown 文檔是否包含完整 Metadata（創建者、修改者、版本）？
- [ ] 是否標記了創建者身份（使用標準 AI 名稱）？
- [ ] Git Commit 訊息是否加入 `[AI名稱]` 前綴？
- [ ] 是否避免了在根目錄創建文檔？
- [ ] **測試文件**: 是否遵循 colocated 測試結構？(放在 `__tests__/` 目錄)
- [ ] **測試文件**: 是否使用正確的後綴？(`.test.ts` / `.spec.ts`)
- [ ] **測試文件**: E2E 測試是否放在 `e2e/flows/{module}/` 下？

---

## 🎯 專案開發策略 (2026-02-02 更新)

### 當前開發重點

**Phase 1: Next.js Web App + PWA (進行中)** ✅
- ✅ 專注開發 Next.js Web 應用
- ✅ 響應式設計 (手機瀏覽器可用)
- ✅ PWA 支援 (可安裝到手機桌面)
- ✅ 完整的房東管理功能

**Phase 2: Mobile App (已暫停)** ⏸️
- ⏸️ Expo/React Native 開發已暫停
- 📁 代碼保留在 `apps/mobile/` (不刪除)
- 📊 待 Web App 上線後，根據用戶需求決定是否繼續開發

### 策略調整原因

1. **聚焦核心價值** - 先做出能用的產品
2. **快速迭代** - 開發速度提升 2 倍 (3-4 個月 vs 6-8 個月)
3. **成本效益** - 節省 60% 開發成本 (NT$ 600K vs NT$ 1.5M)
4. **數據驅動** - 用市場反饋決定是否需要 Native App

### PWA 功能

- ✅ 安裝到桌面 (iOS/Android)
- ✅ 全螢幕模式 (無瀏覽器 UI)
- ✅ 手機相機拍照
- ✅ 相簿選擇
- ✅ 推送通知 (計劃中)
- ✅ 離線基本功能

**詳細說明**: 參見 `docs/implementation-plans/` 目錄

---

## 📁 專案結構（Monorepo）

```text
root/
├── .env                      # 環境變數
├── package.json              # 專案依賴 (Turborepo)
├── turbo.json                # Turborepo 配置
│
├── apps/                     # 應用程式
│   ├── web/                  # 🌐 Next.js Web App + PWA (Port 3000) ✅ 主要開發
│   └── mobile/               # 📱 Expo App (已暫停開發，代碼保留)
│
├── packages/                 # 共用套件
│   ├── ui/                   # 共用 UI 組件
│   ├── utils/                # 共用工具函數
│   └── types/                # 共用 TypeScript 型別
│
├── backend/                  # 🔧 後端服務
│   └── ocr_service/          # Python OCR 微服務
│
├── supabase/                 # 🗄️ 資料庫
│   ├── migrations/           # SQL 遷移檔 (Core + IAM)
│   └── config.toml
│
├── docs/                     # 📚 專案文檔中心
│   ├── access-matrix-design-guidelines-and-process/ # 🔐 IAM 權限架構與矩陣設計
│   │   ├── design_guidelines/ # 設計規範
│   │   ├── process_flows/    # 流程圖
│   │   ├── templates/        # 範本
│   │   └── examples/         # 範例
│   ├── deployment-guides/    # 部署指南、環境設定
│   ├── design-guidelines/    # UI/UX 設計規範、Figma 文件
│   │   └── references/       # 設計參考資料
│   ├── implementation-plans/ # implementation-plan
│   ├── product-overview/     # 產品需求與使用場景
│   ├── technical-selection/  # 技術架構與選型決策
│   ├── testing/              # 🧪 測試規範與管理
│   │   ├── TEST_FILE_MANAGEMENT_STANDARD.md  # 完整測試檔案管理規範
│   │   └── TEST_QUICK_REFERENCE.md           # 測試快速參考卡
│   └── file-naming-guidelines.md  # 檔案命名規則與歸檔總則 (v4.0 含測試規範)
│
├── project-process/          # 🔄 專案流程與進度
│   └── progress-reports/     # 進度報告
│
└── scripts/                  # 🔨 自動化腳本
```

---

## 🤖 AI 身份標記規範

### 標準 AI 協作者名稱

所有參與專案的 AI 必須使用以下統一識別名稱：

| AI 模型                | 標準識別名稱             | Git Commit 簡稱 |
| :--------------------- | :----------------------- | :-------------- |
| Claude Opus 4.5        | `Claude Opus 4.5`        | `[Claude]`      |
| Claude Sonnet 4.5      | `Claude Sonnet 4.5`      | `[Claude]`      |
| Claude Opus 4          | `Claude Opus 4`          | `[Claude]`      |
| Gemini 2.5 Pro         | `Gemini 2.5 Pro`         | `[Gemini]`      |
| Gemini 3 Pro (Preview) | `Gemini 3 Pro (Preview)` | `[Gemini]`      |
| Gemini 2.0 Flash       | `Gemini 2.0 Flash`       | `[Gemini]`      |
| GPT-4.5                | `GPT-4.5`                | `[GPT-4]`       |
| GPT-4o                 | `GPT-4o`                 | `[GPT-4]`       |
| DeepSeek V3            | `DeepSeek V3`            | `[DeepSeek]`    |

### Markdown 文檔 Metadata 格式

**所有** Markdown 文檔必須在開頭包含：

```markdown
> **創建日期**: YYYY-MM-DD  
> **創建者**: AI 名稱  
> **最後修改**: YYYY-MM-DD  
> **修改者**: AI 名稱  
> **版本**: Major.Minor
```

### 程式碼文件 Header 格式

重要的程式碼文件應加入：

```typescript
/**
 * @file ComponentName.tsx
 * @created 2026-01-30
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-30
 * @modifiedBy Claude Sonnet 4.5
 */
```

### Git Commit 訊息格式

**強制格式**：

```bash
[AI名稱] type(scope): commit message

# 範例
[Claude] feat(database): add RLS policies for properties table
[Gemini] fix(ui): resolve mobile navigation drawer issue
[GPT-4] docs(readme): update installation instructions
[DeepSeek] refactor(ocr): optimize image preprocessing
```

**Commit Type 標準**：

- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `refactor`: 代碼重構
- `test`: 測試相關
- `chore`: 維護任務

---

## 🛠️ 代碼品質要求

### 必須包含的註解

所有程式碼文件開頭必須包含：

```typescript
// filepath: apps/mobile/src/components/UserProfile.tsx
// description: 使用者個人資料組件
// created: 2026-01-30
// creator: Claude Sonnet 4.5
```

### TypeScript 嚴格模式

- 所有前端代碼必須使用 **TypeScript**
- 禁止使用 `any` 類型（除非有明確註釋說明原因）
- 所有函數參數和返回值必須有類型標註

---

## 🎯 技能使用優先級（Skills Priority）

在開發中遇到需要建議或協助時，按以下優先級查詢：

| 優先級     | 來源              | 說明                                     | 例子                                                       |
| :--------- | :---------------- | :--------------------------------------- | :--------------------------------------------------------- |
| **1️⃣ 最高** | `.claude/rules/`  | 專案強制規範（必須遵守）                 | `general.md`, `react-expo.md`, `supabase.md`               |
| **2️⃣ 中等** | `.claude/skills/` | 專案自定義技能（推薦使用）               | `python-security-scan`                                     |
| **3️⃣ 參考** | 系統 Skills       | 通用建議（低優先級，當無項目規則時使用） | `coding-standards`, `security-review`, `frontend-patterns` |

**使用原則**：

- 優先遵守 `.claude/rules/` 中的規範
- 無專案規則時，使用 `.claude/skills/` 中的技能
- 系統 Skills 僅作為通用參考，不覆蓋項目規則

---

## 📖 Context7 技術文檔參考

查詢最新官方文檔時使用：

| 技術          | Context7 路徑           |
| :------------ | :---------------------- |
| React 19      | `/facebook/react`       |
| Next.js 15    | `/vercel/next.js`       |
| Expo 54       | `/expo/expo`            |
| Supabase      | `/supabase/supabase`    |
| TypeScript    | `/microsoft/typescript` |
| PostgreSQL 17 | `/postgres/postgres`    |

---

## 🚀 快速指令

```bash
# Supabase
supabase start                # 啟動本地 Supabase
supabase status               # 檢查服務狀態

# Workspace 開發
npm install                   # 安裝所有依賴
./start-dev.sh both           # 同時啟動 Web & Mobile
npm run dev:web               # 僅啟動 Web (Next.js)
npm run dev:mobile            # 僅啟動 Mobile (Expo)
npm run dev:stop              # 停止所有服務

# Testing
npm run build                 # 透過所有 workspace 執行 build
npm run lint                  # 透過所有 workspace 執行 lint
npm run test                  # 執行所有單元測試 (Jest)
npm run test:watch            # 監視模式運行測試
npm run test:coverage         # 產生測試覆蓋率報告
npm run test:e2e              # 執行 E2E 測試 (Playwright)
npm run test:e2e:ui           # E2E 測試互動模式
npm run test:e2e:report       # 查看 E2E 測試報告
```

---

## 🗄️ 資料庫架構重點

### Data Schema & Abstraction Layer (資料架構與抽象層)

前端使用統一的 **`unified_properties_view` (Unified Property Index)** 訪問物件，這是一個 SQL Virtual Table，用於整合底層分散的資料表：

```typescript
// 前端代碼統一使用 unified_properties_view
const { data } = await supabase
  .from('unified_properties_view')  // ✅ 統一介面 (SQL View)
  .select('*')
```

**資料存取策略 (Access Strategy)**：

* **SQL View (e.g., `unified_properties_view`)**：用於**標準資料查詢 (Standard Querying)**。例如：列出清單、讀取詳情。
* **RPC (Database Functions)**：用於**特殊運算邏輯 (Specialized Logic)**。例如：地理位置搜尋、複雜權限過濾、批量操作。

### 核心表格

| 表名                      | 用途                                                      | 前端訪問方式                          |
| :------------------------ | :-------------------------------------------------------- | :------------------------------------ |
| `unified_properties_view` | **Unified Property Index**  (整合 Sales/Rentals 的虛擬表) | 透過此 View 查詢 (Read-Only)          |
| `Property_Sales`          | 出售物件實體表                                            | 透過 `unified_properties_view` 或 RPC |
| `Property_Rentals`        | 出租物件實體表                                            | 透過 `unified_properties_view` 或 RPC |
| `Property_Photos`         | 物件照片                                                  | 直接訪問                              |
| `users_profile`           | 使用者資料                                                | 直接訪問                              |

### Identity & Access Management (IAM)

權限與存取控制相關的系統表：

| 表名                | 用途     | 前端訪問方式        |
| :------------------ | :------- | :------------------ |
| `iam_groups`        | 權限群組 | Server Action / RPC |
| `iam_roles`         | 系統角色 | Server Action / RPC |
| `iam_group_members` | 群組成員 | Server Action / RPC |

---

## ✅ AI 創建文件示例

### ❌ 錯誤示例

```markdown
# AI 創建了以下文件（錯誤）
test-connection.js           # ❌ 在根目錄
docs/每日報告.md              # ❌ 中文文件名，格式錯誤
frontend/src/comp/test.tsx   # ❌ 舊結構，錯誤位置
```

### ✅ 正確示例

```markdown
# AI 創建了以下文件（正確）
docs/testing/connection_test_2026-01-30.md      # ✅ 正確位置，正確命名
apps/mobile/src/components/UserProfile.tsx      # ✅ PascalCase，正確 Monorepo 位置
apps/web/app/page.tsx                           # ✅ Next.js App Router 位置
supabase/migrations/20260130120000_init.sql     # ✅ 正確格式
```

---

## 📝 版本修訂記錄

| 日期       | 版本 | 修改者            | 修改內容                                                                                                        |
| ---------- | ---- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| 2026-02-06 | 2.9  | Claude Sonnet 4.5 | 整合測試檔案管理規範：更新檔案命名規範參考、新增測試目錄結構、加入測試檢查清單、擴充測試指令文檔               |
| 2026-02-02 | 2.8  | Claude Sonnet 4.5 | 更新專案開發策略：專注 Next.js Web App + PWA，暫停 Expo Mobile 開發                                             |
| 2026-02-02 | 2.7  | Antigravity       | 更新 docs/ 目錄結構，新增 Access Matrix 權限設計文件規範與 IAM 資料庫定義                                       |
| 2026-02-01 | 2.6  | Gemini 3 Pro      | 更新 docs/ 目錄結構，反映實際檔案歸檔位置                                                                       |
| 2026-02-01 | 2.5  | Gemini 3 Pro      | 新增 UI/UX 設計規範強制指引；整理設計文件資料夾結構；新增 Gemini 3 Pro 模型識別                                 |
| 2026-01-30 | 2.3  | Claude Opus 4.5   | 更新 AI 模型列表（新增 Claude Opus 4.5、Gemini 2.5 Pro、GPT-4.5）                                               |
| 2026-01-30 | 2.2  | Claude Sonnet 4.5 | 新增 AI 協作者識別規範、Metadata 標準、Git Commit 格式要求                                                      |
| 2026-01-30 | 2.1  | Project Team      | 升級為 Monorepo 架構 (Turborepo)，加入 `apps/web` 與 `apps/mobile` 路徑規範                                     |
| 2026-01-22 | 2.0  | Project Team      | 大幅擴充 AI 行為約束，添加文件命名檢查清單                                                                      |
| 2026-01-17 | 1.0  | Project Team      | 初始版本                                                                                                        |

---

## 🎯 總結：AI 必須做的事

1. **創建文件前**：檢查命名規則和 Monorepo 歸檔位置
2. **標記身份**：在所有文件中標記創建者/修改者（使用標準 AI 名稱）
3. **程式碼文件**：添加 `// filepath:` 和 `// creator:` 註解
4. **文檔文件**：
   - 存放在 `docs/` 下對應分類
   - 加入完整 Metadata（創建者、修改者、版本）
   - 重要文檔需包含「修改歷史」表格
5. **Git Commit**：使用 `[AI名稱] type(scope): message` 格式
6. **遵守 casing**：PascalCase/camelCase/kebab-case
7. **保持根目錄整潔**：不要在根目錄創建文檔或臨時文件
