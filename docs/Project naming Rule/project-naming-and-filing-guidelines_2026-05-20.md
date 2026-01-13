# 本專案檔案命名規則與新增文件歸檔總則

> 更新日期：2026-05-20  
> 版本：2.0 (Industry Standard Edition)  
> 目的：採用業界標準規範 (Best Practices) 統一專案文件架構,提升代碼可讀性與團隊協作效率

---

## 📋 內容表

- [核心原則](#核心原則)
- [命名規則](#命名規則)
- [目錄結構指引](#目錄結構指引)
- [檔案歸檔流程](#檔案歸檔流程)

---

## 核心原則

1.  **一致性**: 相同類型的文件必須遵循相同的命名規則。
2.  **可預測性**: 文件的內容和目的應該從其名稱中清楚地表達出來。
3.  **語義性**: 優先使用完整單詞而不是縮寫（例如，使用 `config`、`utils`、`img`）。
4.  **英語優先**: 代碼、配置和資源文件使用英語；文檔可以使用中文，但應遵循 ISO 日期格式。

---

## 命名規則

### 1. 原始碼文件

| 類型              | 規則                        | 範例                                          | 備註               |
| :---------------- | :-------------------------- | :-------------------------------------------- | :----------------- |
| **React 組件**    | **PascalCase**              | `UserProfile.tsx`, `Sidebar.tsx`              | 組件名稱首字母大寫 |
| **工具/輔助函數** | **camelCase**               | `dateFormatter.ts`, `apiClient.ts`            | 工具函數           |
| **Hooks**         | **camelCase (usePrefix)**   | `useAuth.ts`, `useWindowSize.ts`              | React Hooks 規範   |
| **樣式**          | **kebab-case** 或與組件相同 | `global-styles.css`, `UserProfile.module.css` |                    |
| **後端模型**      | **PascalCase**              | `User.ts`, `PropertyListing.ts`               | 類別定義           |
| **後端控制器**    | **camelCase**               | `authController.ts`, `paymentService.ts`      | 服務邏輯           |
| **配置文件**      | **kebab-case**              | `tailwind.config.js`, `tsconfig.json`         | 配置文件規範       |

### 2. 目錄

| 類型           | 規則           | 範例                                         |
| :------------- | :------------- | :------------------------------------------- |
| **一般資料夾** | **kebab-case** | `components`, `hooks`, `utils`, `api-routes` |
| **特殊類別**   | **kebab-case** | `__tests__`, `__mocks__`                     |

### 3. 文檔與資產

| 類型              | 規則                     | 範例                                                  |
| :---------------- | :----------------------- | :---------------------------------------------------- |
| **Markdown 文件** | **Snake＋ISO 日期**      | `api-documentation.md`, `2026-05-20_meeting_notes.md` |
| **圖片資產**      | **snake_case＋ISO 日期** | `logo_main.png`, `banner_home.jpg`                    |
| **Shell 腳本**    | **kebab-case＋ISO 日期** | `deploy-prod.sh`, `setup-env.sh`                      |

---

## 目錄結構指引

本專案採用 **Monorepo 風格** 的目錄結構，將前端、後端和基礎設施分開。

```text
root/
├── .github/                 # CI/CD 工作流程
├── backend/                 # 後端服務 (Node.js/Express/Python)
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
├── frontend/                # 前端應用 (React/Next.js/Expo)
│   ├── src/
│   │   ├── components/      # UI 組件
│   │   ├── hooks/           # 自訂 Hooks
│   │   ├── pages/           # 路由頁面
│   │   └── store/           # 狀態管理 (Zustand/Redux)
│   └── assets/              # 靜態資產 (圖片、字型)
├── supabase/                # Supabase 相關 (遷移、種子數據)
│   ├── migrations/
│   └── config.toml
├── docs/                    # 專案文檔中心
│   ├── architecture/        # 系統架構圖、技術決策
│   ├── api/                 # API 規範 (OpenAPI/Swagger)
│   ├── guides/              # 開發指引、部署手冊
│   └── meetings/            # 會議記錄 (按日期歸檔)
└── scripts/                 # 自動化腳本 (建置、部署、維護)
```

---

## 檔案歸檔流程

為了避免專案根目錄雜亂，所有非代碼文件應遵循以下歸檔流程：

### 1. 新文件

- **技術文件**: 直接存放在 `docs/` 下對應類別資料夾中。
- **臨時筆記/草稿**: 存放在 `docs/drafts/` 中，完成後移動到正式目錄。
- **圖片和視頻**: 存放在 `docs/assets/` 或 `frontend/assets/`（如果與 UI 相關）。

### 2. 版本控制

- **已淘汰文件**:
  - **勿刪除**，移動到 `docs/archive/` 中。
  - 文件名前綴 `archived_YYYYMMDD_`。
  - 文件頂部註明: `> 本文檔已淘汰，僅作歷史參考保留。`

### 3. 根目錄清理

根目錄應僅保留以下核心文件，其他應歸檔：

- **環境設置**: `.env.*`, `.gitignore`, `.editorconfig`
- **依賴管理**: `package.json`, `pnpm-workspace.yaml`
- **專案入口**: `README.md`, `CONTRIBUTING.md`, `LICENSE`
- **工具配置**: `tsconfig.json`, `eslint.config.js`

---

## ⚡ 快速檢查清單

在提交代碼之前，請自檢：

- [ ] 組件檔案名稱是否為 `PascalCase`？（例如：`Button.tsx`）
- [ ] 工具函數檔案名稱是否為 `camelCase`？（例如：`formatDate.ts`）
- [ ] 所有圖片檔案名稱是否為小寫並用底線分隔？（例如：`icon_user.png`）
- [ ] 是否已移除根目錄下的臨時文件（如 `temp.txt`、`test.js`）？
- [ ] 文件是否放置在 `docs/` 下對應的子目錄中？

> **注意**: 良好的命名是最好的文檔。如果本指引不足，請參考 [Google 開發者文檔風格指南](https://developers.google.com/style)。
