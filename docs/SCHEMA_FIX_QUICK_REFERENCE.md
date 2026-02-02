# Schema Fix Quick Reference

> **日期**: 2026-02-03  
> **創建者**: Antigravity  
> **狀態**: ✅ RESOLVED

---

## 🎯 What Was Fixed

**Problem**: Login failing with "無法取得或創建用戶資料，請聯絡客服"

**Cause**: Frontend using wrong database column names

**Solution**: Updated all code to use correct schema

---

## 📋 Correct Database Schema

### `users_profile` Table

| Column      | Type | Correct Name   | ❌ Old/Wrong Names      |
| :---------- | :--- | :------------- | :---------------------- |
| Primary Key | uuid | `id`           | `user_id`               |
| User Name   | text | `display_name` | `full_name`             |
| User Role   | text | `role`         | `primary_role`, `roles` |

### TypeScript Interface

```typescript
// ✅ CORRECT
interface UserProfile {
  id: string; // NOT user_id
  display_name: string; // NOT full_name
  role: string; // NOT primary_role or roles
  phone?: string;
  id_number_enc?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  display_name?: string; // NOT full_name
  role?: string; // NOT primary_role
}
```

---

## 📁 Files Modified (6 files)

1. `apps/web/app/(auth)/login/page.tsx` - Login flow
2. `apps/web/app/(auth)/register/page.tsx` - Registration
3. `apps/web/app/actions/auth.ts` - Server action
4. `apps/web/app/auth/callback/route.ts` - OAuth callback
5. `apps/web/app/admin/users/actions.ts` - Admin functions
6. `apps/web/__tests__/app/actions/auth.test.ts` - Tests

---

## ✅ Search & Replace Guide

If you need to fix similar issues in the future:

```bash
# Search for old column names
grep -r "user_id" apps/web/app/ --include="*.tsx" --include="*.ts" | grep "users_profile"
grep -r "full_name" apps/web/app/ --include="*.tsx" --include="*.ts" | grep "users_profile"
grep -r "primary_role" apps/web/app/ --include="*.tsx" --include="*.ts" | grep "users_profile"

# Replace patterns
user_id → id
full_name → display_name
primary_role → role
roles (array) → role (single string)
```

---

## 🧪 How to Test

```bash
# 1. Start services
supabase start
cd apps/web && npm run dev

# 2. Test login manually
# Visit: http://localhost:3000/login
# Email: a0405142777@gmail.com
# Password: NewPassword123!

# 3. Run E2E test
cd apps/web
npx playwright test e2e/manual-auth-flow.spec.ts
```

**Expected Result**: ✅ Redirected to `/landlord/dashboard`

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T DO THIS

```typescript
// Wrong column names
.select('primary_role')
.eq('user_id', userId)
.insert({ full_name: name })

// Creating new client after login
const supabase = createClient(); // ❌ auth.uid() will be NULL
await supabase.from('users_profile').select();
```

### ✅ DO THIS

```typescript
// Correct column names
.select('role')
.eq('id', userId)
.insert({ display_name: name })

// Use existing client or user metadata
const userRole = result.user.user_metadata?.role;
```

---

## 📚 Related Documents

- **Full Report**: `docs/progress-reports/BUG_FIX_REPORT_Schema_Mismatch_2026-02-03.md`
- **E2E Test**: `apps/web/e2e/manual-auth-flow.spec.ts`
- **Schema Migration**: `supabase/migrations/*_create_users_profile.sql`

---

## 🔄 Version

- **Created**: 2026-02-03
- **Author**: Antigravity
- **Status**: Production Ready ✅

---

**Quick Check**: If you see errors about "column does not exist" or "duplicate key constraint", verify column names against this document!
