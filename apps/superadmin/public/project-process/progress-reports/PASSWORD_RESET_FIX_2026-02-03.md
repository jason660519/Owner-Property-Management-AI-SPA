# Password Reset Flow Fix - Implementation Report

> **創建日期**: 2026-02-03  
> **創建者**: Antigravity  
> **最後修改**: 2026-02-03  
> **修改者**: Antigravity  
> **版本**: 1.0

---

## 修復摘要

**問題**: 密碼重設郵件連結點擊後重導向到首頁而非 `/update-password` 頁面

**根本原因**: Callback handler 未檢查 Supabase 密碼重設流程的 `type=recovery` 參數

**解決方案**: 在 auth callback route 中優先檢查 `type=recovery` 參數，並在密碼重設流程中直接重導向到 `/update-password`

---

## 修改檔案

### 1. `apps/web/app/auth/callback/route.ts` (MODIFIED)

**修改內容**:

```typescript
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const type = searchParams.get('type'); // ← 新增: 獲取 auth flow type
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // ... error handling ...

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // ← 新增: 優先檢查密碼重設流程
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/update-password`);
      }

      // ... rest of the logic (next parameter, role-based redirect, etc.) ...
    }
  }

  // ... fallback redirect ...
}
```

**重點變更**:

1. **新增 `type` 參數提取**: 從 URL query string 獲取 `type` 值
2. **優先處理密碼重設**: 在所有其他重導向邏輯之前檢查 `type === 'recovery'`
3. **直接重導向**: 密碼重設流程直接跳轉到 `/update-password`，不依賴 `next` 參數

---

## 技術細節

### Supabase Password Reset Flow

Supabase 的密碼重設使用 **PKCE (Proof Key for Code Exchange)** 流程:

1. 用戶在 `/forgot-password` 輸入 Email
2. 呼叫 `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`
3. Supabase 發送郵件，郵件中的連結格式：
   ```
   http://localhost:3000/auth/callback?code=xxx&type=recovery
   ```
4. 用戶點擊連結
5. Next.js callback handler:
   - 檢查 `type=recovery`
   - 使用 `exchangeCodeForSession(code)` 建立 session
   - 重導向到 `/update-password`
6. 用戶輸入新密碼
7. 呼叫 `supabase.auth.updateUser({ password: newPassword })`
8. 完成密碼重設

### 為什麼需要檢查 `type` 而非 `next` 參數？

**原因**: Supabase 的 `redirectTo` URL 不會保留自定義查詢參數

```typescript
// ❌ 這不會生效
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/callback?next=/update-password`,
});
// 實際郵件連結: /auth/callback?code=xxx&type=recovery
// 注意: next=/update-password 參數遺失了！

// ✅ 正確做法: 檢查 Supabase 內建的 type 參數
if (type === 'recovery') {
  return NextResponse.redirect('/update-password');
}
```

---

## 測試計畫

### 手動測試步驟

1. **啟動開發環境**

   ```bash
   cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA

   # 確保 Supabase 執行中
   supabase status

   # 啟動 Next.js dev server
   cd apps/web && npm run dev
   ```

2. **測試密碼重設流程**

   a. 訪問 http://localhost:3000/forgot-password

   b. 輸入測試 Email: `a0405142777@gmail.com`

   c. 點擊「發送重設連結」

   d. 檢查 Mailpit 收件匣: http://localhost:54324

   e. 找到密碼重設郵件並點擊「Reset password」按鈕

   f. **驗證**: 應該跳轉到 http://localhost:3000/update-password

   g. 輸入新密碼 (例如: `TestPassword123!`)

   h. 提交表單

   i. **驗證**: 顯示成功訊息並自動跳轉到登入頁面

   j. 使用新密碼登入

   k. **驗證**: 登入成功並重導向到 Dashboard

