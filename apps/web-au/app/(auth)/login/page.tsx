// filepath: apps/web-au/app/(auth)/login/page.tsx
/**
 * @file page.tsx
 * @description Login page for AU platform with password and social login
 * @created 2026-03-22
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
import { signInWithGoogle, signInWithApple } from '@/lib/supabase/auth';
import { getUserRoles, signInWithPasswordAction, syncUserRolesToAuthMetadata } from '@/lib/actions/auth';
import { normalizeRoles } from '@/lib/roles';
import Link from 'next/link';

// --- Schemas ---
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// --- Inner component that uses useSearchParams ---
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // --- Password Login Form ---
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const STORAGE_KEY_EMAIL = 'propai_au_remembered_email';

  // Pre-fill email from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL);
    if (savedEmail) {
      reset({ email: savedEmail, password: '', rememberMe: true });
    }
  }, [reset]);

  // Show error/message from URL
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setError(decodeURIComponent(urlMessage));
    } else if (urlError) {
      if (urlError === 'otp_expired') setError('Password reset link has expired. Please request a new one.');
      else setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  // --- Password Login Handler ---
  const LOGIN_TIMEOUT_MS = 20_000;

  const onPasswordLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Login timeout. Please check your connection.')), LOGIN_TIMEOUT_MS)
    );

    const loginFlow = async () => {
      const result = await signInWithPasswordAction(data.email, data.password);

      if (!result.success) {
        setError(result.error ?? 'Login failed, please try again');
        return;
      }

      if (data.rememberMe) {
        localStorage.setItem(STORAGE_KEY_EMAIL, data.email);
      } else {
        localStorage.removeItem(STORAGE_KEY_EMAIL);
      }

      // Get user roles and sync metadata
      const roleResult = await getUserRoles(result.userId);
      const roles = normalizeRoles(roleResult);

      void syncUserRolesToAuthMetadata(result.userId);

      // Redirect to portal
      window.location.href = '/portal';
    };

    try {
      await Promise.race([loginFlow(), timeoutPromise]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed, please check your credentials';
      setError(message);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- OAuth Handlers ---
  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed');
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Apple login failed');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white text-3xl font-bold">P</span>
          </div>
        </div>
        <CardTitle className="text-center">Welcome Back</CardTitle>
        <CardDescription className="text-center">Sign in to your PropAI account</CardDescription>
      </CardHeader>

      <CardContent>
        {/* Error banner */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg mb-4 space-y-2">
            <p className="text-sm text-red-500">{error}</p>
            {(searchParams.get('error') === 'otp_expired' || error.includes('expired')) && (
              <Link href="/forgot-password" university-link className="text-sm text-accent hover:underline block">
                Request new password reset →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onPasswordLogin)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com.au"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-text-muted hover:text-text-primary focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
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
                className="w-4 h-4 bg-bg-tertiary border-border-default rounded text-accent focus:ring-accent"
                {...register('rememberMe')}
              />
              <span className="ml-2 text-sm text-text-muted">Remember me</span>
            </label>

            <Link href="/forgot-password" university-link className="text-sm text-accent hover:text-accent-hover">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            Sign in
          </Button>
        </form>

        {/* OAuth divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-bg-secondary text-text-muted">Or continue with</span>
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
              onClick={handleAppleLogin}
              className="flex items-center justify-center gap-2 bg-black text-white border-transparent hover:bg-gray-900"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.057 10.78c.026 2.404 2.103 3.203 2.126 3.212-.018.06-.33 1.127-1.123 2.247-.686.974-1.397 1.944-2.532 1.964-1.115.02-1.474-.633-2.75-.633-1.277 0-1.673.613-2.732.653-1.097.04-1.914-.928-2.603-1.898-1.41-1.98-2.484-5.59-1.03-8.036.722-1.214 2.023-1.983 3.435-2.003 1.074-.015 2.088.697 2.75.697.662 0 1.884-.863 3.16-.738.534.022 2.035.206 2.998 1.558-.08.048-1.79 1.003-1.77 3.018zM14.91 4.545c.575-.672.96-1.608.854-2.545-.83.033-1.833.532-2.428 1.204-.533.593-.998 1.545-.873 2.454.925.07 1.872-.44 2.447-1.113z" />
              </svg>
              Apple
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent hover:text-accent-hover font-medium">
            Create account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Wrapper with Suspense (required for useSearchParams) ---
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="w-full max-w-md">
          <CardContent>
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
