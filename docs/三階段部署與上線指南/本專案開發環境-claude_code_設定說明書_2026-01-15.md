# 本專案開發環境 - Claude Code 設定說明書

> 文件日期：2026-01-15  
> 版本：v1.0（正式版）  
> 目的：說明本專案 Claude Code Memory 系統與 Context7 MCP 的設定架構

---

## 📋 目錄

- [一、Claude Code Memory 系統概述](#一claude-code-memory-系統概述)
- [二、五種記憶體類型對照表](#二五種記憶體類型對照表)
- [三、本專案設定現況](#三本專案設定現況)
- [四、Context7 MCP 整合說明](#四context7-mcp-整合說明)
- [五、檔案架構](#五檔案架構)
- [六、各檔案內容說明](#六各檔案內容說明)
- [七、使用指南](#七使用指南)
- [八、維護與更新](#八維護與更新)

---

## 一、Claude Code Memory 系統概述

Claude Code 提供階層式的記憶體系統，讓 AI 在不同的作用域（個人、專案、團隊、組織）記住您的偏好與指令。檔案越靠近上層（組織），優先級越高，會先載入作為基礎。

### 記憶體載入順序

```
1. Enterprise Policy (最高優先)
2. User Memory (個人全域)
3. Project Memory (專案共享)
4. Project Rules (模組化規則)
5. Project Memory Local (個人專案偏好)
```

---

## 二、五種記憶體類型對照表

| 類型                     | 檔案位置                                                    | 共享範圍              | 適用場景                       | 本專案狀態 |
| :----------------------- | :---------------------------------------------------------- | :-------------------- | :----------------------------- | :--------- |
| **Enterprise Policy**    | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | 組織全體              | 公司編碼標準、安全政策         | ❌ 未設定  |
| **User Memory**          | `~/.claude/CLAUDE.md`                                       | 僅個人（所有專案）    | 個人編碼風格、工具偏好         | ⚠️ 可選    |
| **Project Memory**       | `./CLAUDE.md` + `./.claude/CLAUDE.md`                       | 團隊（透過 Git 分享） | 專案架構、編碼規範、常用指令   | ✅ 已設定  |
| **Project Rules**        | `./.claude/rules/*.md`                                      | 團隊（透過 Git 分享） | 模組化規則（前端/後端/測試等） | ✅ 已設定  |
| **Project Memory Local** | `./CLAUDE.local.md`                                         | 僅個人（當前專案）    | 個人沙箱 URL、測試資料偏好     | ✅ 已設定  |

---

## 三、本專案設定現況

### 已完成的 `.claude/` 目錄結構

```
專案根目錄/
├── CLAUDE.md                         ✅ 專案主入口 + Context7 規則
├── CLAUDE.local.md                   ✅ 個人本地偏好（已加入 .gitignore）
├── .mcp.json                         ✅ 已新增 context7 MCP
└── .claude/
    ├── CLAUDE.md                     ✅ 專案詳細記憶
    ├── .env.example
    ├── .mcp.json
    ├── MCP_ENV_SETUP.md
    ├── QUICK_START.md
    ├── settings.json
    ├── settings.local.json
    ├── skills/                       （既有）
    │   └── document-parser/
    └── rules/                        ✅ 新增
        ├── general.md                ✅ 通用開發規則
        ├── frontend/
        │   └── react-expo.md         ✅ 前端路徑觸發規則
        └── backend/
            └── supabase.md           ✅ 後端路徑觸發規則
```

### 設定完成清單

| 項目         | 狀態      | 說明                                       |
| :----------- | :-------- | :----------------------------------------- |
| Context7 MCP | ✅ 已安裝 | `.mcp.json` 中新增 `@upstash/context7-mcp` |
| 專案主入口   | ✅ 已創建 | `./CLAUDE.md`                              |
| 專案詳細記憶 | ✅ 已創建 | `./.claude/CLAUDE.md`                      |
| 通用規則     | ✅ 已創建 | `./.claude/rules/general.md`               |
| 前端規則     | ✅ 已創建 | `./.claude/rules/frontend/react-expo.md`   |
| 後端規則     | ✅ 已創建 | `./.claude/rules/backend/supabase.md`      |
| 個人本地偏好 | ✅ 已創建 | `./CLAUDE.local.md`（已加入 .gitignore）   |

---

## 四、Context7 MCP 整合說明

### 4.1 為什麼整合 Context7？

| 問題                | 傳統做法                             | Context7 解決方案               |
| :------------------ | :----------------------------------- | :------------------------------ |
| **過時的 API 範例** | 依賴 LLM 訓練數據（可能是 1-2 年前） | 即時查詢最新官方文檔            |
| **幻覺 API**        | Claude 可能生成不存在的 API          | 從真實文檔提取程式碼範例        |
| **版本不匹配**      | 難以指定特定版本的用法               | 支援版本指定（如 `Next.js 14`） |
| **維護成本高**      | Rules 檔案需手動更新技術標準         | 技術標準由 Context7 即時提供    |

### 4.2 整合策略

**核心原則**：

- **專案特定規則** → 寫在 Memory 檔案中（命名規範、Git 流程、專案架構）
- **技術標準與 Best Practices** → 由 Context7 MCP 即時查詢

### 4.3 本專案常用的 Context7 Library IDs

| 技術       | Context7 Library ID     | 用途                        |
| :--------- | :---------------------- | :-------------------------- |
| React      | `/facebook/react`       | React 19 hooks、組件模式    |
| Expo       | `/expo/expo`            | Expo 54 SDK、導航、原生模組 |
| Supabase   | `/supabase/supabase`    | 認證、資料庫、Storage API   |
| TypeScript | `/microsoft/typescript` | 型別系統、嚴格模式設定      |
| PostgreSQL | `/postgres/postgres`    | SQL 語法、RLS 政策          |

### 4.4 MCP 設定位置

Context7 已安裝於 `/.mcp.json`：

```json
"context7": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp"]
}
```

---

## 五、檔案架構

### 已創建的 Memory 檔案

| #   | 檔案路徑                                 | 用途                               | Context7 整合         |
| :-- | :--------------------------------------- | :--------------------------------- | :-------------------- |
| 1   | `./CLAUDE.md`                            | 專案主入口 + Context7 自動查詢規則 | ✅ 包含 Context7 規則 |
| 2   | `./.claude/CLAUDE.md`                    | 專案詳細記憶（架構、常用指令）     | ✅ 引用 Context7      |
| 3   | `./.claude/rules/general.md`             | 專案命名規範、Git 工作流           | ❌ 專案特定           |
| 4   | `./.claude/rules/frontend/react-expo.md` | 前端路徑觸發規則                   | ✅ 引導使用 Context7  |
| 5   | `./.claude/rules/backend/supabase.md`    | 後端路徑觸發規則                   | ✅ 引導使用 Context7  |
| 6   | `./CLAUDE.local.md`                      | 個人本地偏好（範本）               | ❌ 個人設定           |

### 路徑觸發規則說明

| 規則檔案                 | 觸發路徑                                                     |
| :----------------------- | :----------------------------------------------------------- |
| `frontend/react-expo.md` | `frontend/**/*.{ts,tsx,js,jsx}`                              |
| `backend/supabase.md`    | `supabase/**/*.sql`, `backend/**/*.ts`, `**/lib/supabase.ts` |

---

## 六、各檔案內容說明

### 1. `./CLAUDE.md` — 專案主入口

**內容摘要**：

- 專案名稱與簡介
- 引用 README.md、START_HERE.md 等關鍵文件
- **Context7 技術文檔規則表格**
- 快速指令參考
- 重要路徑對照

---

### 2. `./.claude/CLAUDE.md` — 專案詳細記憶

**內容摘要**：

- 完整技術棧說明（React 19、Expo 54、Supabase、PostgreSQL 17）
- 目錄結構說明
- 本地開發環境 URL
- 常用指令（Supabase、前端、Git）
- 資料庫架構（核心表、RLS 政策）
- API 函數說明
- 開發流程（分支策略、Commit 規範）

---

### 3. `./.claude/rules/general.md` — 通用開發規則

**內容摘要**：

- 程式碼檔案命名規範（PascalCase、camelCase、kebab-case）
- 資料夾命名規範
- 文檔與資源命名規範
- Git Commit 訊息格式與類型
- 程式碼風格（縮排、引號、TypeScript）
- 語言偏好設定
- 檔案組織原則

---

### 4. `./.claude/rules/frontend/react-expo.md` — 前端規則

**觸發條件**：編輯 `frontend/**/*.{ts,tsx,js,jsx}` 時自動載入

**內容摘要**：

- 技術棧版本說明
- 專案結構
- 組件開發規範與範例
- Hooks 開發規範與範例
- 狀態管理優先順序
- 樣式系統使用
- **Context7 查詢指引**

---

### 5. `./.claude/rules/backend/supabase.md` — 後端規則

**觸發條件**：編輯 `supabase/**/*.sql`、`backend/**/*.ts` 時自動載入

**內容摘要**：

- 本地開發環境 URL
- 資料庫命名規範
- Migration 檔案格式
- RLS 政策範例
- 核心表結構說明
- Supabase SDK 使用範例
- 常用指令
- **Context7 查詢指引**

---

### 6. `./CLAUDE.local.md` — 個人本地偏好

**注意**：此檔案已加入 `.gitignore`，不會提交至 Git

**內容摘要**（範本）：

- 本地環境 URL
- 個人偏好設定
- 測試資料 ID
- 個人快捷指令

---

## 七、使用指南

### 7.1 Context7 使用方式

#### 方式一：自動查詢

在 prompt 中加入 `use context7`：

```
幫我建立一個 React 組件顯示物件列表 use context7
```

#### 方式二：指定 Library

```
Supabase Storage 上傳檔案 API use library /supabase/supabase
```

#### 方式三：指定版本

```
React 19 use hook 用法 use library /facebook/react
```

### 7.2 查看已載入的 Memory

在 Claude Code 中執行 `/memory` 指令，可查看當前載入的所有 Memory 檔案。

### 7.3 編輯 Memory 檔案

在 Claude Code 中執行 `/memory` 指令，可直接在系統編輯器中開啟 Memory 檔案進行編輯。

---

## 八、維護與更新

### 8.1 何時需要更新 Memory 檔案

| 情境           | 需更新的檔案                             |
| :------------- | :--------------------------------------- |
| 專案架構變更   | `.claude/CLAUDE.md`                      |
| 新增技術棧     | `CLAUDE.md`（Context7 表格）、對應 rules |
| 命名規範調整   | `.claude/rules/general.md`               |
| 新增前端模式   | `.claude/rules/frontend/react-expo.md`   |
| 資料庫結構變更 | `.claude/rules/backend/supabase.md`      |
| 個人偏好調整   | `CLAUDE.local.md`                        |

### 8.2 新增 Rules 檔案

如需新增規則檔案（如 `testing.md`、`security.md`），請在 `.claude/rules/` 下創建：

```
.claude/rules/
├── general.md
├── testing.md          # 新增
├── security.md         # 新增
├── frontend/
└── backend/
```

### 8.3 路徑觸發規則格式

```yaml
---
paths:
  - 'path/pattern/**/*.{ext1,ext2}'
---
# 規則內容...
```

---

## 📎 附錄：參考資料

- [Claude Code Memory 官方文檔](https://code.claude.com/docs/en/memory)
- [Context7 MCP GitHub](https://github.com/upstash/context7)
- [本專案命名規則](../本專案檔案命名規則與新增文件歸檔總則.md)
- [軟體功能分階段開發計劃](./專案架構說明/軟體功能分階段開發計劃.md)

---

## 📝 變更記錄

| 日期       | 版本 | 說明                                       |
| :--------- | :--- | :----------------------------------------- |
| 2026-01-15 | v1.0 | 初版，完成 Memory 系統與 Context7 MCP 設定 |
