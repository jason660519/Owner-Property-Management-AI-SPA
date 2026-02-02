# technical-architecture

> **創建日期**: 2026-02-02  
> **創建者**: Project Team  
> **最後修改**: 2026-02-02  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 技術文件

---

## 1. 整體架構概覽

本專案採用 **Monorepo 架構**，使用 npm workspaces 管理多個應用與共用套件，確保程式碼重用性與開發效率。

### 1.1 專案結構

```
Owner-Property-Management-AI-SPA/
├── apps/
│   ├── web/              # Next.js 公司官網 ✅ (目前開發重心)
│   └── mobile/           # Expo 房東管理 App ⏸️ (開發已暫緩)
├── packages/             # 共用套件 (UI, Utils)
├── supabase/             # 本地 Supabase 配置
│   └── migrations/       # 資料庫遷移檔
├── docs/                 # 專案文件
└── turbo.json            # Turborepo 配置 (未來可選)
```

### 1.2 技術選型理由

| 技術             | 用途          | 選型理由                                          |
| ---------------- | ------------- | ------------------------------------------------- |
| **Monorepo**     | 專案架構      | 統一管理雙端應用，共用型別定義與業務邏輯          |
| **Next.js 16**   | Web 端框架    | 最新 App Router、React 19 支援、優秀的 SEO 與效能 |
| **Expo 54**      | Mobile 端框架 | ⏸️ 已暫緩開發，僅供未來開發原生 App 參考           |
| **Supabase**     | 後端服務      | 開源、完整的 BaaS 解決方案（Auth、DB、Storage）   |
| **TypeScript**   | 開發語言      | 型別安全、提升開發效率與程式碼品質                |
| **Tailwind CSS** | 樣式框架      | 快速開發、設計系統統一、雙端共用設計語言          |

---

## 2. Web 端技術架構 (Next.js)

### 2.1 技術堆疊

- **框架**: Next.js 16.1.6 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x
- **樣式**: Tailwind CSS 3.4.19
- **狀態管理**: React Hooks + Context API
- **表單處理**: React Hook Form + Zod
- **資料表格**: TanStack Table
- **動畫**: Framer Motion
- **圖表**: Recharts
- **權限管理**: CASL (Ability)

### 2.2 主要功能模組

#### ✅ 已完成
- 基礎官網架構與設計系統
- 登入/註冊頁面 (`app/(auth)/login`, `app/(auth)/register`)
- Header 導航元件 (`components/layout/Header.tsx`)
- Supabase SSR 整合 (`@supabase/ssr`)
- 圖片最佳化配置 (WebP、遠程圖片支援)

#### ⚠️ 開發中
- 產品介紹頁面
- 房東儀表板 (Web 版)
- 物件管理介面
- 財務報表視覺化

### 2.3 開發環境

- **開發伺服器**: `http://localhost:3000`
- **啟動指令**: `npm run dev:web`
- **建置指令**: `npm run build --workspace web`

---

## 3. Mobile 端技術架構 (Expo) ⏸️ (開發已暫緩)

> **注意**：Expo Mobile 端開發目前處於暫緩狀態，開發資源已轉移至 **Next.js Web App + PWA**。以下內容僅供架構參考。

### 3.1 技術堆疊

- **框架**: Expo 54.0.33
- **React Native**: 0.81.5
- **React**: 19.2.4
- **TypeScript**: 5.9.2
- **樣式**: NativeWind 4.2.1 (Tailwind for RN)
- **導航**: 自訂導航系統 (Sidebar + Bottom Tabs)
- **圖片處理**: expo-image-picker, expo-image-manipulator
- **檔案處理**: expo-document-picker, expo-file-system
- **狀態管理**: React Hooks + Context API

### 3.2 主要功能模組

#### ✅ 已完成

**身分驗證模組** (`src/screens/auth/`):
- `WelcomeScreen.tsx` - 歡迎頁面
- `LoginScreen.tsx` - 登入頁面
- `RegisterScreen.tsx` - 註冊頁面
- Supabase Auth 整合 (`src/lib/supabase.ts`)

**儀表板框架** (`src/`):
- `Dashboard.tsx` - 主儀表板
- `components/Sidebar.tsx` - 側邊欄導航 (Web/平板)
- 底部導航列 (Bottom Tab Bar) - 手機模式
- 角色切換邏輯 (房東 / 超級管理員)

**響應式設計**:
- 平台偵測 (`Platform.OS === 'web'`)
- 自適應佈局 (Sidebar vs Bottom Tabs)
- 統一設計系統 (`src/theme/`)

#### ⏸️ 已暫緩功能 (未來規劃)
- AI 語音助理互動介面
- 物件管理與行銷頁面生成
- 租客篩選與合約製作
- 維修通報系統
- 財務報表功能
- 文件上傳與管理 (`DocumentsScreen.tsx`)

### 3.3 開發環境

- **開發伺服器**: `http://localhost:8081` ⏸️ (已暫緩)
- **啟動指令**: `npm run dev:mobile`
- **Web 預覽**: `expo start --web` ⏸️ (已暫緩)
- **iOS 模擬器**: `expo start --ios` ⏸️ (已暫緩)
- **Android 模擬器**: `expo start --android` ⏸️ (已暫緩)

### 3.4 平台支援

| 平台        | 狀態   | 說明                           |
| ----------- | ------ | ------------------------------ |
| **Web**     | ⏸️ 暫緩 | 透過 React Native Web 實現     |
| **iOS**     | ⏸️ 暫緩 | 需 macOS + Xcode 進行原生建置  |
| **Android** | ⏸️ 暫緩 | 需 Android Studio 進行原生建置 |

