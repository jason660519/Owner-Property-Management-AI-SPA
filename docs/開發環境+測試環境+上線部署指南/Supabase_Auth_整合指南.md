# Supabase Auth 整合指南

> **創建日期**: 2026-01-31  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-01-31  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 實作指引

---

## 📋 目標

本指南提供開發者完整的 Supabase Auth 整合步驟，包含環境配置、程式碼實作、測試驗證。

**預期結果**:
- ✅ 完成 Supabase Client 配置
- ✅ 實作登入/註冊功能
- ✅ 實作 Session 管理與 Token 刷新
- ✅ 實作路由守衛 (Protected Routes)

---

## 一、環境配置

### 1.1 安裝依賴

```bash
# 進入 Web 專案目錄
cd apps/web

# 安裝 Supabase Client
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# 安裝表單驗證工具
npm install react-hook-form zod @hookform/resolvers

# 安裝 UI 工具 (可選)
npm install lucide-react
```

### 1.2 環境變數配置

**檔案**: `apps/web/.env.local`

```bash
# Supabase 連線資訊
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# 服務端專用 (僅用於 Server Components / API Routes)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# 網站 URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**⚠️ 注意**: 
- 本地開發使用上述金鑰
- 生產環境需從 Supabase Dashboard 取得實際金鑰
- 請勿將 `SUPABASE_SERVICE_ROLE_KEY` 暴露至前端

---

## 二、Supabase Client 配置

### 2.1 建立 Client 實例

**檔案**: `apps/web/lib/supabase/client.ts`

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// 前端組件使用 (自動處理 Cookie)
export const createSupabaseClient = () => {
  return createClientComponentClient<Database>();
};

// 通用 Client (需手動傳入 Token)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
```

### 2.2 Server Component Client

**檔案**: `apps/web/lib/supabase/server.ts`

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// Server Component 專用
export const createSupabaseServerClient = () => {
  return createServerComponentClient<Database>({ cookies });
};
```

### 2.3 Middleware Client

**檔案**: `apps/web/lib/supabase/middleware.ts`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

export const createSupabaseMiddlewareClient = (req: NextRequest, res: NextResponse) => {
  return createMiddlewareClient<Database>({ req, res });
};
```

---

## 三、認證 API 封裝

### 3.1 認證函數

**檔案**: `apps/web/lib/supabase/auth.ts`

```typescript
import { supabase } from './client';
import type { SignUpData, SignInData } from '@/types/auth';

/**
 * 註冊新用戶
 */
export async function signUp(data: SignUpData) {
  const { email, password, fullName, role } = data;

  // 1. 註冊 Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  // 2. 創建 users_profile 記錄
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('users_profile')
      .insert({
        user_id: authData.user.id,
        email: email,
        full_name: fullName,
        role: role,
      });

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      // 不拋出錯誤，因為 Auth 註冊已成功
    }
  }

  return authData;
}

/**
 * Email + 密碼登入
 */
export async function signIn(data: SignInData) {
  const { email, password } = data;

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return authData;
}

/**
 * Google OAuth 登入
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * 登出
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 取得當前 Session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * 取得當前用戶
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

/**
 * 取得當前用戶的角色
 */
export async function getUserRole() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('users_profile')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Failed to get user role:', error);
    return null;
  }

  return data.role;
}

/**
 * 重設密碼 (發送郵件)
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 更新密碼
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}
```

---

## 四、React Hooks

### 4.1 useAuth Hook

**檔案**: `apps/web/hooks/useAuth.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    // 取得初始 Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 監聽認證狀態變化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // 刷新 Server Components
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return {
    user,
    session,
    loading,
  };
}
```

### 4.2 useRequireAuth Hook (路由守衛)

**檔案**: `apps/web/hooks/useRequireAuth.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useRequireAuth(redirectUrl = '/login') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectUrl);
    }
  }, [user, loading, router, redirectUrl]);

  return { user, loading };
}
```

### 4.3 useRequireRole Hook (角色守衛)

**檔案**: `apps/web/hooks/useRequireRole.ts`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { getUserRole } from '@/lib/supabase/auth';

type Role = 'super_admin' | 'landlord' | 'tenant' | 'agent';

export function useRequireRole(requiredRole: Role | Role[], redirectUrl = '/unauthorized') {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    getUserRole().then((userRole) => {
      setRole(userRole as Role);
      setLoading(false);

      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      if (userRole && !allowedRoles.includes(userRole as Role)) {
        router.push(redirectUrl);
      }
    });
  }, [user, authLoading, requiredRole, router, redirectUrl]);

  return { user, role, loading };
}
```

---

## 五、路由守衛 (Middleware)

### 5.1 Middleware 配置

**檔案**: `apps/web/middleware.ts`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 刷新 Session (重要！)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 保護需要認證的路由
  const protectedPaths = [
    '/landlord',
    '/super-admin',
    '/tenant',
    '/agent',
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !session) {
    // 未登入，重定向至登入頁
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 角色檢查 (可選)
  if (session && isProtectedPath) {
    const { data: profile } = await supabase
      .from('users_profile')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    // 根據路徑檢查角色
    if (req.nextUrl.pathname.startsWith('/super-admin') && profile?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (req.nextUrl.pathname.startsWith('/landlord') && profile?.role !== 'landlord') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // 其他角色檢查...
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## 六、表單驗證

### 6.1 Zod Schemas

**檔案**: `apps/web/lib/validators/auth.ts`

```typescript
import { z } from 'zod';

