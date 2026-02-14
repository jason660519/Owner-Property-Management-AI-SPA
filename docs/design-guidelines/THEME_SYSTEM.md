# 主題系統使用指南 (Theme System Documentation)

本專案已實作**統一的主題切換系統**，Web（localhost:3000）與 Superadmin（localhost:3001）**僅支援明亮 (Light) 與暗黑 (Dark)** 兩種模式。系統基於 `next-themes` 與 CSS Variables，並整合 Tailwind CSS。

## 1. 架構概覽

- **狀態管理**: `next-themes` 的 `ThemeProvider`，`theme`: `'light' | 'dark' | 'system'`。
- **樣式定義**: `globals.css` 的 `@layer base` 內以 CSS Variables 定義語意化色彩。
- **Tailwind**: `tailwind.config.ts` 將變數映射為 `bg-bg-primary`、`text-text-primary` 等 utility classes。

## 2. 主題定義 (`globals.css`)

- **`:root`**: 基礎色盤 (Primitives) + **Light 模式**語意變數。
- **`.dark`**: **Dark 模式**語意變數覆寫。

```css
:root {
  --color-bg-primary: var(--color-white);
  --color-text-primary: var(--color-grey-900);
  /* ... */
}

.dark {
  --color-bg-primary: var(--color-grey-08);
  --color-text-primary: var(--color-white);
  /* ... */
}
```

## 3. ThemeProvider 設定（兩應用一致）

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
  themes={['light', 'dark']}
>
  {children}
</ThemeProvider>
```

- **defaultTheme="system"**: 首次進入跟隨作業系統明暗偏好。
- **enableSystem**: 允許「跟隨系統」行為。
- **themes={['light', 'dark']}**: 僅提供明暗切換，不包含其他主題。

## 4. 如何使用

### 4.1 在 Tailwind 中使用

```tsx
<div className="bg-bg-primary text-text-primary border border-border-default">
  <h1 className="text-accent">標題</h1>
  <p className="text-text-secondary">次要文字</p>
</div>
```

### 4.2 在 CSS Modules 中使用

```css
.myComponent {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
}
```

### 4.3 切換主題 — ThemeToggle 組件

兩應用皆使用共用的 `<ThemeToggle />`（太陽 / 月亮按鈕）：

- **Web**: 導航列右側（桌面版）+ 行動版選單內。
- **Superadmin**: 頂部導航列右側（桌面與行動版皆可見）。

程式內切換範例：

```tsx
import { useTheme } from "next-themes"

export function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme('dark')}>切換到暗色</button>
  )
}
```

## 5. 防止切換閃爍 (FOUC)

- `<html lang="zh-TW" suppressHydrationWarning>` 必須設定。
- `globals.css` 中對 `html, body` 及主要容器使用 `background-color: var(--color-bg-primary)`，避免切換時白屏。

## 6. 故障排除

- **樣式未隨主題變化**: 檢查是否使用硬編碼顏色（如 `bg-white`、`#ffffff`），應改為語意化 class（`bg-bg-primary`）。
- **切換時閃爍**: 確認 `html` 有 `suppressHydrationWarning`，且 body/容器背景使用 CSS 變數。
- **ThemeToggle 在行動版看不到**: Web 站在行動版需在漢堡選單內額外放置一組 ThemeToggle。

---

> **最後修改**: 2026-02-14 | **關聯**: [UNIFIED_DESIGN_STANDARD.md](./UNIFIED_DESIGN_STANDARD.md)、[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
