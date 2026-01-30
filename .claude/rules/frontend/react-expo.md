---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'apps/mobile/**/*.{ts,tsx}'
  - 'packages/**/*.{ts,tsx}'
---

# React/Next.js/Expo 前端開發規則

> 此規則適用於 `apps/web`, `apps/mobile` 及 `packages/` 下的前端開發

---

## 技術棧

| 技術 | 版本 | 用途 |
| :--- | :--- | :--- |
| **React** | 19 | UI 核心框架 |
| **Next.js** | 15 (App Router) | Web 端框架 (`apps/web`) |
| **Expo** | 54 | Mobile 端框架 (`apps/mobile`) |
| **TypeScript** | 5.x | 型別安全 |
| **Tailwind CSS** | 3.4+ | Web 端樣式 |
| **Supabase JS** | 2.x | 後端 SDK |

---

## 專案結構 (Monorepo)

```
apps/
├── web/                # Next.js 15 Application
│   ├── app/            # App Router 頁面與佈局
│   ├── components/     # Web 專用組件
│   └── lib/            # Web 工具函數
└── mobile/             # Expo Application
    ├── src/
    │   ├── components/ # Mobile 專用組件
    │   └── lib/        # Mobile 工具函數
    ├── app.json        # Expo 配置
    └── App.tsx         # 入口文件
```

---

## 組件開發

### 命名規範

- 組件檔案：`PascalCase.tsx`（如 `UserProfile.tsx`）
- 每個組件一個檔案
- 匯出名稱與檔案名一致

### Server vs Client Components (Next.js)

- **預設使用 Server Components** (無需標註)
- 僅在需要互動 (onClick, useState, useEffect) 時使用 `'use client'`
- 盡量將 Client Component 推向組件樹的末端

```tsx
// ❌ 避免：整個頁面都是 Client Component
'use client'
export default function Page() { ... }

// ✅ 推薦：僅互動部分為 Client Component
import { InteractiveButton } from './InteractiveButton'; // 'use client' inside
export default function Page() {
  return (
    <div>
      <h1>Static Content</h1>
      <InteractiveButton />
    </div>
  );
}
```

### Expo 組件原則

- ✅ 使用 `StyleSheet` 或 `NativeWind` (Tailwind for RN)
- ✅ 避免使用 HTML 標籤 (`div`, `span`)，必須使用 `<View>`, `<Text>`
- ✅ 圖片使用 `expo-image` 優化效能

---

## Hooks 開發

### 命名規範

- 檔案名：`useXxx.ts`（如 `useAuth.ts`）
- 函數名以 `use` 開頭

### 自訂 Hook 範例

```tsx
// apps/mobile/src/lib/useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user };
}
```

---

## 狀態管理

### 優先順序

1. **React useState** - 組件內部狀態
2. **URL Search Params** - 篩選、分頁狀態 (Web 優先)
3. **React Context** - 全域共享狀態 (如 Theme, Auth)
4. **Zustand** - 複雜跨組件狀態

---

## 樣式系統

### Web (Next.js)
使用 **Tailwind CSS**：
```tsx
<div className="flex flex-col p-4 bg-gray-100 rounded-lg">
  <h1 className="text-2xl font-bold text-blue-600">Title</h1>
</div>
```

### Mobile (Expo)
使用 **StyleSheet** (標準) 或 NativeWind (若已設定)：
```tsx
import { StyleSheet, View, Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
});
```

---

## Context7 查詢指引

當需要相關文檔時，使用以下指令：

| 需求 | 指令 |
| :--- | :--- |
| Next.js App Router | `use library /vercel/next.js` |
| Expo SDK API | `use library /expo/expo` |
| React Hooks | `use library /facebook/react` |
| Tailwind CSS | `use library /tailwindlabs/tailwindcss` |

### 常見查詢範例

```
# 查詢 Next.js Server Actions
Next.js Server Actions usage use library /vercel/next.js

# 查詢 Expo Camera 用法
Expo Camera usage use library /expo/expo
```
