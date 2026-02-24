---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'apps/superadmin/**/*.{ts,tsx}'
  - 'packages/**/*.{ts,tsx}'
---

# 前端開發規則（Next.js / React）

---

## 應用概覽

| App               | 框架                    | 用途                           | Port | 狀態     |
| :---------------- | :---------------------- | :----------------------------- | :--- | :------- |
| `apps/web`        | Next.js 15 (App Router) | Web App + PWA (房東/租客/買家) | 3000 | 主要開發 |
| `apps/superadmin` | Next.js 15              | 超級管理員後台                 | 3001 | 開發中   |

**技術棧**：React 19 + TypeScript 5.x + Tailwind CSS + Supabase JS SDK

---

## Next.js 開發要點

### Server vs Client Components

- **預設 Server Component**（無需標註）
- 僅在需要互動（onClick, useState, useEffect）時加 `'use client'`
- 將 Client Component 推向組件樹末端
- 純工具函數（無 'use server'）必須放在**獨立檔案**，才能被 Client Component import
- Server Action（'use server'）不能在 Client Component 中 import 做非 action 用途
- Pattern：`actions.ts`（server only）+ `utils.ts`（pure functions，可任意 import）

### 路由結構（apps/web）

```
apps/web/app/
├── layout.tsx              # Root Layout
├── page.tsx                # 首頁
├── (marketing)/            # 行銷頁面 (Layout Group)
├── (auth)/                 # 認證頁面
└── (dashboard)/            # 管理後台
```

- Layout Groups `(name)` 不影響 URL
- 動態路由 `[param]`，可選 `[[...slug]]`

### 組件結構

```
apps/web/components/
├── common/                 # 通用組件
├── ui/                     # UI 原子組件
└── (功能分組)/              # 按功能分組
```

### 狀態管理優先順序

1. `useState` — 組件內部狀態
2. URL Search Params — 篩選、分頁
3. React Context — 全域狀態（Auth, Theme）
4. Zustand — 複雜跨組件狀態

### 環境變數

- Web / Superadmin：`NEXT_PUBLIC_` 前綴（公開）；無前綴（僅伺服器端）

---

## 樣式系統（Tailwind CSS）

- 使用 Tailwind utilities，避免 inline style
- 響應式：`md:` / `lg:` / `xl:`
- 暗黑模式：`dark:`
- 複用樣式用 `@apply`

> 完整設計規格（色彩變數、字型、間距、元件樣式）：
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
