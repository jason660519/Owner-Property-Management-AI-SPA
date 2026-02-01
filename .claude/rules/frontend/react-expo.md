---
paths:
  - 'apps/web/**/*.{ts,tsx}'
  - 'apps/mobile/**/*.{ts,tsx}'
  - 'packages/**/*.{ts,tsx}'
---

# React/Next.js/Expo 前端開發規則

> 此規則適用於 `apps/web`, `apps/mobile` 及 `packages/` 下的前端開發

---

## 應用架構概述

### apps/web：公司官網與行銷頁面

| 屬性 | 說明 |
| :--- | :--- |
| **框架** | Next.js 15 (App Router) |
| **用途** | 公司官網、行銷頁面、公開資訊展示 |
| **用戶群** | 公眾用戶、潛在客戶 |
| **URL** | http://localhost:3000 |
| **認證** | 可選（營銷頁面無認證，內部頁面可能需要） |
| **責任** | SEO 優化、品牌展示、轉換導向 |
| **主要技術** | React 19 + Next.js 15 + Tailwind CSS + Supabase JS SDK |

**典型頁面**：
- 首頁、產品介紹、定價、部落格、聯絡表單
- 可能包含登入/註冊（若有需要）

### apps/mobile：房東 Super Admin Dashboard

| 屬性 | 說明 |
| :--- | :--- |
| **框架** | Expo 54 (React Native + Expo Router) |
| **用途** | 房東管理系統、Super Admin Dashboard |
| **用戶群** | 房東、系統管理員 |
| **執行環境** | iOS、Android、Web (Expo Web) |
| **認證** | 🔴 強制認證（私密應用） |
| **責任** | 物件管理、租戶管理、財務報表、系統設定 |
| **主要技術** | React 19 + Expo 54 + React Native + Supabase JS SDK |

**典型功能**：
- 物件清單、詳細資訊、上傳照片
- 租戶管理、合約管理、收款追蹤
- 財務報表、統計分析
- 系統設定、使用者管理

---

## 技術棧

| 技術 | 版本 | 用途 | 適用應用 |
| :--- | :--- | :--- | :--- |
| **React** | 19 | UI 核心框架 | Web、Mobile |
| **Next.js** | 15 (App Router) | Web 端框架 | apps/web |
| **Expo** | 54 | Mobile 端框架 | apps/mobile |
| **Expo Router** | 最新 | Native 路由系統 | apps/mobile |
| **TypeScript** | 5.x | 型別安全 | 所有應用 |
| **Tailwind CSS** | 3.4+ | Web 端樣式系統 | apps/web |
| **React Native Stylesheet** | - | Mobile 原生樣式 | apps/mobile (標準方式) |
| **NativeWind** | 4.x | Mobile 的 Tailwind 工具類 | apps/mobile (已使用) |
| **Supabase JS** | 2.x | 後端資料庫 SDK | Web、Mobile |
| **AsyncStorage** | React Native | 本地數據存儲 | apps/mobile |

---

## 專案結構 (Monorepo)

