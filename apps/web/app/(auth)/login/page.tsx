// filepath: apps/web/app/(auth)/login/page.tsx
/**
 * @file page.tsx
 * @description Login page with password login AND invite-code login modes
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-13
 * @modifiedBy Claude Opus 4.6
 * @version 1.2
 *
 * v1.2 — Added invite-code login mode (email + 8-digit code)
 * v1.1 — Removed plaintext password storage in localStorage
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { signInWithGoogle, signInWithFacebook } from '@/lib/supabase/auth';
import { acceptInviteCode, getUserRoles, signInWithPasswordAction } from '@/app/actions/auth';
import Link from 'next/link';

// --- Schemas ---
const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(8, '密碼至少需要 8 個字元'),
  rememberMe: z.boolean().optional(),
});

const inviteSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  inviteCode: z
    .string()
    .length(8, '邀請碼必須為 8 位數字')
    .regex(/^\d{8}$/, '邀請碼必須為 8 位數字'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type InviteFormData = z.infer<typeof inviteSchema>;

// --- Inner component that uses useSearchParams ---
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect invite mode from URL params
  const urlMode = searchParams.get('mode');
  const urlEmail = searchParams.get('email') || '';

  const [isInviteMode, setIsInviteMode] = useState(urlMode === 'invite');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // --- Password Login Form ---
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // --- Invite Code Form ---
  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    setValue: setInviteValue,
    formState: { errors: inviteErrors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: urlEmail, inviteCode: '' },
  });

  const STORAGE_KEY_EMAIL = 'opm_remembered_email';

  // Pre-fill email from URL or localStorage
  useEffect(() => {
    if (urlEmail) {
      setInviteValue('email', decodeURIComponent(urlEmail));
    }
    const savedEmail =
      localStorage.getItem(STORAGE_KEY_EMAIL) || localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      resetLogin({ email: savedEmail, password: '', rememberMe: true });
    }
    // Cleanup legacy keys
    localStorage.removeItem('rememberedPassword');
    localStorage.removeItem('opm_remembered_password');
  }, [resetLogin, setInviteValue, urlEmail]);

  // Sync mode with URL param changes
  useEffect(() => {
    setIsInviteMode(urlMode === 'invite');
  }, [urlMode]);

  // Show error/message from URL (e.g. redirect from auth hash: otp_expired, access_denied)
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setError(decodeURIComponent(urlMessage));
    } else if (urlError) {
      if (urlError === 'otp_expired') setError('重設密碼連結已過期，請重新申請。');
      else setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  // --- Password Login Handler ---
  const onPasswordLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithPasswordAction(data.email, data.password);

      if (!result.success) {
        setError(result.error);
        return;
      }
      if (!result.userId) {
        setError('登入失敗，請重試');
        return;
      }

      if (data.rememberMe) {
        localStorage.setItem(STORAGE_KEY_EMAIL, data.email);
      } else {
        localStorage.removeItem(STORAGE_KEY_EMAIL);
      }
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      localStorage.removeItem('opm_remembered_password');

      // Use IAM (getUserRoles RPC) as single source of truth for redirect decision
      const roleResult = await getUserRoles(result.userId);
      const roles = roleResult.success && Array.isArray(roleResult.roles) ? roleResult.roles : [];
      const userRole = roles[0] || 'landlord';

      if (roles.includes('super_admin') || roles.length > 1) {
        router.push('/portal');
        return;
      }

      const currentOrigin = window.location.origin;
      const isLocalhost3000 = currentOrigin.includes('localhost:3000');
      const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

      switch (userRole) {
        case 'landlord':
          isLocalhost3000
            ? (router.push('/landlord/dashboard'), router.refresh())
            : (window.location.href = `${mainSiteUrl}/landlord/dashboard`);
          break;
        case 'agent':
          isLocalhost3000
            ? (router.push('/agent/dashboard'), router.refresh())
            : (window.location.href = `${mainSiteUrl}/agent/dashboard`);
          break;
        default:
          isLocalhost3000
            ? (router.push('/landlord/dashboard'), router.refresh())
            : (window.location.href = `${mainSiteUrl}/landlord/dashboard`);
          break;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '登入失敗，請檢查您的帳號密碼';
      setError(message);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Invite Code Login Handler ---
  const onInviteLogin = async (data: InviteFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptInviteCode(data.email, data.inviteCode);

      if (!result.success) {
        setError(result.error || '驗證失敗');
        return;
      }

      // Redirect to set password page (industry best practice)
      // After setting password, user will be redirected to their role dashboard
      router.push('/update-password');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '系統錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  // --- OAuth Handlers ---
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google 登入失敗');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Facebook 登入失敗');
    }
  };

  // --- Toggle Mode ---
  const toggleMode = () => {
    setError(null);
    setIsInviteMode((prev) => !prev);
  };

  return (
    <Card>
      <CardHeader>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#999999] hover:text-[#7C3AED] transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          回首頁
        </Link>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <span className="text-white text-3xl font-bold">R</span>
          </div>
        </div>
        <CardTitle className="text-center">
          {isInviteMode ? '接受邀請' : '歡迎回來'}
        </CardTitle>
        <CardDescription className="text-center">
          {isInviteMode
            ? '輸入您的 Email 和 8 位數邀請碼'
            : '登入您的 RESA AI 帳號'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Error banner */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg mb-4 space-y-2">
            <p className="text-sm text-red-500">{error}</p>
            {(searchParams.get('error') === 'otp_expired' || error.includes('過期')) && (
              <Link href="/forgot-password" className="text-sm text-[#7C3AED] hover:underline block">
                重新申請重設密碼 →
              </Link>
            )}
          </div>
        )}

        {/* ===== INVITE CODE MODE ===== */}
        {isInviteMode ? (
          <form onSubmit={handleInviteSubmit(onInviteLogin)} className="space-y-4">
            <Input
              label="電子郵件"
              type="email"
              placeholder="your@email.com"
              error={inviteErrors.email?.message}
              {...registerInvite('email')}
            />

            <Input
              label="8 位數邀請碼"
              type="text"
              inputMode="numeric"
              placeholder="12345678"
              maxLength={8}
              error={inviteErrors.inviteCode?.message}
              {...registerInvite('inviteCode')}
            />

            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              驗證邀請碼
            </Button>

            <p className="text-center text-sm text-[#999999] mt-4">
              已有帳號？{' '}
              <button
                type="button"
                onClick={toggleMode}
                className="text-[#7C3AED] hover:text-[#6D28D9] underline"
              >
                使用密碼登入
              </button>
            </p>
          </form>
        ) : (
          /* ===== PASSWORD LOGIN MODE ===== */
          <>
            <form onSubmit={handleLoginSubmit(onPasswordLogin)} className="space-y-4">
              <Input
                label="電子郵件"
                type="email"
                placeholder="your@email.com"
                error={loginErrors.email?.message}
                {...registerLogin('email')}
              />

              <Input
                label="密碼"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={loginErrors.password?.message}
                {...registerLogin('password')}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-white focus:outline-none"
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 bg-[#2A2A2A] border-[#333333] rounded text-[#7C3AED] focus:ring-[#7C3AED]"
                    {...registerLogin('rememberMe')}
                  />
                  <span className="ml-2 text-sm text-[#999999]">記住我</span>
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm text-[#7C3AED] hover:text-[#6D28D9]"
                >
                  忘記密碼？
                </Link>
              </div>

              <Button type="submit" variant="primary" fullWidth loading={isLoading}>
                登入
              </Button>
            </form>

            {/* OAuth divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#333333]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-[#1A1A1A] text-[#999999]">或使用社群帳號登入</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFacebookLogin}
                  className="flex items-center justify-center gap-2 bg-[#1877F2] text-white border-transparent hover:bg-[#166fe5]"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </Button>
              </div>
            </div>

            {/* Invite code toggle + Register */}
            <div className="mt-6 space-y-2 text-center text-sm text-[#999999]">
              <p>
                收到邀請碼？{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[#7C3AED] hover:text-[#6D28D9] underline"
                >
                  使用邀請碼登入
                </button>
              </p>
              <p>
                還沒有帳號？{' '}
                <Link href="/register" className="text-[#7C3AED] hover:text-[#6D28D9]">
                  立即註冊
                </Link>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Wrapper with Suspense (required for useSearchParams) ---
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent>
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
