// filepath: apps/web/app/(auth)/forgot-password/page.tsx
/**
 * @file page.tsx
 * @description Forgot password page
 * @created 2026-02-03
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-03
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { resetPasswordForUser } from '@/app/actions/auth'
import Link from 'next/link'

const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的電子郵件地址'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await resetPasswordForUser(data.email)
      if (!result.success) {
        setError(result.error || '發送重設密碼郵件失敗，請稍後再試')
        return
      }
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '發送重設密碼郵件失敗，請稍後再試')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">郵件已發送！</h3>
          <p className="text-[#999999] mb-6">
            我們已經發送重設密碼的連結到您的電子郵件<br />
            請檢查您的信箱並點擊連結來重設密碼
          </p>
          <Link href="/login">
            <Button variant="outline" fullWidth>
              返回登入頁面
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>
        <CardTitle className="text-center">忘記密碼</CardTitle>
        <CardDescription className="text-center">
          輸入您的電子郵件地址，我們將發送重設密碼的連結給您
        </CardDescription>
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

          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            發送重設連結
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-[#7C3AED] hover:text-[#6D28D9]">
            ← 返回登入
          </Link>
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
