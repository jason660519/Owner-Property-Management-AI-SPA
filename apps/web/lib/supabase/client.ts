'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser Client - 用於 Client Components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// 預設匯出的 supabase 實例
export const supabase = createClient();
