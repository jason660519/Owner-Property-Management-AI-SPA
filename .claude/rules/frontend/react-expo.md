---
paths:
  - 'frontend/**/*.{ts,tsx}'
  - 'frontend/**/*.{js,jsx}'
---

# React/Expo 前端開發規則

> 此規則僅在編輯 `frontend/` 目錄下的檔案時自動載入

---

## 技術棧

| 技術                  | 版本   | 用途       |
| :-------------------- | :----- | :--------- |
| React                 | 19     | UI 框架    |
| Expo                  | 54     | 跨平台開發 |
| TypeScript            | 5.x    | 型別安全   |
| @supabase/supabase-js | latest | 後端 SDK   |

---

## 專案結構

```
frontend/
├── src/
│   ├── components/     # 可重用 UI 組件
│   ├── hooks/          # 自訂 React Hooks
│   ├── lib/            # 工具函數、SDK 初始化
│   ├── pages/          # 路由頁面
│   ├── store/          # 狀態管理（如有）
│   └── types/          # TypeScript 型別定義
└── assets/             # 靜態資源（圖片、字體）
```

---

## 組件開發

### 命名規範

- 組件檔案：`PascalCase.tsx`（如 `UserProfile.tsx`）
- 每個組件一個檔案
- 匯出名稱與檔案名一致

### 組件結構範例

```tsx
// UserProfile.tsx
import { View, Text } from 'react-native';

interface UserProfileProps {
  userId: string;
  showAvatar?: boolean;
}

export function UserProfile({ userId, showAvatar = true }: UserProfileProps) {
  // hooks 放最上面
  // 事件處理函數
  // render
  return (
    <View>
      <Text>User: {userId}</Text>
    </View>
  );
}
```

### 組件原則

- ✅ 使用函數組件 + Hooks
- ✅ Props 使用 TypeScript interface 定義
- ✅ 預設值使用解構賦值
- ❌ 避免使用 class 組件
- ❌ 避免在組件內定義大型物件或陣列

---

## Hooks 開發

### 命名規範

- 檔案名：`useXxx.ts`（如 `useAuth.ts`）
- 函數名以 `use` 開頭

### 自訂 Hook 範例

```tsx
// useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 訂閱認證狀態變化
  }, []);

  return { user, loading };
}
```

---

## 狀態管理

### 優先順序

1. **React useState** - 組件內部狀態
2. **React Context** - 跨組件共享狀態
3. **Zustand** - 複雜全域狀態（如需要）

### Context 使用原則

- 認證狀態 → `AuthContext`
- 主題設定 → `ThemeContext`
- 避免將頻繁變動的資料放入 Context

---

## 樣式

### Expo 樣式系統

```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
```

### 樣式原則

- 使用 `StyleSheet.create()` 優化效能
- 避免行內樣式（除非動態計算）
- 顏色、間距使用統一變數

---

## Context7 查詢指引

當需要 React/Expo 相關文檔時，使用以下 Context7 指令：

| 需求             | 指令                                             |
| :--------------- | :----------------------------------------------- |
| React Hooks 用法 | `use library /facebook/react`                    |
| Expo SDK API     | `use library /expo/expo`                         |
| TypeScript 型別  | `use library /microsoft/typescript`              |
| React Navigation | `use library /react-navigation/react-navigation` |

### 常見查詢範例

```
# 查詢 React 19 的新功能
React 19 use hook use library /facebook/react

# 查詢 Expo 相機 API
Expo Camera API use library /expo/expo

# 查詢 React Navigation 設定
React Navigation stack navigator use context7
```

⚠️ **重要提醒**：避免依賴過時的 React/Expo 範例，務必使用 Context7 查詢最新 API！