---

## 4. 後端服務架構 (Supabase)

### 4.1 服務組成

本專案使用 **Supabase Local Development** 進行本地開發，包含以下服務：

| 服務                | 位址                                 | 用途             |
| ------------------- | ------------------------------------ | ---------------- |
| **API Gateway**     | http://localhost:54321               | 統一 API 入口    |
| **REST API**        | http://localhost:54321/rest/v1       | RESTful API      |
| **GraphQL API**     | http://localhost:54321/graphql/v1    | GraphQL 查詢     |
| **Edge Functions**  | http://localhost:54321/functions/v1  | 伺服器端函數     |
| **Storage (S3)**    | http://localhost:54321/storage/v1/s3 | 物件儲存服務     |
| **PostgreSQL**      | postgresql://127.0.0.1:54322         | 主資料庫         |
| **Supabase Studio** | http://localhost:54323               | 資料庫管理後台   |
| **Mailpit**         | http://localhost:54324               | 本地郵件測試工具 |

### 4.2 資料庫架構

目前已建立的主要資料表：

- `building_title_records` - 建物權狀記錄
- `land_title_records` - 土地權狀記錄
- `property_appointments` - 物件預約
- `property_photos` - 物件照片
- `clients` - 客戶資料
- `owner` - 房東資料

### 4.3 身分驗證

- **提供者**: Supabase Auth
- **支援方式**: Email/Password、OAuth (Google, Facebook)
- **安全機制**: JWT Token、Row Level Security (RLS)
- **Session 管理**: 
  - Web: `@supabase/ssr` (Server-Side Rendering)
  - Mobile: `@react-native-async-storage/async-storage`

---

## 5. 共用設計系統

### 5.1 色彩主題

兩端應用共用統一的色彩系統 (定義於 `tailwind.config.js`):

```javascript
colors: {
  accent: '#703BF7',        // 主要強調色 (紫色)
  'bg-primary': '#141414',  // 主背景 (深黑)
  'bg-secondary': '#1A1A1A',// 次背景
  'text-primary': '#FFFFFF',// 主文字 (白色)
  'text-secondary': '#999999',// 次文字 (灰色)
  'border-light': '#262626',// 邊框
}
```

### 5.2 字體系統

- **Web**: Inter (Google Fonts)
- **Mobile**: 系統預設字體 + Inter (Web 模式)

### 5.3 設計規範

- **圓角**: 12px (統一)
- **最大寬度**: 1440px (Web 端)
- **間距系統**: Tailwind 預設 (4px 基準)
- **斷點**: 
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

---

## 6. 開發工具與流程

### 6.1 開發環境啟動

詳細步驟請參考 [quick-start-guide](../deployment-guides/quick-start-guide.md)

**快速啟動**:
```bash
# 1. 啟動 Supabase
supabase start

# 2. 安裝依賴
npm install

# 3. 同時啟動雙端應用
npm run dev

# 或分別啟動
npm run dev:web      # 僅 Web
npm run dev:mobile   # 僅 Mobile
```

### 6.2 程式碼品質工具

- **Linter**: ESLint
- **Formatter**: Prettier
- **Type Checker**: TypeScript
- **測試**: (規劃中)

### 6.3 版本控制

- **Git**: 版本控制
- **GitHub**: 程式碼託管
- **分支策略**: (待定義)

---

## 7. 部署架構 (規劃中)

### 7.1 Web 端部署

- **平台**: Vercel / Netlify (推薦)
- **環境變數**: Supabase URL, Anon Key
- **CI/CD**: GitHub Actions

### 7.2 Mobile 端部署

- **iOS**: App Store (需 Apple Developer Account)
- **Android**: Google Play Store
- **OTA 更新**: Expo Updates

### 7.3 後端部署

- **Supabase Cloud**: 正式環境
- **資料庫**: PostgreSQL (Supabase 託管)
- **檔案儲存**: Supabase Storage (S3 相容)

---

## 8. 未來擴展計畫

### 8.1 技術優化

- [ ] 引入 Turborepo 加速建置
- [ ] 建立共用 UI 元件庫 (`packages/ui`)
- [ ] 實作完整的測試覆蓋 (Unit + E2E)
- [ ] 效能監控與分析 (Sentry, Analytics)

### 8.2 功能擴展

- [ ] AI 語音助理整合 (OpenAI / Anthropic)
- [ ] 即時通訊功能 (Supabase Realtime)
- [ ] 推播通知 (Expo Notifications)
- [ ] 多語系支援 (i18n)

### 8.3 平台擴展

- [ ] 桌面應用 (Electron / Tauri)
- [ ] 微信小程序
- [ ] LINE LIFF

---

## 9. 相關文件

- [quick-start-guide](../deployment-guides/quick-start-guide.md)
- [product-overview](./product-overview-content.md)
- [mobile-app-user-scenarios](./mobile-app-user-scenarios.md)
- [DESIGN.md](../design-guidelines/DESIGN_SYSTEM.md) - Figma 設計實作指南

---

## 版本修訂記錄

- **2026-02-02**：標記 Expo Mobile App 為**暫緩開發**狀態，專案聚焦於 Next.js Web App + PWA。
- **2026-02-02**：初版建立，詳細說明 Monorepo 架構、Next.js Web 與 Expo Mobile 的技術堆疊、開發狀態與未來規劃。
