'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { signInWithPasswordAction } from './actions';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/superadmin';
  const reason = searchParams.get('reason');
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === 'insufficient_role'
      ? '您沒有超級管理員權限，無法存取此後台。'
      : urlError
        ? decodeURIComponent(urlError)
        : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('請輸入電子郵件與密碼。');
      return;
    }
    setIsLoading(true);
    try {
      const result = await signInWithPasswordAction(email.trim(), password);
      if (result.success) {
        router.push(returnUrl);
        router.refresh();
        return;
      }
      setError(result.error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <Card variant="outlined" padding="lg" className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-text-primary">
            管理員登入
          </CardTitle>
          <p className="text-sm text-text-muted mt-1">
            請使用具超級管理員權限的帳號登入
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400"
                role="alert"
              >
                {error}
              </div>
            )}
            <Input
              label="電子郵件"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isLoading}
            />
            <Input
              label="密碼"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading}
              className="mt-2"
            >
              登入
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
