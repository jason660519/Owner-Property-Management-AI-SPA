'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser Client - 用於 Client Components
export function createClient() {
  // 開發模式：使用 sessionStorage 允許多帳號同時登入（不同分頁）
  // 生產模式：使用 localStorage 保持 session（重新整理不登出）
  const useSessionStorage = process.env.NEXT_PUBLIC_MULTI_ACCOUNT_MODE === 'true';

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    useSessionStorage
      ? {
          auth: {
            storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
            persistSession: true,
          },
        }
      : undefined
  );
}

// 預設匯出的 supabase 實例
export const supabase = createClient();