```
apps/
├── web/                          # Next.js 15 - 公司官網與行銷頁面
│   ├── app/                      # App Router 頁面與佈局
│   │   ├── page.tsx              # 首頁
│   │   ├── (marketing)/          # 行銷相關頁面
│   │   └── (auth)/               # 認證頁面 (若有)
│   ├── components/               # Web 專用組件
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── ...
│   ├── lib/                      # Web 工具函數
│   │   ├── supabase/
│   │   │   ├── client.ts         # Supabase 客戶端 (Browser)
│   │   │   └── server.ts         # Supabase 伺服器 (Server Actions)
│   │   └── ...
│   └── public/                   # 靜態資源
│
└── mobile/                       # Expo 54 - 房東 Super Admin Dashboard
    ├── src/
    │   ├── app/                  # Expo Router 路由 (App Router 風格)
    │   │   ├── _layout.tsx       # Root Layout
    │   │   ├── (auth)/           # 認證相關頁面
    │   │   │   ├── login.tsx
    │   │   │   └── signup.tsx
    │   │   ├── (dashboard)/      # 認證後的主應用 (Layout Group)
    │   │   │   ├── _layout.tsx
    │   │   │   ├── index.tsx     # Dashboard 首頁
    │   │   │   ├── properties/   # 物件管理
    │   │   │   ├── tenants/      # 租戶管理
    │   │   │   ├── finances/     # 財務報表
    │   │   │   └── settings/     # 系統設定
    │   │   └── +not-found.tsx
    │   ├── components/
    │   │   ├── (dashboard)/      # Dashboard 相關組件
    │   │   │   ├── PropertyCard.tsx
    │   │   │   └── TenantList.tsx
    │   │   ├── (auth)/           # 認證相關組件
    │   │   │   └── LoginForm.tsx
    │   │   └── common/           # 通用組件
    │   │       ├── Header.tsx
    │   │       └── Button.tsx
    │   └── lib/
    │       ├── supabase.ts       # Supabase 配置 (AsyncStorage 存儲)
    │       ├── hooks/
    │       │   ├── useAuth.ts    # 認證 hook
    │       │   └── useProperties.ts
    │       └── utils/
    │           └── ...
    ├── app.json                  # Expo 配置
    ├── app/                      # Alternative: App.tsx entry
    └── App.tsx                   # 應用入點 (可選)
```

---

## 開發環境設置

### Web 開發 (Next.js)

```bash
# 啟動 Web 開發伺服器
npm run dev:web

# 訪問
http://localhost:3000
```

**環境變數** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Mobile 開發 (Expo)

```bash
# 啟動 Expo 開發伺服器
npm run dev:mobile

# 訪問
http://localhost:8081
# 或掃描 QR Code 用 Expo Go 在真實設備上執行
```

**環境變數** (`.env` 或 `app.json`):
```
EXPO_PUBLIC_SUPABASE_URL=<supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

⚠️ **注意**：Expo 環境變數使用 `EXPO_PUBLIC_` 前綴

---

## 認證與授權策略

### Web (apps/web)

| 項目 | 說明 |
| :--- | :--- |
| **認證方式** | Supabase Auth (Email/Password, OAuth 等) |
| **Session 存儲** | Cookie (Server Side) 或 LocalStorage (Client Side) |
| **保護機制** | Middleware (Next.js 15) 或 RLS (Row Level Security) |
| **未認證時** | 可存取公開頁面，重定向至登入頁面 |

**範例**：官網首頁無認證，但用戶管理後台需認證

### Mobile (apps/mobile) - 分環境認證策略

#### 🔧 開發環境 (Development)

| 項目 | 說明 |
| :--- | :--- |
| **認證方式** | ✅ **跳過認證**（開發便利） |
| **Session 存儲** | 模擬 Mock User（無需真實 session） |
| **保護機制** | Navigation Guard 無效化 |
| **自動登入** | ✅ 自動以 Mock User 身份進入 Dashboard |
| **初始化** | 直接進入 `(dashboard)` 路由，無需登入頁面 |

**開發環境的優點**：
- ⚡ 快速迭代，無需每次都登入
- 🧪 專注於功能開發，不受認證阻攔
- 📱 可立即看到 Dashboard 效果

#### 🚀 生產環境 (Production)

| 項目 | 說明 |
| :--- | :--- |
| **認證方式** | Supabase Auth (Email/Password) |
| **Session 存儲** | AsyncStorage (React Native 推薦) |
| **保護機制** | Navigation Guards (Expo Router) + RLS |
| **未認證時** | 🔴 禁止進入應用，強制登入 |
| **初始化** | App 啟動時自動檢查 session 有效性 |

**生產環境的安全機制**：
- 🔐 強制認證保護私密資料
- 🛡️ RLS 確保資料隔離
- 📊 完整的審計日誌

#### 環境檢測方式

在 `app.json` 或 `.env` 設定開發模式標記：

```json
// app.json
{
  "expo": {
    "plugins": [],
    "extra": {
      "isDevelopment": true,
      "mockUserId": "dev-super-admin-uuid"
    }
  }
}
```

或使用環境變數：

```bash
# .env (開發)
EXPO_PUBLIC_SKIP_AUTH=true
EXPO_PUBLIC_MOCK_USER_ID=dev-super-admin-uuid

