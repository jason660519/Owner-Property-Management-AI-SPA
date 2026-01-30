# Owner Management Agent AI App - AI Assistant Rules

> **適用於**: Claude, GPT, Cursor AI 等所有 AI 助手
> **版本**: 2.1
> **更新日期**: 2026-01-30
> **重要性**: 🔴 **強制遵守** - AI 必須在每次創建或修改文件前檢查本規範

---

## 📌 核心規範速查

| 規範類型 | 文檔路徑 | 強制性 |
| :--- | :--- | :--- |
| **檔案命名與歸檔** | [docs/本專案檔案命名規則與新增文件歸檔總則.md](docs/本專案檔案命名規則與新增文件歸檔總則.md) | 🔴 強制 |
| **通用開發規則** | [.claude/rules/general.md](.claude/rules/general.md) | 🔴 強制 |
| **前端規則** | [.claude/rules/frontend/react-expo.md](.claude/rules/frontend/react-expo.md) | 🔴 強制 |
| **後端規則** | [.claude/rules/backend/supabase.md](.claude/rules/backend/supabase.md) | 🔴 強制 |

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
   - 技術文檔 → `docs/` 下對應分類 (如 `docs/progress-reports/`)
   - 臨時文件 → `docs/drafts/`
   - **禁止**直接在專案根目錄創建文檔類文件

3. **添加必要的元數據**：
   - 程式碼文件需包含 `// filepath: <path>` 註解
   - Markdown 文檔需包含更新日期和版本資訊

### 2. 🔴 命名規則強制執行

| 文件類型 | 規則 | 範例 | 錯誤範例 |
| :--- | :--- | :--- | :--- |
| **React Component** | PascalCase.tsx | `UserProfile.tsx` | ❌`userProfile.tsx` |
| **Hook** | camelCase.ts | `useAuth.ts` | ❌`UseAuth.ts` |
| **Utility** | camelCase.ts | `dateFormatter.ts` | ❌`DateFormatter.ts` |
| **資料夾** | kebab-case | `user-profiles/` | ❌`userProfiles/` |
| **文檔** | snake_case | `api_doc.md` | ❌`API-Doc.md` |
| **帶日期文檔** | YYYY-MM-DD_name.md | `2026-01-30_notes.md` | ❌`notes-2026-01-30.md` |
| **Migration** | YYYYMMDDHHmmss_name.sql | `202601221200_init.sql` | ❌`init-db.sql` |

### 3. 🔴 文件歸檔路徑規則

#### 禁止的操作 ❌

- ❌ 在專案根目錄創建 `.md`、`.txt`、`.doc` 等文檔文件
- ❌ 在專案根目錄創建測試或臨時文件（如 `test.js`, `temp.md`）
- ❌ 使用中文命名程式碼文件或資料夾

#### 正確的歸檔位置 ✅

```
✅ docs/                       # 所有文檔的家
├── roadmap/                  # 專案規劃
├── progress-reports/         # 進度報告
├── architecture/             # 系統架構
└── ...

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
- [ ] 文檔是否包含更新日期和版本？
- [ ] 是否避免了在根目錄創建文檔？

---

## 📁 專案結構（Monorepo）

```text
root/
├── .env                      # 環境變數
├── package.json              # 專案依賴 (Turborepo)
├── turbo.json                # Turborepo 配置
│
├── apps/                     # 應用程式
│   ├── web/                  # 🌐 Next.js 官網 (Port 3000)
│   └── mobile/               # 📱 Expo 管理 App (Port 8081)
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
│   ├── migrations/           # SQL 遷移檔
│   └── config.toml
│
├── docs/                     # 📚 專案文檔中心
│   ├── roadmap/              # 專案規劃
│   ├── progress-reports/     # 進度報告
│   └── ...
│
└── scripts/                  # 🔨 自動化腳本
```

---

## 🛠️ 代碼品質要求

### 必須包含的註解

所有程式碼文件開頭必須包含：

```typescript
// filepath: apps/mobile/src/components/UserProfile.tsx
// description: 使用者個人資料組件
// created: 2026-01-30
```

### TypeScript 嚴格模式

- 所有前端代碼必須使用 **TypeScript**
- 禁止使用 `any` 類型（除非有明確註釋說明原因）
- 所有函數參數和返回值必須有類型標註

---

## 📖 Context7 技術文檔參考

查詢最新官方文檔時使用：

| 技術 | Context7 路徑 |
| :--- | :--- |
| React 19 | `/facebook/react` |
| Next.js 15 | `/vercel/next.js` |
| Expo 54 | `/expo/expo` |
| Supabase | `/supabase/supabase` |
| TypeScript | `/microsoft/typescript` |
| PostgreSQL 17 | `/postgres/postgres` |

---

## 🚀 快速指令

```bash
# Supabase
supabase start                # 啟動本地 Supabase
supabase status               # 檢查服務狀態

# Monorepo (Turborepo)
npm install                   # 安裝所有依賴
turbo dev                     # 同時啟動 Web & Mobile
turbo dev --filter=web        # 僅啟動 Web
turbo dev --filter=mobile     # 僅啟動 Mobile

# Testing
npm run test                  # 執行測試
```

---

## 🗄️ 資料庫架構重點

### 統一物件介面

前端使用統一的 `properties` 視圖訪問物件：

```typescript
// 前端代碼統一使用 properties 視圖
const { data } = await supabase
  .from('properties')  // ✅ 統一介面
  .select('*')
```

### 核心表格

| 表名 | 用途 | 前端訪問方式 |
| :--- | :--- | :--- |
| `Property_Sales` | 出售物件 | 透過 `properties` 視圖 |
| `Property_Rentals` | 出租物件 | 透過 `properties` 視圖 |
| `Property_Photos` | 物件照片 | 直接訪問 |
| `users_profile` | 使用者資料 | 直接訪問 |

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

- **2026-01-30**：升級為 Monorepo 架構 (Turborepo)，加入 `apps/web` 與 `apps/mobile` 路徑規範，更新 Context7 參考 (Next.js 15)。
- **2026-01-22**：大幅擴充 AI 行為約束，添加文件命名檢查清單。
- **2026-01-17**：初始版本。

---

## 🎯 總結：AI 必須做的事

1. **創建文件前**：檢查命名規則和 Monorepo 歸檔位置
2. **程式碼文件**：添加 `// filepath:` 註解
3. **文檔文件**：存放在 `docs/` 下對應分類 (如 `progress-reports`)
4. **遵守 casing**：PascalCase/camelCase/kebab-case
5. **保持根目錄整潔**：不要在根目錄創建文檔或臨時文件
