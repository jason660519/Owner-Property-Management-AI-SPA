// filepath: apps/web/lib/validators/auth.ts
/**
 * @file auth.ts
 * @description 認證相關的 Zod 驗證 Schema (密碼、註冊、登入)
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */
import { z } from 'zod';

// 密碼規則
export const passwordSchema = z
  .string()
  .min(8, '密碼至少需要 8 個字元')
  .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
  .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
  .regex(/[0-9]/, '密碼必須包含至少一個數字');

// 註冊表單
export const signUpSchema = z
  .object({
    email: z.string().email('請輸入有效的 Email 地址'),
    password: passwordSchema,
    confirmPassword: z.string(),
    fullName: z.string().min(2, '姓名至少需要 2 個字元'),
    role: z.enum(['landlord', 'tenant', 'agent']),
    phone: z.string().optional(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: '請同意服務條款',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼不一致',
    path: ['confirmPassword'],
  });

// 登入表單
export const signInSchema = z.object({
  email: z.string().email('請輸入有效的 Email 地址'),
  password: z.string().min(1, '請輸入密碼'),
  rememberMe: z.boolean().optional(),
});

// 忘記密碼表單
export const forgotPasswordSchema = z.object({
  email: z.string().email('請輸入有效的 Email 地址'),
});

// 重設密碼表單
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '密碼不一致',
    path: ['confirmPassword'],
  });

// TypeScript 型別導出
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