# .env.production (生產)
EXPO_PUBLIC_SKIP_AUTH=false
```

---

## 組件開發

### 命名規範

- 組件檔案：`PascalCase.tsx`（如 `UserProfile.tsx`）
- 每個組件一個檔案
- 匯出名稱與檔案名一致
- 組件應根據功能分組在子目錄中

#### Web 組件路徑結構
```
apps/web/components/
├── (marketing)/          # 行銷頁面組件
│   ├── Hero.tsx
│   └── Testimonials.tsx
├── (dashboard)/          # 後台組件 (若有)
│   └── StatsCard.tsx
├── common/               # 通用組件
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Button.tsx
└── ui/                   # UI 原子組件
    ├── Card.tsx
    └── Modal.tsx
```

#### Mobile 組件路徑結構
```
apps/mobile/src/components/
├── (dashboard)/          # Dashboard 相關組件
│   ├── PropertyCard.tsx
│   ├── TenantList.tsx
│   └── StatsWidget.tsx
├── (auth)/               # 認證相關組件
│   ├── LoginForm.tsx
│   └── PasswordInput.tsx
├── common/               # 通用組件
│   ├── Header.tsx
│   ├── SafeAreaView.tsx
│   └── Button.tsx
└── ui/                   # 原子組件
    ├── Card.tsx
    └── Badge.tsx
```

### Server vs Client Components (Next.js)

- **預設使用 Server Components** (無需標註)
- 僅在需要互動 (onClick, useState, useEffect) 時使用 `'use client'`
- 盡量將 Client Component 推向組件樹的末端
- 認證相關的組件應為 Client Components

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

// ✅ 認證邏輯應為 Client Component
'use client'
export function LoginForm() {
  const [email, setEmail] = useState('');
  // 認證邏輯...
}
```

### Expo 組件原則

- ✅ 使用 `StyleSheet` 或 `NativeWind` (Tailwind for RN)
- ✅ 避免使用 HTML 標籤 (`div`, `span`)，必須使用 `<View>`, `<Text>`
- ✅ 圖片使用 `expo-image` 優化效能
- ✅ 使用 `SafeAreaView` 處理 iPhone 安全區域
- ✅ 使用 `FlatList` 而非 `map()` 渲染大列表（效能考慮）

**Expo 特定範例**：
```tsx
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

export function PropertyCard({ property }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image
          source={{ uri: property.imageUrl }}
          style={styles.image}
          contentFit="cover"
        />
        <Text style={styles.title}>{property.name}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    padding: 12,
  },
});
```

### 開發 vs 生產環境配置

#### .env (開發環境)
```bash
# Supabase 配置
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 認證配置（開發模式 - 跳過認證）
EXPO_PUBLIC_SKIP_AUTH=true
EXPO_PUBLIC_MOCK_USER_ID=dev-super-admin-uuid
```

#### .env.production (生產環境)
```bash
# Supabase 配置（真實生產環境）
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 認證配置（生產模式 - 啟用認證）
EXPO_PUBLIC_SKIP_AUTH=false
```

#### app.json (Expo 設定)
```json
{
  "expo": {
    "name": "Owner Property Management",
    "slug": "owner-property-mgmt",
    "version": "1.0.0",
    "plugins": [],
    "extra": {
      "isDevelopment": true,
      "mockUserId": "dev-super-admin-uuid"
    }
  }
}
```

#### 快速切換命令
```bash
# 開發模式（自動跳過認證，直接進入 Dashboard）
npm run dev:mobile

# 測試生產模式（啟用認證，需要登入）
EXPO_PUBLIC_SKIP_AUTH=false npm run dev:mobile

# 查看當前環境變數
grep EXPO_PUBLIC_SKIP_AUTH .env

# 清除環境並重新安裝依賴
npm run clean:mobile && npm install
```

---

## 路由架構

### Web (Next.js App Router)

