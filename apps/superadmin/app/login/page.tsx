'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { createClient } from '@/utils/supabase/client';
import { loginAction } from './actions';
import Link from 'next/link';

export default function SuperadminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirectTo');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Auto-fill email from localStorage if available
  useEffect(() => {
    const savedEmail = localStorage.getItem('opm_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    setIsSigningOut(false);
  };

  const validateReturnUrl = (url: string | null): string => {
    if (!url) return '/superadmin';
    
    try {
      // If it's a relative URL, it's safe (starts with /)
      if (url.startsWith('/')) {
        return url;
      }
      
      // If it's an absolute URL, check the origin
      const parsedUrl = new URL(url);
      const currentOrigin = window.location.origin;
      
      if (parsedUrl.origin === currentOrigin) {
        return url;
      }
      
      // If domain doesn't match, fallback to dashboard
      console.warn('Blocked redirect to external domain:', url);
      return '/superadmin';
    } catch (e) {
      console.error('Invalid return URL:', url);
      return '/superadmin';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    if (returnUrl) formData.append('returnUrl', returnUrl);

    try {
      const result = await loginAction(null, formData);

      if (!result.success) {
        if (result.targetOrigin && result.error === '您的帳號沒有超級管理員權限') {
           // Insufficient role case - redirect to main site
           window.location.href = result.targetOrigin;
           return;
        }
        setError(result.error || '登入失敗，請檢查您的帳號密碼');
        return;
      }

      // Valid Superadmin login
      if (rememberMe) {
        localStorage.setItem('opm_remembered_email', email);
      } else {
        localStorage.removeItem('opm_remembered_email');
      }

      // Determine redirect target
      const validatedUrl = validateReturnUrl(returnUrl);
      
      // Use window.location.href with the targetOrigin from backend if possible, 
      // or just use validatedUrl if it's relative/same-origin.
      // The requirement says: "return targetOrigin... avoid hard-code... use window.location.href = validatedReturnUrl"
      // But also "ensure... stay on localhost:3001".
      // If validatedUrl is relative, browser uses current origin (3001).
      // If we want to be explicit, we can prepend result.targetOrigin.
      
      if (result.targetOrigin && validatedUrl.startsWith('/')) {
          const target = new URL(validatedUrl, result.targetOrigin);
          window.location.href = target.toString();
      } else {
          window.location.href = validatedUrl;
      }

    } catch (err: any) {
      setError(err.message || '連線失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link
            href={mainSiteUrl}
            className="inline-flex items-center gap-2 text-sm text-[#999999] hover:text-[#7C3AED] transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            回主站首頁
          </Link>
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#7C3AED] rounded-lg flex items-center justify-center">
              <span className="text-white text-3xl font-bold">R</span>
            </div>
          </div>
          <CardTitle className="text-center">超級管理員登入</CardTitle>
          <CardDescription className="text-center">僅限 super_admin 角色登入</CardDescription>
        </CardHeader>

        <CardContent>
          {reason === 'insufficient_role' && (
            <div className="mb-6 p-4 bg-amber-500/20 text-amber-200 text-sm rounded-lg border border-amber-500/30">
              <p className="mb-2">您目前登入的帳號沒有超級管理員權限，無法進入後台。</p>
              <p className="mb-3">請先登出，再使用具有 super_admin 角色的帳號登入。</p>
              <Button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                variant="secondary"
                fullWidth
                isLoading={isSigningOut}
              >
                登出目前帳號
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <Input
              label="電子郵件"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              disabled={isLoading}
            />

            <Input
              label="密碼"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              disabled={isLoading}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 bg-[#2A2A2A] border-[#333333] rounded text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="ml-2 text-sm text-[#999999]">記住我</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              fullWidth
              variant="primary"
              isLoading={isLoading}
            >
              登入
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
