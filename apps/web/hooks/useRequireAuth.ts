// filepath: apps/web/hooks/useRequireAuth.ts
/**
 * @file useRequireAuth.ts
 * @description 路由守衛 Hook (未登入自動導向登入頁)
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

// filepath: apps/web/hooks/useRequireAuth.ts
/**
 * @file useRequireAuth.ts
 * @description 路由守衛 Hook (未登入自動導向登入頁)
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

/**
 * 路由守衛 Hook
 * 確保用戶已登入，否則重定向至登入頁
 */
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
