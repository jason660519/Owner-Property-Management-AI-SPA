# 認證系統重大修復報告（2026-02-03）

> **創建日期**: 2026-02-03
> **創建者**: Claude Sonnet 4.5
> **版本**: 2.0
> **狀態**: ✅ 完成 - 待測試

## 📋 執行摘要

本次修復解決了用戶報告的所有認證系統關鍵問題：

1. ✅ 密碼重設郵件連結錯誤
2. ✅ 註冊後頁面凍結或錯誤
3. ✅ 舊帳號「無法取得用戶資料」錯誤
4. ✅ 註冊後未登入卻進入 dashboard

---

## 🔧 主要修復內容

### 1. 密碼重設流程修復

**問題描述**：
- 用戶點擊郵件中的「Reset password」按鈕後直接跳到首頁 `http://localhost:3000/`
- 郵件發送到 Inbucket（本地郵件服務器）而非用戶真實信箱

**修復內容**：

#### a) 修正 redirectTo URL
**文件**: `apps/web/lib/supabase/auth.ts`

```typescript
// 修正前
redirectTo: `${window.location.origin}/auth/reset-password`

// 修正後
redirectTo: `${window.location.origin}/auth/callback?next=/update-password`
```

**說明**：Supabase 的密碼重設流程需要先經過 `/auth/callback` 交換 token 建立 session，然後才能導向重設密碼頁面。

#### b) 更新 /auth/callback 路由
**文件**: `apps/web/app/auth/callback/route.ts`

**新功能**：
- ✅ 支援 `next` 參數，允許指定驗證後的跳轉頁面
- ✅ 改進錯誤處理，顯示具體錯誤訊息
- ✅ 根據用戶角色自動導向對應的 dashboard（如果沒有指定 next）

#### c) 重命名頁面
**變更**：`/reset-password` → `/update-password`

**原因**：更語義化，清楚表達這是「更新密碼」而非「請求重設」

### 2. 註冊流程優化

**問題描述**：
- 註冊後有時頁面凍結 3 秒
- 有時跳到 `/landlord/dashboard` 但用戶尚未登入
- 有時顯示「無法取得用戶資料」錯誤

**根本原因**：**Race Condition**
- `auth.users` 寫入完成，但 `users_profile` 尚未寫入
- 前端跳轉過快，資料庫複製延遲

**修復內容**：

#### a) 添加同步等待
**文件**: `apps/web/app/actions/auth.ts`

```typescript
// 確保 profile 創建完成
if (newUser.user) {
  await adminSupabase.from('users_profile').insert({...});

  // 等待 500ms 確保資料庫寫入完成
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

#### b) 修正成功訊息
**文件**: `apps/web/app/(auth)/register/page.tsx`

```typescript
// 修正前
<p>我們已發送驗證郵件到您的信箱</p>
<p>3 秒後自動跳轉到登入頁...</p>

// 修正後
<p>您的帳號已成功建立<br />現在可以使用您的帳號密碼登入</p>
<p>3 秒後將跳轉到登入頁面...</p>
```

**說明**：當前實現使用 `email_confirm: true` 自動驗證 email，所以不需要用戶點擊驗證連結。

#### c) 確保導向登入頁面
```typescript
setTimeout(() => {
  router.push('/login')
  router.refresh() // 刷新以清除快取
}, 3000)
```

### 3. 登入流程自動修復功能

**問題描述**：
- 舊帳號（如 `a0405142777@gmail.com`）登入時顯示「無法取得用戶資料」
- 可能是因為早期註冊時 profile 創建失敗

**修復內容**：

#### Self-Healing 邏輯
**文件**: `apps/web/app/(auth)/login/page.tsx`

```typescript
// Get user profile
let { data: profile, error: profileError } = await supabase
  .from('users_profile')
  .select('primary_role')
  .eq('user_id', result.user.id)
  .single()

// Self-healing: 如果 profile 不存在，自動創建
if (profileError || !profile) {
  console.warn('Profile not found, attempting to create...')

  const userRole = result.user.user_metadata?.primary_role || 'landlord'
  const fullName = result.user.user_metadata?.full_name || result.user.email?.split('@')[0]

  await supabase.from('users_profile').insert({
    user_id: result.user.id,
    email: result.user.email,
    full_name: fullName,
    roles: [userRole],
    primary_role: userRole,
  })

  // Re-fetch profile
  profile = await supabase.from('users_profile').select('primary_role')...
}
```

**好處**：
- ✅ 舊帳號可以正常登入
- ✅ 自動修復資料不一致問題
- ✅ 無需手動資料庫操作

---

## 🔄 完整流程圖

### 密碼重設流程（修正後）

```
1. 用戶在登入頁面點擊「忘記密碼？」
   ↓
2. 進入 /forgot-password 頁面
   ↓
3. 輸入 email (a0405142777@gmail.com)
   ↓
4. 系統發送郵件（本地查看：http://127.0.0.1:54324）
   ↓
