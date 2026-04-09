'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Handles Supabase Auth redirects that use URL hash (client-only):
 * 1. Success: #access_token=...&type=recovery → set session from hash, redirect to /update-password
 * 2. Error:   #error=access_denied&error_code=otp_expired&... → redirect to /login with message
 */
export function AuthHashErrorHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') return;

    const hash = window.location.hash?.slice(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');

    // Success: recovery (or magic link) with tokens in hash — set session and go to update-password
    if (type === 'recovery' && accessToken) {
      if (!refreshToken) {
        window.history.replaceState(null, '', window.location.pathname);
        router.replace(
          `/login?error=session_failed&message=${encodeURIComponent(
            '重設密碼連結無效或已過期，請重新申請。'
          )}`,
          { scroll: true }
        );
        return;
      }

      const supabase = createClient();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => {
          window.history.replaceState(null, '', window.location.pathname);
          router.replace('/update-password', { scroll: true });
        })
        .catch((err) => {
          window.history.replaceState(null, '', window.location.pathname);
          router.replace(
            `/login?error=session_failed&message=${encodeURIComponent(
              '無法建立登入狀態，請重新申請重設密碼。'
            )}`
          );
        });
      return;
    }

    // Error: auth error in hash (e.g. otp_expired)
    if (!error) return;

    let message = errorDescription?.replace(/\+/g, ' ') ?? error;
    if (errorCode === 'otp_expired' || (error === 'access_denied' && message.toLowerCase().includes('expired'))) {
      message = '重設密碼連結已過期，請重新申請。';
    }

    const search = new URLSearchParams({
      error: errorCode || error,
      message: message,
    });
    router.replace(`/login?${search.toString()}`, { scroll: true });
  }, [pathname, router]);

  return null;
}
