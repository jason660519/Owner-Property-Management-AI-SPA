'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    setIsSigningOut(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: result, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message || '登入失敗');
        return;
      }
      const role = result.user?.user_metadata?.role;
      if (role !== 'super_admin') {
        window.location.href = MAIN_SITE_URL;
        return;
      }
      router.push('/superadmin/dashboard');
      router.refresh();
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">超級管理員登入</h1>
        <p className="text-[#999999] text-sm text-center mb-4">
          僅限 super_admin 角色登入
        </p>
        {reason === 'insufficient_role' && (
          <div className="mb-6 p-4 bg-amber-500/20 text-amber-200 text-sm rounded-lg border border-amber-500/30">
            <p className="mb-2">您目前登入的帳號沒有超級管理員權限，無法進入後台。</p>
            <p className="mb-3">請先登出，再使用具有 super_admin 角色的帳號登入。</p>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full py-2 bg-[#333333] text-white text-sm rounded-lg hover:bg-[#444444] disabled:opacity-50"
            >
              {isSigningOut ? '登出中...' : '登出目前帳號'}
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 bg-[#2A2A2A] border border-[#333333] rounded-xl p-6">
          {error && (
            <div className="bg-red-500/20 text-red-400 text-sm p-3 rounded-lg border border-red-500/30">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#999999] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white placeholder-[#666666] focus:ring-2 focus:ring-[#7C3AED]"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#999999] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#333333] rounded-lg bg-[#1A1A1A] text-white placeholder-[#666666] focus:ring-2 focus:ring-[#7C3AED]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-[#7C3AED] text-white font-medium rounded-lg hover:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SuperadminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
