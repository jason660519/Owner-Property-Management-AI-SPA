# Password Reset Flow Debugging Analysis

> **創建日期**: 2026-02-03  
> **創建者**: Antigravity  
> **版本**: 1.0  
> **目的**: 分析密碼重設流程問題並提供解決方案

---

## 問題描述

**症狀**: 點擊密碼重設郵件中的連結後，頁面重導向到首頁 (`/`) 而非密碼更新頁面 (`/update-password`)

**預期行為**:

1. 用戶在 `/forgot-password` 輸入 Email
2. 收到重設密碼郵件
3. 點擊郵件中的連結
4. 跳轉到 `/update-password` 頁面
5. 輸入新密碼完成重設

**實際行為**:

1. ✅ 用戶在 `/forgot-password` 輸入 Email
2. ✅ 收到重設密碼郵件
3. ✅ 點擊郵件中的連結
4. ❌ 跳轉到首頁 `/` 而非 `/update-password`

---

## 當前實作分析

### 1. Forgot Password 觸發點

**檔案**: `apps/web/app/(auth)/forgot-password/page.tsx`

```typescript
// Line 48
await resetPassword(data.email);
```

### 2. Reset Password 函數

**檔案**: `apps/web/lib/supabase/auth.ts` (Lines 163-169)

```typescript
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
  });
  if (error) throw error;
  return data;
}
```

**問題分析**:

- ✅ 設定了 `redirectTo` 參數
- ✅ 包含 `next=/update-password` 查詢參數
- ⚠️ 但 Supabase 可能不會保留自定義查詢參數

### 3. Auth Callback Handler

**檔案**: `apps/web/app/auth/callback/route.ts` (Lines 29-61)

```typescript
if (code) {
  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (!exchangeError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 如果有 next 參數，優先使用
    if (next && next !== '/') {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // 否則根據角色重導向到對應的 Dashboard
    if (user) {
      const { data: profile } = await supabase
        .from('users_profile')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role) {
        const dashboardPath = `/${profile.role.replace('_', '-')}/dashboard`;
        return NextResponse.redirect(`${origin}${dashboardPath}`);
      }
    }

    // Fallback 到首頁
    return NextResponse.redirect(`${origin}/`);
  }
}
```

**問題分析**:

- ✅ 有檢查 `next` 參數
- ⚠️ **可能的問題**: Supabase 的 `redirectTo` URL 在 PKCE 流程中可能不會保留查詢參數
- ⚠️ 當 `next` 參數遺失時，會 fallback 到首頁或 Dashboard

---

## 根本原因猜測

### Hypothesis 1: Supabase 沒有保留 `next` 參數

Supabase 的 `resetPasswordForEmail` 使用 PKCE (Proof Key for Code Exchange) 流程：

1. Email 中的連結格式: `http://localhost:3000/auth/callback?token=xxx&type=recovery`
2. **沒有包含** `next=/update-password` 參數

**證據**:

- 根據 Supabase 文檔，`redirectTo` 只指定基礎 URL
- 自定義查詢參數可能不會傳遞到最終的 callback URL

### Hypothesis 2: 需要使用 `type=recovery` 來判斷

在密碼重設流程中，Supabase 會在 URL 加入 `type=recovery` 參數，我們應該檢查這個參數來決定重導向目標。

---

## 解決方案

### Solution 1: 檢查 `type=recovery` 參數 (推薦)

修改 `apps/web/app/auth/callback/route.ts`:

```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const type = searchParams.get('type'); // 新增: 檢查 auth type
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth/Magic Link errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // **新增: 如果是密碼重設流程，直接跳轉到 update-password**
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 如果有 next 參數，優先使用
      if (next && next !== '/') {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // 根據角色重導向
      if (user) {
        const { data: profile } = await supabase
          .from('users_profile')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role) {
          const dashboardPath = `/${profile.role.replace('_', '-')}/dashboard`;
          return NextResponse.redirect(`${origin}${dashboardPath}`);
        }
      }

      return NextResponse.redirect(`${origin}/`);
    }

    console.error('Exchange code error:', exchangeError);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

**優點**:

- ✅ 利用 Supabase 內建的 `type` 參數
- ✅ 不依賴自定義查詢參數
- ✅ 與 Supabase 官方流程一致

### Solution 2: 使用 Session Storage (備選)

如果 Solution 1 不可行，可以在 forgot-password 頁面設定 session storage:

```typescript
// apps/web/app/(auth)/forgot-password/page.tsx
const onSubmit = async (data: ForgotPasswordFormData) => {
  setIsLoading(true);
  setError(null);

  try {
    // 設定 session storage 標記
    sessionStorage.setItem('password_reset_pending', 'true');
    await resetPassword(data.email);
    setSuccess(true);
  } catch (err: any) {
    setError(err.message || '發送重設密碼郵件失敗，請稍後再試');
  } finally {
    setIsLoading(false);
  }
};
```

然後在 callback handler 檢查:

```typescript
// apps/web/app/auth/callback/route.ts
if (!exchangeError) {
  // 檢查是否為密碼重設流程 (client-side check via middleware)
  // 這個方法需要配合 middleware 或 client component
  ...
}
```

**缺點**:

- ❌ 需要額外的 client-side 邏輯
- ❌ 依賴瀏覽器 storage
- ❌ 如果用戶在不同裝置開啟連結會失效

---

## 測試計畫

### Step 1: 手動測試當前流程

```bash
# 1. 啟動開發服務器
cd apps/web && npm run dev

# 2. 訪問 http://localhost:3000/forgot-password
# 3. 輸入測試 Email: a0405142777@gmail.com
# 4. 提交表單

# 5. 檢查 Mailpit
open http://localhost:54324

# 6. 檢查郵件內容，找到實際的重設連結
# 7. 複製完整 URL 並分析查詢參數

# 8. 點擊連結並觀察重導向行為
```

### Step 2: 檢查郵件 URL 結構

預期的 URL 格式:

```
# Supabase PKCE 流程
http://localhost:3000/auth/callback?token=xxx&type=recovery

# 或
http://localhost:3000/auth/callback?code=xxx&type=recovery
```

### Step 3: 實施 Solution 1 並測試

1. 修改 `apps/web/app/auth/callback/route.ts`
2. 重新測試密碼重設流程
3. 確認 `type=recovery` 參數存在
4. 確認重導向到 `/update-password`

### Step 4: E2E 測試

使用 Playwright 自動化測試完整流程。

---

## 預期結果

實施 Solution 1 後:

1. ✅ 用戶輸入 Email → 收到重設郵件
2. ✅ 點擊郵件連結 → 跳轉到 `/auth/callback?code=xxx&type=recovery`
3. ✅ Callback 檢測到 `type=recovery` → 重導向到 `/update-password`
4. ✅ 用戶輸入新密碼 → 密碼更新成功
5. ✅ 自動跳轉到登入頁面

---

## 下一步行動

1. **立即執行**: 手動測試並檢查郵件 URL 結構
2. **確認假設**: 驗證 `type=recovery` 參數是否存在
3. **實施修復**: 應用 Solution 1 修改 callback handler
4. **測試驗證**: 完整測試密碼重設流程
5. **文檔更新**: 記錄修復過程與結果

---

## 參考資料

- [Supabase Auth - Password Reset](https://supabase.com/docs/guides/auth/passwords)
- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/server-side-rendering)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