```
apps/web/app/
├── layout.tsx                  # Root Layout
├── page.tsx                    # 首頁 (/)
├── (marketing)/
│   ├── layout.tsx
│   ├── about/page.tsx          # /about
│   ├── pricing/page.tsx        # /pricing
│   └── blog/page.tsx           # /blog
└── (auth)/                     # Layout Group (可選)
    ├── login/page.tsx          # /login
    └── signup/page.tsx         # /signup
```

**開發規則**：
- 使用 Layout Groups `(name)` 組織相關頁面（不影響 URL）
- 動態路由用 `[param]`（如 `[id]`）
- 可選動態路由用 `[[...slug]]`

### Mobile (Expo Router)

```
apps/mobile/src/app/
├── _layout.tsx                 # Root Layout + Navigation
├── (auth)/                     # 認證頁面 (Unauthenticated Stack)
│   ├── _layout.tsx
│   ├── login.tsx
│   └── signup.tsx
├── (dashboard)/                # Dashboard (Authenticated Stack)
│   ├── _layout.tsx            # 含 Bottom Tab Navigator
│   ├── index.tsx              # Dashboard 首頁
│   ├── properties/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # 物件列表
│   │   └── [id].tsx           # 物件詳情
│   ├── tenants/
│   │   └── index.tsx
│   ├── finances/
│   │   └── index.tsx
│   └── settings/
│       └── index.tsx
└── +not-found.tsx
```

**開發規則**：
- 使用 Layout Groups 區分認證狀態的頁面
- 認證頁面和 Dashboard 應分開管理
- 使用 Navigation Guards 檢查認證狀態

---

## Hooks 開發

### 命名規範

- 檔案名：`useXxx.ts`（如 `useAuth.ts`）
- 函數名以 `use` 開頭
- 自訂 hook 存放在 `lib/hooks/` 目錄

### 認證 Hook (必須實現)

#### Web (Next.js)
```tsx
// apps/web/lib/hooks/useAuth.ts
'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  return { user, loading };
}
```

#### Mobile (Expo)

```tsx
// apps/mobile/src/lib/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../supabase';

// 開發模式的 Mock User
const MOCK_USER = {
  id: process.env.EXPO_PUBLIC_MOCK_USER_ID || 'dev-super-admin-uuid',
  email: 'admin@dev.local',
  user_metadata: {
    name: 'Development Admin',
    role: 'super_admin',
  },
};

// 檢查是否開發模式
const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // 開發環境：直接使用 Mock User
    if (SKIP_AUTH) {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }

    // 生產環境：從 Supabase 檢查真實 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // 根據認證狀態導航
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // 如果是開發模式，不導航到登入頁面，直接進入 Dashboard
      if (SKIP_AUTH) {
        router.replace('/(dashboard)');
      } else {
        router.replace('/(auth)/login');
      }
    } else if (user && inAuthGroup) {
      router.replace('/(dashboard)');
    }
  }, [user, loading, segments]);

  return { user, loading };
}
```

**使用 Mock User 的好處**：
- 🚀 開發時自動進入 Dashboard，無需登入
- 📝 可模擬不同的用戶角色（透過修改 MOCK_USER）
- 🧪 測試時保留完整的認證流程代碼
- 🔄 切換到生產只需改環境變數

**切換開發/生產模式**：

```bash
# 開發模式（跳過認證）
echo "EXPO_PUBLIC_SKIP_AUTH=true" >> .env

# 生產模式（啟用認證）
echo "EXPO_PUBLIC_SKIP_AUTH=false" >> .env.production
```

### 通用 Hooks 範例

```tsx
// apps/mobile/src/lib/hooks/useProperties.ts
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    try {
      const { data, error: err } = await supabase
        .from('Property_Sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setProperties(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { properties, loading, error, refetch: fetchProperties };
}
```

---

## 狀態管理

### 優先順序

1. **React useState** - 組件內部狀態（表單輸入、UI 狀態）
2. **URL Search Params** - 篩選、分頁狀態 (Web 優先；Mobile 使用 Route Params)
3. **React Context** - 全域共享狀態 (如 Auth, Theme)
4. **Zustand** - 複雜跨組件狀態（若 Context 無法滿足）