3. **驗證檢查點**
   - [ ] 郵件成功發送
   - [ ] 郵件包含重設連結
   - [ ] 點擊連結跳轉到 `/update-password` (NOT `/`)
   - [ ] 更新密碼表單正常顯示
   - [ ] 密碼驗證規則正常運作 (強度指示器)
   - [ ] 新密碼成功儲存
   - [ ] 可用新密碼登入

### 預期 URL 流程

```
1. /forgot-password
   ↓ (提交 Email)

2. /forgot-password (成功訊息)
   ↓ (點擊郵件連結)

3. /auth/callback?code=xxx&type=recovery
   ↓ (檢測到 type=recovery)

4. /update-password  ← 正確！
   ↓ (輸入新密碼)

5. /update-password (成功訊息)
   ↓ (3 秒後自動)

6. /login
```

### E2E 測試 (未來實作)

```typescript
// apps/web/e2e/password-reset-flow.spec.ts
test('password reset flow', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // Check Mailpit for email
  const mailpitResponse = await page.request.get('http://localhost:54324/api/v1/messages');
  const emails = await mailpitResponse.json();
  const resetEmail = emails.items[0];

  // Extract reset link from email
  const resetLink = extractLinkFromEmail(resetEmail.html);

  // Click reset link
  await page.goto(resetLink);

  // Should redirect to /update-password
  await expect(page).toHaveURL('/update-password');

  // Fill new password
  await page.fill('input[name="password"]', 'NewPassword123!');
  await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
  await page.click('button[type="submit"]');

  // Should show success message
  await expect(page.locator('text=密碼重設成功')).toBeVisible();

  // Auto-redirect to login
  await page.waitForURL('/login');

  // Login with new password
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'NewPassword123!');
  await page.click('button[type="submit"]');

  // Should redirect to dashboard
  await expect(page).toHaveURL(/\/.*\/dashboard/);
});
```

---

## 相關檔案

### 未修改檔案 (已驗證正常)

- ✅ `apps/web/app/(auth)/forgot-password/page.tsx` - 觸發密碼重設
- ✅ `apps/web/app/(auth)/update-password/page.tsx` - 更新密碼 UI
- ✅ `apps/web/lib/supabase/auth.ts` - `resetPassword()` 和 `updatePassword()` 函數

### 配置檔案

- `supabase/config.toml` - Supabase 本地配置
  - `site_url = "http://127.0.0.1:3000"` - 應用 URL
  - `enable_confirmations = false` - 不需要郵件確認
  - Email rate limit: 2 emails/hour (本地開發)

---

## 已知限制

1. **本地開發郵件限制**: Supabase 本地環境限制每小時 2 封郵件（`auth.rate_limit.email_sent = 2`）
2. **Mailpit 郵件保留**: 僅在記憶體中，重啟 Supabase 會遺失
3. **密碼要求**: 目前最低 6 字元（`minimum_password_length = 6`），前端驗證更嚴格 (8 字元 + 大小寫 + 數字)

---

## 後續工作

- [ ] 編寫 E2E 測試 (`apps/web/e2e/password-reset-flow.spec.ts`)
- [ ] 測試不同情境:
  - [ ] 無效的重設連結 (過期 token)
  - [ ] 重複使用相同重設連結
  - [ ] 密碼不符合強度要求
  - [ ] 網路錯誤處理
- [ ] 更新文檔 (`docs/SCHEMA_FIX_QUICK_REFERENCE.md` - 新增密碼重設流程)
- [ ] 生產環境配置:
  - [ ] 設定 SMTP 郵件服務
  - [ ] 調整 Email rate limit
  - [ ] 自定義郵件範本

---

## 參考資料

- [Supabase Auth - Password Reset](https://supabase.com/docs/guides/auth/passwords#reset-password)
- [Supabase PKCE Flow](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## Commit 訊息

```bash
[Antigravity] fix(auth): redirect to update-password page after reset link click

- Add type=recovery parameter check in auth callback handler
- Prioritize password reset flow over other redirect logic
- Fixes issue where reset link redirected to home page instead of /update-password

Closes: Password reset flow bug
```
