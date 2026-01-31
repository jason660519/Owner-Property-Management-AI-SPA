// filepath: apps/web/app/(auth)/login/page.tsx
/**
 * @file page.tsx
 * @description Login page
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { signInWithPassword, signInWithGoogle, signInWithFacebook } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string().min(8, '密碼至少需要 8 個字元'),
  rememberMe: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })


  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (!result.session) {
        throw new Error('登入失敗，請重試')
      }

      // Get user profile to determine role
      const supabase = createClient()
      const { data: profile, error: profileError } = await supabase
        .from('users_profile')
        .select('role')
        .eq('user_id', result.user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('無法取得用戶資料')
      }

      // Role-based redirect
      switch (profile.role) {
        case 'landlord':
          // Call API to generate transfer token and get redirect URL
          const response = await fetch('/api/auth/generate-transfer-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: result.user.id }),
          })

          if (!response.ok) {
            throw new Error('Failed to generate transfer token')
          }

          const { redirectUrl } = await response.json()
          window.location.href = redirectUrl
          break

        case 'super_admin':
          router.push('/super-admin/dashboard')
          router.refresh()
          break

        case 'tenant':
          router.push('/tenant/dashboard')
          router.refresh()
          break

        case 'agent':
          router.push('/agent/dashboard')
          router.refresh()
          break

        default:
          throw new Error('未知的用戶角色')
      }
    } catch (err: any) {
      setError(err.message || '登入失敗，請檢查您的帳號密碼')
    } finally {
      setIsLoading(false)
    }
  }


  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google 登入失敗')
    }
  }

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook()
    } catch (err: any) {
      setError(err.message || 'Facebook 登入失敗')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <span className="text-white text-3xl font-bold">R</span>
          </div>
        </div>
        <CardTitle className="text-center">歡迎回來</CardTitle>
        <CardDescription className="text-center">登入您的 RESA AI 帳號</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          <Input
            label="電子郵件"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="密碼"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 bg-[#2A2A2A] border-[#333333] rounded text-[#7C3AED] focus:ring-[#7C3AED]"
                {...register('rememberMe')}
              />
              <span className="ml-2 text-sm text-[#999999]">記住我</span>
            </label>

            <Link href="/forgot-password" className="text-sm text-[#7C3AED] hover:text-[#6D28D9]">
              忘記密碼？
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            登入
          </Button>
        </form>

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
              className="flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleFacebookLogin}
              className="flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[#999999]">
          還沒有帳號？{' '}
          <Link href="/register" className="text-[#7C3AED] hover:text-[#6D28D9]">
            立即註冊
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