### 應用場景

#### Web (Next.js)

| 狀態類型 | 存儲位置 | 例子 |
| :--- | :--- | :--- |
| 表單輸入 | useState | input 值、驗證錯誤 |
| UI 狀態 | useState | modal 開啟/關閉、tab 選擇 |
| 篩選/分頁 | URL Query Params | `/properties?page=2&sort=price` |
| 認證用戶 | Context + Cookie | 當前登入用戶 |
| 主題/語言 | Context | Dark Mode、i18n |

**URL Search Params 範例**：
```tsx
// apps/web/app/(dashboard)/properties/page.tsx
'use client'
import { useSearchParams } from 'next/navigation';

export default function PropertiesPage() {
  const searchParams = useSearchParams();
  const page = searchParams.get('page') || '1';
  const sort = searchParams.get('sort') || 'created_at';

  return (
    <div>
      {/* 保留 URL 狀態利於書籤、分享、返回 */}
    </div>
  );
}
```

#### Mobile (Expo)

| 狀態類型 | 存儲位置 | 例子 |
| :--- | :--- | :--- |
| 表單輸入 | useState | input 值、驗證錯誤 |
| UI 狀態 | useState | modal 開啟/關閉、tab 選擇 |
| 篩選/分頁 | Route Params + useState | `/properties?filter=available` |
| 認證用戶 | Context + AsyncStorage | 當前登入用戶 |
| 主題/語言 | Context + AsyncStorage | Dark Mode、i18n |
| 離線資料 | AsyncStorage | 緩存列表、草稿 |

**Route Params 範例**：
```tsx
// apps/mobile/src/app/(dashboard)/properties/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams();
  const { properties } = useProperties();
  const property = properties?.find(p => p.id === id);

  return (
    <View>
      {/* 使用路由參數傳遞狀態 */}
    </View>
  );
}
```

### Context 使用範例

```tsx
// apps/mobile/src/lib/context/AuthContext.tsx
import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

// 開發模式的 Mock User
const MOCK_USER = {
  id: process.env.EXPO_PUBLIC_MOCK_USER_ID || 'dev-super-admin-uuid',
  email: 'admin@dev.local',
  user_metadata: {
    name: 'Development Admin',
    role: 'super_admin',
  },
};

// 檢查是否跳過認證（開發模式）
const SKIP_AUTH = process.env.EXPO_PUBLIC_SKIP_AUTH === 'true';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isDevelopment: boolean; // 標記是否為開發模式
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 開發環境：使用 Mock User
    if (SKIP_AUTH) {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }

    // 生產環境：從 Supabase 初始化
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    // 開發模式：模擬登入成功
    if (SKIP_AUTH) {
      setUser(MOCK_USER);
      return;
    }

    // 生產模式：真實 Supabase 登入
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    // 開發模式：清除 Mock User
    if (SKIP_AUTH) {
      setUser(null);
      return;
    }

    // 生產模式：真實登出
    await AsyncStorage.removeItem('auth_session');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isDevelopment: SKIP_AUTH
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**在組件中使用 isDevelopment 標記**：

```tsx
'use client'
import { useAuth } from '@/lib/context/AuthContext';

export function DashboardHeader() {
  const { user, isDevelopment } = useAuth();

  return (
    <View>
      <Text>{user?.email}</Text>
      {isDevelopment && (
        <View style={styles.devBadge}>
          <Text style={styles.devText}>🔧 Dev Mode</Text>
        </View>
      )}
    </View>
  );
}
```

---

## 樣式系統

### Web (Next.js) - Tailwind CSS

使用 **Tailwind CSS** 進行原子化樣式：

```tsx
// ✅ 推薦：使用 Tailwind utilities
<div className="flex flex-col gap-4 p-4 bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow">
  <h1 className="text-2xl font-bold text-blue-600">Title</h1>
  <p className="text-gray-700 text-sm">Description</p>
</div>

