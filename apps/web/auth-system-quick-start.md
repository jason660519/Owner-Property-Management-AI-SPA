# 認證系統快速啟動指南

> **創建日期**: 2026-01-31  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-01-31  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 開發指南

---

## ✅ 已建立的檔案

以下檔案已建立完成，可直接使用：

### 核心認證檔案
- ✅ `lib/supabase/client.ts` - Supabase Client 配置
- ✅ `lib/supabase/server.ts` - Server Component Client
- ✅ `lib/supabase/auth.ts` - 認證 API 函數
- ✅ `lib/validators/auth.ts` - Zod 表單驗證 Schema
- ✅ `hooks/useAuth.ts` - 認證狀態管理 Hook
- ✅ `hooks/useRequireAuth.ts` - 路由守衛 Hook
- ✅ `middleware.ts` - 路由保護中介層
- ✅ `types/database.ts` - TypeScript 型別定義
- ✅ `types/auth.ts` - 認證型別定義

## 📦 安裝依賴

```bash
cd apps/web

# 安裝 Supabase 相關依賴
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# 安裝表單驗證工具
npm install react-hook-form zod @hookform/resolvers

# 安裝 UI 工具 (可選)
npm install lucide-react sonner
```

## ⚙️ 環境變數配置

創建 `apps/web/.env.local`:

```bash
# Supabase 連線資訊
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 服務端專用
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 網站 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 🚀 下一步：實作頁面

### 1. 創建認證頁面

需要創建以下頁面：

- `app/(auth)/login/page.tsx` - 登入頁面
- `app/(auth)/register/page.tsx` - 註冊頁面
- `app/(auth)/layout.tsx` - 認證頁面共用布局

### 2. 創建儀表板路由

```
app/(dashboard)/
├── landlord/
│   ├── dashboard/
│   │   └── page.tsx
│   └── layout.tsx
└── layout.tsx
```
**注意**：超級管理員 (super_admin) 已獨立至 **apps/superadmin**（Port 3001），路徑為 `http://localhost:3001/superadmin/dashboard`，不在此站。

### 3. 測試流程

1. 啟動 Supabase: `supabase start`
2. 啟動 Next.js: `npm run dev`
3. 訪問 http://localhost:3000/register 進行註冊
4. 檢查 Mailpit (http://localhost:54324) 查看驗證郵件
5. 點擊驗證連結
6. 訪問 http://localhost:3000/login 進行登入

## 📚 參考文件

詳細實作指引請參閱：
- [認證系統架構設計](../../docs/technical-selection/認證系統架構設計.md)
- [Supabase Auth 整合指南](../../docs/operational-guides/deployment-guides/Supabase_Auth_整合指南.md)

## ⚠️ 注意事項

1. **RLS 策略**: 請確保 `users_profile` 表已啟用 Row Level Security
2. **OAuth 配置**: 如需使用 Google/Facebook 登入，需先配置 OAuth 應用
3. **生產環境**: 請勿使用本地開發的 Supabase 金鑰於生產環境

---

**狀態**: ✅ 基礎架構已完成  
**下一步**: 實作登入/註冊頁面
