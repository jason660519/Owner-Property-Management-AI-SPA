# RESA AI 快速啟動指南

> **創建日期**: 2026-02-03
> **創建者**: Claude Sonnet 4.5
> **最後修改**: 2026-02-03
> **修改者**: Claude Sonnet 4.5
> **版本**: 2.1
> **備註**: Mobile App (Expo) 暫緩開發中，目前專注於 Web App (Next.js)

## 🚀 快速開始（5 分鐘）

> ⚠️ **注意**: 物件管理 App (Mobile/Expo) 目前處於暫緩開發階段，請專注於 Web 端功能開發。無需啟動 8081 端口。

### 1. 啟動 Supabase

```bash
# 啟動本地 Supabase
supabase start

# 檢查狀態
supabase status
```

### 2. 啟動開發服務器

```bash
# 安裝依賴（首次運行）
npm install

# 啟動 Web 開發服務器
npm run dev:web

# 或使用便捷腳本啟動
./start-dev.sh web
```

### 3. 訪問應用

- **首頁**: http://localhost:3000
- **登錄**: http://localhost:3000/login
- **註冊**: http://localhost:3000/register
- **忘記密碼**: http://localhost:3000/forgot-password

## 🔑 認證功能測試

### 測試帳號

如果您沒有測試帳號，可以：

1. **註冊新帳號**: 訪問 http://localhost:3000/register
2. **使用超級管理員帳號**（需先創建）

### 忘記密碼？

如果忘記超級管理員密碼：

1. 訪問 http://localhost:3000/forgot-password
2. 輸入註冊時使用的 email
3. 檢查郵箱（本地開發查看 Supabase 日誌）
4. 點擊重設連結
5. 設定新密碼

### 重設超級管理員密碼（開發環境）

如果 email 服務未配置，可以直接通過 SQL 重設密碼：

```sql
-- 連接到 Supabase
supabase db reset

-- 或使用 SQL 編輯器
-- 1. 訪問 http://127.0.0.1:54323（Supabase Studio）
-- 2. 進入 SQL Editor
-- 3. 執行以下 SQL（替換 your-email@example.com）

-- 方法 1: 重設密碼為 "NewPassword123"
UPDATE auth.users
SET encrypted_password = crypt('NewPassword123', gen_salt('bf'))
WHERE email = 'your-email@example.com';

-- 方法 2: 查看用戶列表並創建新的超級管理員
SELECT id, email, raw_user_meta_data FROM auth.users;
```

## ✨ 新功能（2026-02-03）

### 密碼顯示/隱藏功能

所有密碼輸入框現在都有眼睛圖示：
- 👁️ 點擊顯示密碼
- 👁️‍🗨️ 點擊隱藏密碼

適用於：
- ✅ 登錄頁面
- ✅ 註冊頁面（密碼 + 確認密碼）
- ✅ 重設密碼頁面（新密碼 + 確認新密碼）

### 忘記密碼功能

完整的密碼重設流程：

```
登錄頁面
  ↓ 點擊「忘記密碼？」
忘記密碼頁面
  ↓ 輸入 email
檢查信箱
  ↓ 點擊重設連結
重設密碼頁面
  ↓ 輸入新密碼
成功！
  ↓ 自動跳轉到登錄頁面
```

## 🐛 常見問題排查

### 問題 1: 登錄失敗 "Request interrupted by user"

**原因**:
- 網絡連接問題
- Supabase 服務未啟動
- 環境變數配置錯誤

**解決方法**:
```bash
# 1. 檢查 Supabase 狀態
supabase status

# 2. 如果未運行，啟動 Supabase
supabase start

# 3. 檢查環境變數
cat .env | grep SUPABASE

# 4. 重啟開發服務器
npm run dev:web
```

### 問題 2: 註冊後跳轉到錯誤頁面

**原因**:
- 資料庫 RLS 政策問題
- users_profile 表創建失敗

**解決方法**:
```bash
# 重置資料庫
supabase db reset

# 檢查 migrations
ls -la supabase/migrations/

# 手動執行最新的 migration
supabase db push
```

### 問題 3: 忘記密碼郵件未收到

**原因**:
- 本地開發環境未配置 SMTP
- Email 發送功能需要設定

**解決方法（開發環境）**:
```bash
# 方法 1: 查看 Supabase Inbucket（本地郵件服務）
open http://127.0.0.1:54324

# 方法 2: 檢查 Supabase 日誌
supabase logs --level=debug | grep email

# 方法 3: 直接用 SQL 重設密碼（見上方）
```

### 問題 4: 編譯錯誤

**解決方法**:
```bash
# 清理緩存
rm -rf apps/web/.next
rm -rf node_modules
rm -rf apps/web/node_modules

# 重新安裝
npm install

# 重新編譯
npm run dev:web
```

## 📁 重要文件位置

### 認證相關
```
apps/web/app/(auth)/
├── login/page.tsx           # 登錄頁面
├── register/page.tsx        # 註冊頁面
├── forgot-password/page.tsx # 忘記密碼頁面
└── reset-password/page.tsx  # 重設密碼頁面
```

### API 與邏輯
```
apps/web/
├── lib/supabase/
│   ├── auth.ts             # 認證函數
│   ├── client.ts           # 瀏覽器端客戶端
│   └── server.ts           # 服務器端客戶端
└── app/actions/
    └── auth.ts             # Server Actions
```

### 配置文件
```
.env                         # 環境變數（本地）
apps/web/.env.local          # Web 專案環境變數
supabase/config.toml         # Supabase 配置
```

## 🔧 環境變數檢查

必需的環境變數：

```bash
# .env 文件
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
```

驗證配置：
```bash
# 檢查是否正確設定
cat .env | grep SUPABASE

# 測試連接
curl http://127.0.0.1:54321/rest/v1/
```

## 📊 開發工作流程

### 日常開發

```bash
# 1. 啟動 Supabase（每天第一次）
supabase start

# 2. 啟動開發服務器
npm run dev:web

# 3. 開發...

# 4. 停止服務器（結束開發）
# Ctrl + C 停止 npm run dev:web
supabase stop
```

### 資料庫修改

```bash
# 1. 創建新的 migration
supabase migration new your_migration_name

# 2. 編輯 migration 文件
# supabase/migrations/YYYYMMDDHHmmss_your_migration_name.sql

# 3. 應用 migration
supabase db reset  # 或
supabase db push
```

### 測試

```bash
# 運行測試（待實現）
npm run test

# 運行 E2E 測試（待實現）
npm run test:e2e
```

## 🎯 下一步

1. **測試認證功能**: 嘗試登錄、註冊、忘記密碼流程
2. **配置 Email**: 設定 SMTP 以啟用郵件發送
3. **探索功能**: 登錄後訪問儀表板
4. **閱讀文檔**: 查看 `docs/` 目錄了解更多

## 📚 相關文檔

- [認證系統修復報告](../progress-reports/2026-02-03_authentication_fixes.md)
- [專案規則](./../CLAUDE.md)
- [資料庫架構](../database/)
- [API 文檔](../api/)

## 🆘 獲取幫助

遇到問題？

1. 查看本指南的「常見問題排查」章節
2. 檢查 [認證系統修復報告](../progress-reports/2026-02-03_authentication_fixes.md)
3. 查看 Supabase 日誌: `supabase logs`
4. 查看瀏覽器控制台錯誤信息

---

**祝您開發順利！** 🎉