// ❌ 避免：內聯 style
<div style={{ display: 'flex', padding: '16px', backgroundColor: '#f3f4f6' }}>
```

**Tailwind 最佳實踐**：
- 使用 `@apply` 提取複用的樣式組合
- 使用 CSS 變數管理主題顏色
- 響應式設計用 `md:`, `lg:`, `xl:` 前綴
- 暗黑模式用 `dark:` 前綴

### Mobile (Expo) - 樣式系統選擇

本項目使用 **NativeWind 4.x**（基於 Tailwind 工具類）+ **React Native StyleSheet**：

#### 方案 1️⃣：NativeWind (推薦 - 已在使用)

```tsx
// ✅ 推薦：使用 NativeWind className (像 Web 一樣)
import { View, Text } from 'react-native';

export function PropertyCard({ property }) {
  return (
    <View className="flex-1 p-4 bg-gray-100 rounded-lg">
      <Text className="text-2xl font-semibold text-blue-600">
        {property.name}
      </Text>
    </View>
  );
}
```

**NativeWind 的優點**：
- ✅ 開發速度快（熟悉的 Tailwind 工具類）
- ✅ 與 Web 端風格統一
- ✅ 易於快速原型開發

**NativeWind 的限制**：
- ⚠️ 只支援 **部分** Tailwind 工具類（React Native 不支援所有 CSS 特性）
- ⚠️ 複雜樣式可能不支援（如 `filter`, `backdrop`, `animation` 等）
- ⚠️ 增加編譯時間 (~150KB)
- ⚠️ 某些工具類命名與 Web 不同（如 `p-4` 而非 `px-4 py-4`）

#### 方案 2️⃣：React Native StyleSheet (標準方式)

```tsx
// ✅ 標準方式：使用 StyleSheet（無依賴、效能最優）
import { StyleSheet, View, Text } from 'react-native';

export function PropertyCard({ property }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{property.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2563eb',
  },
});
```

**StyleSheet 的優點**：
- ✅ 標準 React Native 方式
- ✅ 編譯時最佳化，執行最快
- ✅ 完全的型別安全（TypeScript 友好）
- ✅ 無額外依賴

#### 選擇指南

| 場景 | 推薦方案 | 原因 |
| :--- | :--- | :--- |
| 快速原型 / Dashboard UI | NativeWind | 開發速度快 |
| 複雜樣式 / 自訂動畫 | StyleSheet | 功能完整 |
| 混用場景 | 兩者組合 | 見下方範例 |
| 性能關鍵場景 | StyleSheet | 無編譯開銷 |

#### 混用範例（推薦做法）

```tsx
// ✅ 簡單樣式用 NativeWind，複雜樣式用 StyleSheet
import { StyleSheet, View, Text, FlatList } from 'react-native';

