# 通用開發規則

> 此規則適用於整個專案的所有檔案

---

## 命名規範

**完整規範請參考**：[本專案檔案命名規則與新增文件歸檔總則](../../docs/本專案檔案命名規則與新增文件歸檔總則.md)

### 快速參考表

| 文件類型 | 命名規則 | 範例 |
| :--- | :--- | :--- |
| React 組件 | PascalCase | `UserProfile.tsx`, `Sidebar.tsx` |
| Hooks | camelCase + use 前綴 | `useAuth.ts`, `useWindowSize.ts` |
| 工具函數 | camelCase | `dateFormatter.ts`, `apiClient.ts` |
| 資料夾 | kebab-case | `components`, `api-routes` |
| 配置檔案 | kebab-case | `tailwind.config.ts`, `tsconfig.json` |
| 文檔 | ISO 日期前綴（選用） | `2026-01-15_meeting_notes.md` |
| Shell 腳本 | kebab-case | `deploy-prod.sh`, `setup-env.sh` |

---

## Git 工作流

### Commit 訊息格式

```
<type>: <description>

[optional body]
[optional footer]
```

### Type 類型

| Type | 說明 | 範例 |
| :--- | :--- | :--- |
| `feat` | 新功能 | `feat: 新增物件上傳功能` |
| `fix` | Bug 修復 | `fix: 修正登入驗證錯誤` |
| `docs` | 文檔更新 | `docs: 更新 API 文檔` |
| `refactor` | 重構 | `refactor: 優化資料庫查詢` |
| `style` | 格式調整 | `style: 統一縮排為 2 空格` |
| `test` | 測試 | `test: 新增單元測試` |
| `chore` | 雜項 | `chore: 更新依賴版本` |

### 分支命名

- 功能：`feature/add-property-upload`
- 修復：`fix/login-validation`
- 文檔：`docs/update-api-reference`

---

## 程式碼風格

### 通用原則

- 使用 2 空格縮排
- 字串優先使用單引號（TypeScript/JavaScript）
- 行尾不留空白
- 檔案結尾保留一個空行

### TypeScript

- 啟用嚴格模式 (`strict: true`)
- 避免使用 `any`，優先使用明確型別
- Interface 命名使用 PascalCase
- 型別匯出使用 `export type`

### 註解

- 程式碼註解使用英文
- 複雜邏輯需加註解說明
- TODO 格式：`// TODO: description`
- FIXME 格式：`// FIXME: description`

---

## 語言偏好

| 場景 | 語言 |
| :--- | :--- |
| 程式碼註解 | 英文 |
| Commit 訊息 | 中文或英文（保持一致） |
| 文檔內容 | 繁體中文 |
| 變數命名 | 英文 |
| UI 文字 | 繁體中文 |

---

## 檔案組織 (Monorepo)

### 核心目錄結構

1. **Web 應用** (`apps/web`)：Next.js 15 對外官網與行銷頁面
2. **Mobile 應用** (`apps/mobile`)：Expo 房東管理 App
3. **後端服務** (`backend/`)：Python OCR 服務與其他微服務
4. **文檔中心** (`docs/`)：專案文檔與進度報告

### 新增檔案原則

1. **Web 頁面** → `apps/web/app/`
2. **Mobile 頁面** → `apps/mobile/src/app/` (Expo Router) 或 `apps/mobile/app/`
3. **共用組件** → `packages/ui/` (如已建立) 或各 app 的 `components/`
4. **工具函數** → `packages/utils/` (如已建立) 或各 app 的 `lib/`
5. **技術文件** → `docs/` 下對應分類 (如 `docs/progress-reports/`)

### 避免事項

- ❌ 在根目錄堆積臨時檔案
- ❌ 建立過深的巢狀結構（超過 4 層）
- ❌ 單一檔案超過 500 行
