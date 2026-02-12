---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'apps/superadmin/**/*.{ts,tsx}'
  - 'apps/mobile/**/*.{ts,tsx}'
  - 'packages/**/*.{ts,tsx}'
---

# 前端開發規則

---

## 應用概覽

| App | 框架 | 用途 | Port | 狀態 |
|:----|:-----|:-----|:-----|:-----|
| `apps/web` | Next.js 15 (App Router) | Web App + PWA (房東/租客/買家) | 3000 | 主要開發 |
| `apps/superadmin` | Next.js 15 | 超級管理員後台 | 3001 | 開發中 |
| `apps/mobile` | Expo 54 | Mobile App | 8081 | 已暫停 |

**技術棧**：React 19 + TypeScript 5.x + Tailwind CSS + Supabase JS SDK

---

## Next.js 開發要點

### Server vs Client Components

- **預設 Server Component**（無需標註）
- 僅在需要互動 (onClick, useState, useEffect) 時加 `'use client'`
- 將 Client Component 推向組件樹末端

### 路由結構

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
3. React Context — 全域狀態 (Auth, Theme)
4. Zustand — 複雜跨組件狀態

### 環境變數

- Web: `NEXT_PUBLIC_` 前綴
- Mobile: `EXPO_PUBLIC_` 前綴

---

## 樣式系統

### Web — Tailwind CSS

- 使用 Tailwind utilities，避免 inline style
- 響應式：`md:` / `lg:` / `xl:`
- 暗黑模式：`dark:`
- 複用樣式用 `@apply`

### Mobile — NativeWind + StyleSheet

- 簡單樣式用 NativeWind (`className`)
- 複雜/效能關鍵場景用 `StyleSheet.create()`
- 使用 `<View>` / `<Text>` 而非 HTML 標籤
- 大列表用 `FlatList` 而非 `map()`

---

## 效能優化

| 平台 | 項目 | 方法 |
|:-----|:-----|:-----|
| Web | 代碼分割 | `next/dynamic` |
| Web | 圖片 | `<Image>` 組件 |
| Web | 字體 | `next/font` |
| Mobile | 列表 | `FlatList` + `removeClippedSubviews` |
| Mobile | 圖片 | `expo-image` |
| 通用 | Memoization | `React.memo` / `useMemo` / `useCallback` (按需) |

---

## 認證策略

### Web

- Supabase Auth + Cookie/LocalStorage
- Middleware 保護路由 + RLS

### Mobile (開發環境)

- `EXPO_PUBLIC_SKIP_AUTH=true` → Mock User 自動進入 Dashboard
- 生產環境 → Supabase Auth + AsyncStorage + Navigation Guards
