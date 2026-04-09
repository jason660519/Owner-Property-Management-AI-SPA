'use client';

import { useActionState, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { signInWithPasswordFormAction, type LoginFormState } from './actions';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const returnUrl = useMemo(
    () => searchParams.get('returnUrl') || '/superadmin',
    [searchParams],
  );
  const reason = searchParams.get('reason');
  const urlError = searchParams.get('error');

  const initialState: LoginFormState = { error: null };
  const [state, formAction, isPending] = useActionState(signInWithPasswordFormAction, initialState);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const initialError = useMemo<string | null>(
    () =>
      reason === 'insufficient_role'
        ? '您沒有超級管理員權限，無法存取此後台。'
        : urlError
          ? decodeURIComponent(urlError)
          : null,
    [reason, urlError],
  );
  const error = state.error ?? initialError;

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
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="returnUrl" value={returnUrl} />
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
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={isPending}
            />
            <Input
              label="密碼"
              type="password"
              autoComplete="current-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isPending}
            />
            <Button
              type="submit"
              fullWidth
              isLoading={isPending}
              disabled={isPending}
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
