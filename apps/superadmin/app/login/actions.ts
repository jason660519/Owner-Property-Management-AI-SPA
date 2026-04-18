'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export type SignInResult =
  | { success: true; userId: string }
  | { success: false; error: string };

function normalizeSignInEmail(raw: string): string {
  return raw.replace(/\u00a0/g, ' ').trim().toLowerCase();
}

/**
 * 管理員登入：以 email/密碼設定 session cookie，與 middleware 共用同一 cookie。
 */
export async function signInWithPasswordAction(
  email: string,
  password: string
): Promise<SignInResult> {
  try {
    const supabase = await createClient();
    const normalizedEmail = normalizeSignInEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const isDev = process.env.NODE_ENV === 'development';
      const msg = isDev
        ? (error.message?.includes('unexpected response') || error.message?.includes('Unexpected response')
            ? '登入被拒絕。請確認密碼是否正確；本機請確認 Supabase 已啟動且 Auth 已啟用 Email 登入。'
            : String(error.message ?? '登入失敗'))
        : '登入失敗，請確認帳號與密碼是否正確。';
      return { success: false, error: msg };
    }
    if (!data?.session || !data?.user?.id) {
      return { success: false, error: '登入失敗，未取得 session。' };
    }
    return { success: true, userId: String(data.user.id) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : '登入失敗，請稍後再試。';
    console.error('[login] signInWithPasswordAction error:', e);
    return { success: false, error: String(msg) };
  }
}

export type LoginFormState = { error: string | null };

export async function signInWithPasswordFormAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = normalizeSignInEmail(String(formData.get('email') ?? ''));
  const password = String(formData.get('password') ?? '');
  const returnUrl = String(formData.get('returnUrl') ?? '/superadmin');

  if (!email || !password) {
    return { error: '請輸入電子郵件與密碼。' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const isDev = process.env.NODE_ENV === 'development';
    const msg = isDev
      ? (error.message?.includes('unexpected response') || error.message?.includes('Unexpected response')
          ? '登入被拒絕。請確認密碼是否正確；本機請確認 Supabase 已啟動且 Auth 已啟用 Email 登入。'
          : String(error.message ?? '登入失敗'))
      : '登入失敗，請確認帳號與密碼是否正確。';
    return { error: msg };
  }
  if (!data?.session || !data?.user?.id) {
    return { error: '登入失敗，未取得 session。' };
  }

  redirect(returnUrl);
}