export function PropertiesList({ properties }) {
  return (
    <View className="flex-1 bg-white">
      {/* NativeWind：簡單的容器 */}
      <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <Text className="text-lg font-semibold">My Properties</Text>
      </View>

      {/* StyleSheet：FlatList 需要 style prop，NativeWind 不支援 */}
      <FlatList
        data={properties}
        renderItem={({ item }) => <PropertyCard property={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
  },
});
```

**混用最佳實踐**：
- 使用 NativeWind 處理簡單、通用的樣式（margin, padding, background, border）
- 使用 StyleSheet 處理複雜邏輯或需要編譯時最佳化的樣式
- 避免混亂：保持代碼一致性，同一組件優先使用一種方式

---

## 性能優化

### Web (Next.js)

| 優化項目 | 方法 | 優先級 |
| :--- | :--- | :--- |
| 代碼分割 | Next.js 自動 + `dynamic()` | 🔴 必須 |
| 圖片優化 | `<Image>` 組件 | 🔴 必須 |
| 字體加載 | `next/font` | 🟡 建議 |
| Memoization | `React.memo`, `useMemo`, `useCallback` | 🟡 按需 |
| 靜態生成 | `getStaticProps` / ISR | 🟡 按需 |

**代碼分割範例**：
```tsx
// apps/web/app/dashboard/page.tsx
import dynamic from 'next/dynamic';

// 動態載入重型組件
const DashboardChart = dynamic(
  () => import('@/components/DashboardChart'),
  { loading: () => <div>Loading...</div> }
);

export default function DashboardPage() {
  return <DashboardChart />;
}
```

### Mobile (Expo)

| 優化項目 | 方法 | 優先級 | 備註 |
| :--- | :--- | :--- | :--- |
| 列表優化 | `FlatList` / `SectionList` | 🔴 必須 | - |
| 圖片緩存 | `expo-cached-image` | 🔴 必須 | - |
| 樣式系統 | NativeWind 簡單場景，StyleSheet 複雜場景 | 🟡 建議 | 避免過度使用 NativeWind |
| Bundle 大小 | Tree-shaking + EAS Build | 🟡 建議 | NativeWind +150KB |
| Memoization | `React.memo`, `useMemo` | 🟡 按需 | - |

**FlatList 最佳實踐**：
```tsx
import { FlatList, View, Text } from 'react-native';

export function PropertyList({ properties }) {
  return (
    <FlatList
      data={properties}
      renderItem={({ item }) => <PropertyCard property={item} />}
      keyExtractor={(item) => item.id}
      // 性能優化選項
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      // 下拉刷新
      onRefresh={() => refetch()}
      refreshing={loading}
      // 分頁
      onEndReached={() => loadMore()}
      onEndReachedThreshold={0.8}
    />
  );
}
```

---

## 最佳實踐

### 共通原則

- ✅ 組件應易於測試、重用、維護
- ✅ 避免 prop drilling，使用 Context 或 state management
- ✅ 類型安全：使用 TypeScript 為 props 定義 interface
- ✅ 錯誤邊界：在頁面層級使用 `ErrorBoundary`
- ✅ 載入狀態：顯示 loading/skeleton UI

### Web (Next.js) 專項

| 項目 | 做法 |
| :--- | :--- |
| **路由保護** | 使用 Middleware 檢查認證狀態 |
| **SEO** | 在 Server Component 中設定 `metadata` |
| **API Routes** | 敏感操作（如認證）應在 Server 端 |
| **環境變數** | 公開的用 `NEXT_PUBLIC_*` 前綴 |

### Mobile (Expo) 專項

| 項目 | 做法 |
| :--- | :--- |
| **導航保護** | 使用 Layout Groups 和 Navigation Guards |
| **離線支持** | 用 AsyncStorage 緩存重要數據 |
| **權限請求** | 使用 `expo-permissions` 管理系統權限 |
| **環境變數** | 用 `EXPO_PUBLIC_*` 前綴，在 `app.json` 中配置 |
| **版本更新** | 使用 EAS Update 實現 OTA（Over-The-Air）更新 |

---

## 常見錯誤與排查

### Web (Next.js)

| 錯誤 | 原因 | 解決方案 |
| :--- | :--- | :--- |
| "useRouter is not available in Server Component" | 在 Server Component 使用 client-only hook | 在組件頂部加 `'use client'` |
| Hydration mismatch | Server 和 Client 渲染內容不一致 | 檢查條件渲染、確保 SSR 穩定 |
| 環境變數未定義 | 使用 `NEXT_PUBLIC_` 前綴但未設定 | 檢查 `.env.local` 和重啟開發伺服器 |
| Dynamic import 錯誤 | 動態載入的模組不存在 | 確保路徑正確，使用相對路徑 |

### Mobile (Expo)

| 錯誤 | 原因 | 解決方案 |
| :--- | :--- | :--- |
| "Cannot use HTML tags in React Native" | 用 `<div>`, `<span>` 代替 `<View>`, `<Text>` | 改用原生組件 |
| StyleSheet style objects 警告 | 在 render 中建立樣式物件 | 移至 `StyleSheet.create()` |
| Layout 無反應 | Expo Router 路由未正確設定 | 檢查 `_layout.tsx` 和 navigation structure |
| AsyncStorage 返回 null | 資料未正確序列化 | 確保存儲 JSON 字符串，讀取時 parse |
| 認證失敗 | `useAuth` hook 未包裝在 Provider 中 | 確保 App.tsx 或 Root Layout 包含 AuthProvider |
| **每次啟動都要登入** | 誤將 `EXPO_PUBLIC_SKIP_AUTH` 設為 `false` | 開發時設 `.env` 的 `EXPO_PUBLIC_SKIP_AUTH=true` |
| **無法進入登入頁面** | 開發模式 (`SKIP_AUTH=true`) 自動跳過認證 | 若需要測試登入流程，改用 `EXPO_PUBLIC_SKIP_AUTH=false` |
| **Mock User 未載入** | 環境變數未生效 | 重啟 Expo 伺服器：`npm run dev:mobile` |
| **NativeWind className 不生效** | 樣式未編譯或快取問題 | 清除快取：`npm run clean:mobile && npm install` |
| **使用了不支援的 Tailwind 工具類** | NativeWind 只支援部分工具類 | 改用 StyleSheet 或檢查 NativeWind 文檔 |
| **Bundle 大小變大** | NativeWind 增加了 150KB | 如果大小關鍵，考慮改用 StyleSheet |

**開發模式提醒**：
```bash
# ✅ 開發時應該用這個（自動進入 Dashboard）
EXPO_PUBLIC_SKIP_AUTH=true npm run dev:mobile

# ❌ 開發時不應該用這個（每次都要登入，很煩）
EXPO_PUBLIC_SKIP_AUTH=false npm run dev:mobile
```

---

## Context7 查詢指引

當需要相關官方文檔時，使用以下指令查詢最新資訊：

### Web (Next.js) 相關

| 需求 | Context7 查詢 |
| :--- | :--- |
| **App Router 路由設定** | `Next.js 15 App Router routing and navigation` |
| **Server Actions 與 Form 提交** | `Next.js Server Actions form submission` |
| **Middleware 認證檢查** | `Next.js middleware authentication` |
| **環境變數配置** | `Next.js environment variables setup` |
| **動態導入** | `Next.js dynamic imports lazy loading` |

### Mobile (Expo) 相關

| 需求 | Context7 查詢 |
| :--- | :--- |
| **Expo Router 導航結構** | `Expo Router 54 routing and navigation` |
| **Layout Groups 使用** | `Expo Router Layout Groups authentication flow` |
| **AsyncStorage 本地存儲** | `React Native AsyncStorage async storage API` |
| **Expo 權限管理** | `Expo permissions system permissions` |
| **React Native StyleSheet** | `React Native StyleSheet styling components` |

### 通用 (React & TypeScript)

| 需求 | Context7 查詢 |
| :--- | :--- |
| **React 19 Hooks** | `React 19 hooks useState useEffect useContext` |
| **TypeScript 型別定義** | `TypeScript interface types declaration` |
| **Supabase JavaScript SDK** | `Supabase JavaScript client library` |
| **Tailwind CSS 工具類** | `Tailwind CSS 3.4 utility classes responsive` |

### 查詢範例

```bash
# 查詢 Next.js Server Actions 實現
Next.js Server Actions form data mutation

# 查詢 Expo Router Layout Groups 認證流程
Expo Router Layout Groups authentication protected routes

# 查詢 React Context 最佳實踐
React 19 Context API useContext provider pattern

# 查詢 Supabase 即時訂閱
Supabase JavaScript realtime subscriptions
```

---

## 檔案結構速查

### Web 應用新建檔案清單

```bash
# 新建頁面
apps/web/app/(marketing)/about/page.tsx

# 新建組件
apps/web/components/(marketing)/AboutHero.tsx

# 新建 Hook
apps/web/lib/hooks/useScroll.ts

# 新建工具函數
apps/web/lib/utils/formatDate.ts

# 新建 API Route (Server Action)
apps/web/app/api/properties/route.ts
```

### Mobile 應用新建檔案清單

```bash
# 新建頁面
apps/mobile/src/app/(dashboard)/properties/index.tsx

# 新建詳情頁
apps/mobile/src/app/(dashboard)/properties/[id].tsx

# 新建組件
apps/mobile/src/components/(dashboard)/PropertyCard.tsx

# 新建 Hook
apps/mobile/src/lib/hooks/useProperty.ts

# 新建上下文
apps/mobile/src/lib/context/ThemeContext.tsx
```