// 密碼規則
export const passwordSchema = z
  .string()
  .min(8, '密碼至少需要 8 個字元')
  .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
  .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
  .regex(/[0-9]/, '密碼必須包含至少一個數字');

// 註冊表單
export const signUpSchema = z
  .object({
    email: z.string().email('請輸入有效的 Email 地址'),
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, '姓名至少需要 2 個字元'),
    role: z.enum(['landlord', 'tenant', 'agent'], {
      errorMap: () => ({ message: '請選擇角色' }),
    }),
    phone: z.string().optional(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: '請同意服務條款',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼不一致',
    path: ['confirmPassword'],
  });

// 登入表單
export const signInSchema = z.object({
  email: z.string().email('請輸入有效的 Email 地址'),
  password: z.string().min(1, '請輸入密碼'),
  rememberMe: z.boolean().optional(),
});

// 忘記密碼表單
export const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的 Email 地址'),
});

// 重設密碼表單
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼不一致',
    path: ['confirmPassword'],
  });

// TypeScript 型別導出
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
```

---

## 七、頁面實作範例

### 7.1 登入頁面

**檔案**: `apps/web/app/(auth)/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signIn, signInWithGoogle } from '@/lib/supabase/auth';
import { signInSchema, type SignInFormData } from '@/lib/validators/auth';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    setError(null);

    try {
      await signIn(data);
      router.push('/dashboard'); // 或根據角色導向
      router.refresh();
    } catch (err: any) {
      setError(err.message || '登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">登入</h2>
          <p className="mt-2 text-center text-gray-600">
            歡迎回到房東物件管理平台
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email 地址
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密碼
            </label>
            <input
              {...register('password')}
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                記住我
              </label>
            </div>

            <Link
              href="/forgot-password"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              忘記密碼？
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">或</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="mt-6 w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              {/* Google Icon */}
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 登入
          </button>
        </div>

        <p className="text-center text-sm text-gray-600">
          還沒有帳號？{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-500">
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### 7.2 註冊頁面

**檔案**: `apps/web/app/(auth)/register/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { signUp } from '@/lib/supabase/auth';
import { signUpSchema, type SignUpFormData } from '@/lib/validators/auth';

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    setError(null);

    try {
      await signUp(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || '註冊失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">註冊成功！</h2>
          <p className="text-gray-600 mb-6">
            我們已發送驗證郵件至您的信箱，請點擊郵件中的連結完成驗證。
          </p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            前往登入
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">註冊帳號</h2>
          <p className="mt-2 text-center text-gray-600">
            開始管理您的房產
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              姓名
            </label>
            <input
              {...register('fullName')}
              type="text"
              id="fullName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email 地址
            </label>
            <input
              {...register('email')}
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              我是
            </label>
            <select
              {...register('role')}
              id="role"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">請選擇</option>
              <option value="landlord">房東</option>
              <option value="tenant">租客</option>
              <option value="agent">仲介</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密碼
            </label>
            <input
              {...register('password')}
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              確認密碼
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              {...register('agreeToTerms')}
              id="agreeToTerms"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
              我同意{' '}
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">
                服務條款
              </Link>{' '}
              和{' '}
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">
                隱私政策
              </Link>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '註冊中...' : '註冊'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          已有帳號？{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500">
            立即登入
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 八、測試驗證

### 8.1 手動測試清單

- [ ] **註冊流程**
  - [ ] 填寫註冊表單並提交
  - [ ] 檢查是否收到驗證郵件 (Mailpit: http://localhost:54324)
  - [ ] 點擊驗證連結
  - [ ] 確認 `users_profile` 表有新記錄

- [ ] **登入流程**
  - [ ] 使用 Email + 密碼登入
  - [ ] 確認成功導向儀表板
  - [ ] 檢查 LocalStorage 是否儲存 Session

- [ ] **Token 刷新**
  - [ ] 等待 Token 過期 (或手動清除)
  - [ ] 發送 API 請求
  - [ ] 確認自動刷新 Token

- [ ] **路由守衛**
  - [ ] 未登入訪問 `/landlord/dashboard`
  - [ ] 確認重定向至 `/login`
  - [ ] 登入後訪問不同角色的路徑
  - [ ] 確認角色檢查正常

### 8.2 自動化測試

```bash
# 執行測試 (待實作)
npm run test

# 測試覆蓋率
npm run test:coverage
```

---

## 九、常見問題排查

### Q1: 登入後仍顯示未登入狀態

**原因**: Middleware 未正確刷新 Session

**解決方案**:
```typescript
// middleware.ts
const { data: { session } } = await supabase.auth.getSession(); // 必須呼叫
```

### Q2: RLS 策略導致查詢失敗

**原因**: RLS 策略過於嚴格或缺少必要策略

**解決方案**:
```sql
-- 檢查當前用戶的 UUID
SELECT auth.uid();

-- 暫時停用 RLS 測試
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### Q3: OAuth 重定向失敗

**原因**: `redirectTo` URL 未加入 Supabase 白名單

**解決方案**:
1. 前往 Supabase Dashboard
2. Authentication > URL Configuration
3. 加入 `http://localhost:3000/auth/callback`

---

## 十、下一步

完成本指南後，您可以：

1. ✅ 實作角色導向邏輯 (根據 `users_profile.role` 導向不同儀表板)
2. ✅ 建立受保護的 API Routes
3. ✅ 整合 OAuth (Google, Facebook, Apple)
4. ✅ 實作 MFA (多重身份驗證)
5. ✅ 建立完整的測試套件

---

**文件狀態**: ✅ 完成  
**測試狀態**: ⏳ 待驗證  
**負責人**: 前端開發團隊
