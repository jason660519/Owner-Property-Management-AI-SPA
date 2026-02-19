// filepath: apps/web/app/(auth)/register/page.tsx
/**
 * @file page.tsx
 * @description Register page
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { signUpWithRole } from '@/lib/actions/auth';
import Link from 'next/link';

const registerSchema = z
  .object({
    fullName: z.string().min(2, '姓名至少需要 2 個字元'),
    email: z.string().email('請輸入有效的電子郵件地址'),
    password: z
      .string()
      .min(8, '密碼至少需要 8 個字元')
      .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
      .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
      .regex(/[0-9]/, '密碼必須包含至少一個數字'),
    confirmPassword: z.string(),
    role: z.enum(['landlord', 'tenant', 'buyer']),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: '您必須同意服務條款',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼不一致',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      role: 'landlord',
    },
  });

  const password = watch('password', '');

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signUpWithRole({
        email: data.email,
        password: data.password,
        display_name: data.fullName,
        role: data.role,
      });

      if (result.success) {
        setSuccess(true);
        // 延長等待時間，讓用戶有時間閱讀成功訊息
        setTimeout(() => {
          router.push('/login');
          router.refresh(); // 刷新頁面以清除任何快取
        }, 3000);
      } else {
        setError(result.error || '註冊失敗，請稍後再試');
      }
    } catch (err: any) {
      setError(err.message || '註冊失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">註冊成功！</h3>
          <p className="text-[#999999]">
            您的帳號已成功建立
            <br />
            現在可以使用您的帳號密碼登入
          </p>
          <p className="text-sm text-[#666666] mt-4">3 秒後將跳轉到登入頁面...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <span className="text-white text-3xl font-bold">R</span>
          </div>
        </div>
        <CardTitle className="text-center">建立您的帳號</CardTitle>
        <CardDescription className="text-center">開始使用 RESA AI 管理您的物件</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Input
            label="姓名"
            type="text"
            placeholder="您的姓名"
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          <Input
            label="電子郵件"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="密碼"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-white focus:outline-none"
                aria-label="toggle password visibility"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength
                        ? passwordStrength <= 2
                          ? 'bg-red-500'
                          : passwordStrength <= 3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        : 'bg-[#333333]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-[#999999]">
                密碼強度：
                {passwordStrength <= 2 && '弱'}
                {passwordStrength === 3 && '中等'}
                {passwordStrength === 4 && '強'}
                {passwordStrength === 5 && '非常強'}
              </p>
            </div>
          )}

          <Input
            label="確認密碼"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            rightElement={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-gray-400 hover:text-white focus:outline-none"
                aria-label="toggle confirm password visibility"
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              帳號類型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'landlord', label: '房東' },
                { value: 'tenant', label: '租客' },
                { value: 'buyer', label: '買家' },
              ].map((option) => (
                <label key={option.value} className="relative">
                  <input
                    type="radio"
                    value={option.value}
                    {...register('role')}
                    className="peer sr-only"
                  />
                  <div className="p-3 border border-[#333333] rounded-lg text-center cursor-pointer transition-colors peer-checked:border-[#7C3AED] peer-checked:bg-[#7C3AED]/10 hover:border-[#7C3AED]/50">
                    <span className="text-sm text-white">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 bg-[#2A2A2A] border-[#333333] rounded text-[#7C3AED] focus:ring-[#7C3AED]"
              {...register('agreeToTerms')}
            />
            <span className="text-sm text-[#999999]">
              我同意{' '}
              <Link href="/terms" className="text-[#7C3AED] hover:text-[#6D28D9]">
                服務條款
              </Link>{' '}
              和{' '}
              <Link href="/privacy" className="text-[#7C3AED] hover:text-[#6D28D9]">
                隱私政策
              </Link>
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-500">{errors.agreeToTerms.message}</p>
          )}

          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            註冊
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[#999999]">
          已經有帳號了？{' '}
          <Link href="/login" className="text-[#7C3AED] hover:text-[#6D28D9]">
            立即登入
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