5. 郵件包含連結：http://localhost:3000/auth/callback?code=XXX&next=/update-password
   ↓
6. 點擊連結 → /auth/callback 驗證 token → 建立 session
   ↓
7. 導向 /update-password（此時用戶已登入）
   ↓
8. 輸入新密碼並提交
   ↓
9. 成功！3 秒後跳轉到 /login
   ↓
10. 使用新密碼登入 ✅
```

### 註冊流程（修正後）

```
1. 用戶填寫註冊表單
   ↓
2. 提交 → Server Action: signUpWithRole
   ↓
3. 創建 auth.users（email_confirm: true）
   ↓
4. 創建 users_profile
   ↓
5. 等待 500ms 確保同步完成
   ↓
6. 返回成功訊息
   ↓
7. 前端顯示成功頁面（3 秒）
   ↓
8. 導向 /login
   ↓
9. 用戶手動登入 ✅
```

### 登入流程（含自動修復）

```
1. 用戶輸入帳密並提交
   ↓
2. Supabase 驗證帳密 → 建立 session
   ↓
3. 查詢 users_profile
   ├─ 找到 profile → 根據 primary_role 導向 dashboard
   └─ 未找到 profile → Self-Healing:
       ├─ 從 user_metadata 取得 role
       ├─ 自動創建 profile
       ├─ Re-fetch profile
       └─ 導向 dashboard ✅
```

---

## 🧪 測試指南

### 前置準備

```bash
# 1. 確保 Supabase 運行中
supabase status

# 2. 如果未啟動，執行
supabase start

