'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { signUp } from '@/lib/supabase/auth'
import Link from 'next/link'

const registerSchema = z.object({
  fullName: z.string().min(2, '姓名至少需要 2 個字元'),
  email: z.string().email('請輸入有效的電子郵件地址'),
  password: z.string()
    .min(8, '密碼至少需要 8 個字元')
    .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
    .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
    .regex(/[0-9]/, '密碼必須包含至少一個數字'),
  confirmPassword: z.string(),
  role: z.enum(['landlord', 'tenant', 'buyer']),
  agreeToTerms: z.boolean().refine((val) => val === true, {
    message: '您必須同意服務條款',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: '密碼不一致',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'landlord',
    },
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

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      await signUp({
        email: data.email,
        password: data.password,
        full_name: data.fullName,
        role: data.role,
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.message || '註冊失敗，請稍後再試')
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
          <h3 className="text-xl font-semibold text-white mb-2">註冊成功！</h3>
          <p className="text-[#999999]">
            我們已發送驗證郵件到您的信箱<br />
            請檢查您的電子郵件並點擊驗證連結
          </p>
          <p className="text-sm text-[#666666] mt-4">
            3 秒後自動跳轉到登入頁...
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
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
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
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
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
  )
}
