# 主題系統使用指南 (Theme System Documentation)

本專案已實作完整的主題切換系統，支援明亮 (Light)、暗黑 (Dark) 以及第三種主題 "午夜 (Midnight)"。系統基於 `next-themes` 和 CSS Variables 構建，並整合 Tailwind CSS。

## 1. 架構概覽

- **狀態管理**: 使用 `next-themes` 的 `ThemeProvider` 管理主題狀態 (`theme`: 'light' | 'dark' | 'midnight' | 'system')。
- **樣式定義**: 在 `globals.css` 中使用 CSS Variables 定義語意化色彩 (Semantic Colors)。
- **工具整合**: `tailwind.config.ts` 將 CSS Variables 映射為 Tailwind Utility Classes (如 `bg-bg-primary`)。

## 2. 主題定義 (`globals.css`)

所有色彩變數皆定義於 `globals.css` 中：

- **`:root`**: 定義基礎色盤 (Primitives) 與 **預設主題 (Light Mode)** 的語意化變數。
- **`.dark`**: 定義 **暗黑主題 (Dark Mode)** 的語意化變數覆寫。
- **`.midnight`**: 定義 **午夜主題 (Midnight Mode)** 的語意化變數覆寫。

### 關鍵變數範例

```css
:root {
  /* 基礎色盤 */
  --color-grey-900: #111827;
  --color-white: #FFFFFF;
  
  /* 語意化變數 (Light Mode) */
  --color-bg-primary: var(--color-white);
  --color-text-primary: var(--color-grey-900);
}

.dark {
  /* Dark Mode 覆寫 */
  --color-bg-primary: var(--color-grey-08);
  --color-text-primary: var(--color-white);
}

.midnight {
  /* Midnight Mode 覆寫 */
  --color-bg-primary: #0B1121;
  --color-text-primary: #F1F5F9;
}
```

## 3. 如何使用

### 3.1 在 Tailwind 中使用

直接使用 `tailwind.config.ts` 中配置的語意化 Class：

```tsx
// 背景色會根據當前主題自動切換
<div className="bg-bg-primary text-text-primary border-border-default border">
  <h1 className="text-accent">標題</h1>
  <p className="text-text-secondary">次要文字</p>
</div>
```

### 3.2 在 CSS Modules 中使用

直接引用 CSS Variables：

```css
.myComponent {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
}
```

### 3.3 切換主題

使用 `useTheme` hook 或 `<ThemeToggle />` 組件：

```tsx
import { useTheme } from "next-themes"

export function MyComponent() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme('midnight')}>
      切換到午夜模式
    </button>
  )
}
```

## 4. 擴展新主題

若要新增第四種主題 (例如 "Forest")：

1.  **修改 `globals.css`**:
    在 `@layer base` 內新增 `.forest` 類別，並定義相應變數：

    ```css
    .forest {
      --color-bg-primary: #052e16;
      --color-text-primary: #ecfccb;
      /* ... 其他必要變數 */
    }
    ```

2.  **更新 `ThemeProvider`**:
    在 `app/providers.tsx` (Web) 或 `app/layout.tsx` (Superadmin) 中，將新主題名稱加入 `themes` 陣列：

    ```tsx
    <ThemeProvider themes={['light', 'dark', 'midnight', 'forest']} ...>
    ```

3.  **更新 `ThemeToggle`**:
    在 `components/theme-toggle.tsx` 中加入切換按鈕。

## 5. 故障排除

- **樣式未生效**: 檢查是否使用了硬編碼的顏色 (如 `bg-white` 或 `#ffffff`) 而非語意化 Class (`bg-bg-primary`)。
- **切換閃爍**: 確保 `ThemeProvider` 設置了 `suppressHydrationWarning` 於 `html` 標籤 (Next.js 要求)。