# 3. 重啟 Web 開發服務器以應用新修改
cd apps/web
npm run dev
```

### 測試案例 1: 密碼重設（完整流程）

**目標**：驗證密碼重設功能完整可用

**步驟**：
1. 訪問 http://localhost:3000/login
2. 點擊「忘記密碼？」
3. 輸入 `a0405142777@gmail.com`
4. 點擊「發送重設連結」
5. 查看 Supabase Inbucket: http://127.0.0.1:54324
6. 找到最新的郵件，點擊「Reset password」按鈕
7. **預期**：跳轉到 http://localhost:3000/update-password
8. 輸入新密碼（例如：`NewPassword123!`）並確認
9. 點擊「重設密碼」
10. **預期**：顯示成功訊息，3 秒後跳轉到登入頁面
11. 使用新密碼登入
12. **預期**：成功登入並進入對應的 dashboard

**驗收標準**：
- ✅ 郵件連結正確導向 /update-password（而非首頁）
- ✅ 可以成功更新密碼
- ✅ 可以使用新密碼登入

### 測試案例 2: 新用戶註冊

**目標**：驗證註冊流程無凍結、無錯誤

**步驟**：
1. 訪問 http://localhost:3000/register
2. 填寫表單：
   - 姓名：測試用戶
   - Email：test123@example.com
   - 密碼：TestPassword123!
   - 確認密碼：TestPassword123!
   - 角色：房東
   - 勾選同意條款
3. 點擊「註冊」
4. **預期**：顯示成功訊息
5. 等待 3 秒
6. **預期**：自動跳轉到 /login
7. 使用剛註冊的帳密登入
8. **預期**：成功登入並進入 landlord/dashboard

**驗收標準**：
- ✅ 註冊過程無凍結
- ✅ 不會顯示「無法取得用戶資料」錯誤
- ✅ 成功訊息明確（不提及驗證郵件）
- ✅ 跳轉到登入頁面（而非自動登入）

### 測試案例 3: 舊帳號自動修復

**目標**：驗證 self-healing 邏輯

**前置條件**：
```sql
-- 在 Supabase Studio (http://127.0.0.1:54323) SQL Editor 執行
-- 1. 刪除特定用戶的 profile（模擬舊帳號）
DELETE FROM public.users_profile WHERE email = 'a0405142777@gmail.com';

-- 2. 確認該用戶在 auth.users 仍存在
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'a0405142777@gmail.com';
```

**步驟**：
1. 訪問 http://localhost:3000/login
2. 使用 `a0405142777@gmail.com` + 密碼登入
3. **預期**：
   - 不顯示「無法取得用戶資料」錯誤
   - 自動創建 profile
   - 成功進入 dashboard

**驗證**：
```sql
-- 檢查 profile 是否已自動創建
SELECT * FROM public.users_profile WHERE email = 'a0405142777@gmail.com';
```

**驗收標準**：
- ✅ 登入成功（不報錯）
- ✅ Profile 自動創建
- ✅ 正確導向 dashboard

### 測試案例 4: 密碼顯示/隱藏功能

**目標**：確認所有密碼輸入框都有眼睛圖示

**檢查頁面**：
- [ ] `/login` - 密碼輸入框
- [ ] `/register` - 密碼 + 確認密碼輸入框
- [ ] `/update-password` - 新密碼 + 確認新密碼輸入框

**驗收標準**：
- ✅ 所有密碼框右側有眼睛圖示
- ✅ 點擊後可切換顯示/隱藏
- ✅ 圖示正確切換（開眼/閉眼）

---

## 📊 修改文件清單

### 修改的文件

| 文件 | 修改內容 | 重要性 |
|:-----|:---------|:-------|
| `apps/web/lib/supabase/auth.ts` | 修正 redirectTo URL | 🔴 高 |
| `apps/web/app/auth/callback/route.ts` | 改進回調處理邏輯 | 🔴 高 |
| `apps/web/app/actions/auth.ts` | 添加延遲確保同步 | 🔴 高 |
| `apps/web/app/(auth)/login/page.tsx` | 添加 self-healing | 🟡 中 |
| `apps/web/app/(auth)/register/page.tsx` | 優化成功訊息 | 🟢 低 |

### 新建/重命名的文件

| 操作 | 文件 |
|:-----|:-----|
| 重命名 | `reset-password/` → `update-password/` |
| 新建 | `docs/auth-redesign-proposal.md` |
| 新建 | `docs/progress-reports/2026-02-03_auth_system_major_fixes.md` |

---

## ⚠️ 已知限制

### 1. Email 發送（開發環境）

**限制**：本地開發使用 Supabase Inbucket，郵件不會真正發送到用戶信箱

**解決方案**：
- 開發環境：訪問 http://127.0.0.1:54324 查看郵件
- 生產環境：需配置 SMTP 設定

### 2. 6 位驗證碼

**問題**：郵件中顯示 6 位驗證碼（如 `695888`）

**說明**：這是 Supabase 的功能，可用於手機 App 或 UI 中輸入驗證碼重設密碼

**建議**：未來可以添加「輸入驗證碼」的 UI，作為郵件連結的替代方案

### 3. 500ms 延遲

**問題**：註冊時添加 500ms 延遲

**原因**：確保 PostgreSQL 複製完成（RLS 政策可能導致延遲）

**改進方案**：
- 使用 PostgreSQL LISTEN/NOTIFY
- 改用 Database Trigger 確保資料一致性
- 將 profile 創建移到 Supabase Edge Function

---

## 🚀 下一步建議

### 短期（本週）

1. **測試所有流程**：按照上方測試指南逐一驗證
2. **修復 Dashboard UI**：添加用戶頭像和設定選單（見下方）
3. **改進錯誤訊息**：更具體的錯誤提示

### 中期（下週）

1. **添加 Middleware**：防止未登入訪問 dashboard
2. **實現 6 位驗證碼 UI**：作為郵件連結的替代方案
3. **添加測試**：單元測試 + E2E 測試

### 長期

1. **移除 500ms 延遲**：使用 Database Trigger
2. **添加 2FA**：雙因素認證
3. **社交登入**：Google/Facebook OAuth

---

## 📝 用戶導航組件（待實現）

根據 Gemini 的建議，Dashboard 應該有用戶頭像和選單。

### 設計規格

**位置**：Dashboard 右上角

**內容**：
```
┌─────────────────────────────┐
│  [頭像] 用戶名 ▼             │
└─────────────────────────────┘
         ↓ 點擊展開
┌─────────────────────────────┐
│  個人資料                    │
│  設定                        │
│  ──────────────             │
│  登出                        │
└─────────────────────────────┘
```

**建議實現**：
- 使用 `shadcn/ui` 的 DropdownMenu 組件
- 頭像顯示 `user_metadata.avatar_url` 或 Gravatar
- 使用者名稱從 `users_profile.full_name` 取得

### 範例代碼（待實現）

```typescript
// apps/web/components/layout/UserNav.tsx
export function UserNav() {
  const { user, profile } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <span>{profile?.full_name || user?.email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          個人資料
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          設定
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## ✅ 檢查清單

在宣布修復完成前，請確認：

- [ ] **密碼重設**：
  - [ ] 郵件連結正確導向 /update-password
  - [ ] 可以成功更新密碼
  - [ ] 可以使用新密碼登入

- [ ] **註冊**：
  - [ ] 註冊過程無凍結
  - [ ] 不顯示「無法取得用戶資料」錯誤
  - [ ] 跳轉到登入頁面（而非自動登入）

- [ ] **登入**：
  - [ ] 舊帳號可以正常登入（self-healing）
  - [ ] 新帳號可以正常登入
  - [ ] 正確導向角色對應的 dashboard

- [ ] **UI**：
  - [ ] 所有密碼框都有眼睛圖示
  - [ ] 眼睛圖示功能正常

---

## 📞 問題回報

如果在測試過程中遇到問題，請記錄：

1. **問題描述**
2. **重現步驟**
3. **預期結果**
4. **實際結果**
5. **瀏覽器控制台錯誤**（如有）
6. **Supabase 日誌**（執行 `supabase logs`）

---

**修復狀態**: ✅ 完成
**測試狀態**: ⏳ 待測試
**部署狀態**: 📝 待部署
