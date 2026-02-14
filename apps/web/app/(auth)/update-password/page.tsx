// filepath: apps/web/app/(auth)/update-password/page.tsx
/**
 * @file page.tsx
 * @description Update password page (for password reset)
 * @created 2026-02-03
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-03
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.1
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
import { updatePassword } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import { ROLE_METADATA } from '@/config/roles'
import { canonicalizeRole } from '@/lib/roles'
import Link from 'next/link'

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, '密碼至少需要 8 個字元')
    .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
    .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
    .regex(/[0-9]/, '密碼必須包含至少一個數字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼不一致',
  path: ['confirmPassword'],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const password = watch('password', '')

  const getPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      await updatePassword(data.password)
      setSuccess(true)

      // Determine redirect target based on user's roles (check profile table first, then metadata)
      let redirectPath = '/portal'
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Try profile table first (more reliable since acceptInviteCode writes here)
          const { data: profile } = await supabase
            .from('users_profile')
            .select('roles, primary_role')
            .eq('id', user.id)
            .single()

          const roles: string[] = profile?.roles || user.app_metadata?.roles || user.user_metadata?.roles || []
          const primaryRole = profile?.primary_role || (roles.length === 1 ? roles[0] : null)

          if (roles.includes('super_admin') || roles.length > 1) {
            redirectPath = '/portal'
          } else if (primaryRole) {
            const canonical = canonicalizeRole(primaryRole)
            if (canonical) {
              const meta = ROLE_METADATA.find(r => r.role === canonical)
              if (meta) redirectPath = meta.dashboardPath
            }
          }
        }
      } catch {
        // Fallback to /portal if role resolution fails
      }

      setTimeout(() => {
        router.push(redirectPath)
        router.refresh()
      }, 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '重設密碼失敗，請稍後再試')
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">帳號設定完成！</h3>
          <p className="text-[#999999] mb-6">
            您的密碼已成功設定<br />
            即將為您導向工作區
          </p>
          <p className="text-sm text-[#666666]">
            3 秒後自動跳轉...
          </p>
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
        <CardTitle className="text-center">重設密碼</CardTitle>
        <CardDescription className="text-center">
          請輸入您的新密碼
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
            label="新密碼"
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
            label="確認新密碼"
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

          <Button type="submit" variant="primary" fullWidth loading={isLoading}>
            重設密碼
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-[#7C3AED] hover:text-[#6D28D9]">
            ← 返回登入
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
