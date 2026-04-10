---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'apps/web-au/**/*.{ts,tsx}'
  - 'apps/superadmin/**/*.{ts,tsx}'
  - 'packages/**/*.{ts,tsx}'
---

# 前端開發規則（Next.js / React）

---

## 應用概覽

| App               | 框架                         | 用途                           | Port | 狀態     |
| :---------------- | :--------------------------- | :----------------------------- | :--- | :------- |
| `apps/web`        | Next.js 16（App Router）     | Web App + PWA（房東/租客/買家等） | 3000 | 主要開發 |
| `apps/web-au`     | Next.js 16（App Router）     | 澳洲區站                       | 3002 | 開發中   |
| `apps/superadmin` | Next.js 16（App Router）     | 超級管理員後台                 | 3001 | 開發中   |
| `apps/mobile`     | Expo / React Native          | 行動 App                       | —    | 開發中   |

**技術棧**：React 19 + TypeScript 5.x + Tailwind CSS + Supabase JS SDK；主站 / web-au 另含 **TanStack Query**、**TanStack Table**（表格多處使用）。

---

## Next.js 開發要點

### Server vs Client Components

- **預設 Server Component**（無需標註）
- 僅在需要互動（onClick, useState, useEffect）時加 `'use client'`
- 將 Client Component 推向組件樹末端
- 純工具函數（無 `'use server'`）必須放在**獨立檔案**，才能被 Client Component import
- Server Action（`'use server'`）不能在 Client Component 中 import 做非 action 用途
- Pattern：`actions.ts`（server only）+ `utils.ts`（pure functions，可任意 import）

### 路由結構（`apps/web` 示例）

實際目錄會隨功能增減；目前常見頂層包含：

```
apps/web/app/
├── layout.tsx, page.tsx
├── (auth)/                 # 登入、註冊、重設密碼等
├── (dashboard)/            # 依角色區分的後台（landlord / tenant / buyer / agent …）
├── portal/                 # 入口與角色導向
├── properties/, blog/, about/, contact/, pricing/, services/
├── onboarding/
├── auth/                   # callback、confirm 等 route handlers
└── api/                    # Route Handlers
```

- Layout Groups `(name)` 不影響 URL
- 動態路由 `[param]`，可選 `[[...slug]]`

### 組件結構（`apps/web`）

```
apps/web/components/
├── common/
├── ui/
└── （依功能分組的目錄）
```

Superadmin 大型表格請優先使用專案的 `EnhancedTable` 等既有模式；建立或遷移表格時可參考 repo 內 **create-tanstack-table** skill（`.claude/skills/create-tanstack-table/`）。

### 狀態與資料抓取優先順序

1. `useState` — 組件內部狀態
2. URL Search Params — 篩選、分頁
3. **TanStack Query** — 主站 / web-au 的伺服器狀態、快取、重新驗證
4. React Context — 全域狀態（Auth、Theme 等）

> 本 monorepo **未**在 workspace 層統一依賴 Zustand；若需跨組件複雜狀態，先用 Context 或 Query，避免再引新全域 store，除非有明確需求。

### 環境變數

- Next（web / web-au / superadmin）：`NEXT_PUBLIC_` 前綴＝可在瀏覽器讀取；無前綴＝僅伺服器端

---

## 樣式系統（Tailwind CSS）

- 使用 Tailwind utilities，避免 inline style
- 響應式：`md:` / `lg:` / `xl:`
- 暗黑模式：`dark:`
- 專案色彩與語意：**優先使用設計 token 類名**（如 `text-text-primary`、`bg-bg-secondary`、`border-border-default`、`text-accent`），避免裸用 `gray-500` 等 palette 名

> 完整設計規格：
> - [DESIGN_SYSTEM.md](../../../docs/design-guidelines/DESIGN_SYSTEM.md)
> - [UNIFIED_DESIGN_STANDARD.md](../../../docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md)

---

## Badge 組件 Variants

有效值：`'default' | 'success' | 'warning' | 'error' | 'info'`

> ⚠️ `'danger'` **不存在**，請用 `'error'`

---

## Sidebar 導覽（superadmin）

- 檔案：`apps/superadmin/components/layout/Sidebar.tsx`
- 新增頁面時，在 `navItems` 陣列加入對應圖示（lucide-react）與路徑

---

## 效能優化

| 項目     | 方法                                              |
| :------- | :------------------------------------------------ |
| 代碼分割 | `next/dynamic`                                    |
| 圖片     | `<Image>` 組件                                    |
| 字體     | `next/font`                                       |
| Memo     | `React.memo` / `useMemo` / `useCallback`（按需） |
