'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { resetPassword } from '@/lib/supabase/auth';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validators/auth';

export default function ForgotPasswordPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        mode: 'onBlur',
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            await resetPassword(data.email);
            setStatus('success');
        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || '發送重設連結失敗，請稍後再試');
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-[#7C3AED] rounded-lg flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">R</span>
                    </div>
                </div>
                <CardTitle className="text-center">忘記密碼</CardTitle>
                <CardDescription className="text-center">
                    輸入您的電子郵件地址，我們將發送重設密碼的連結給您。
                </CardDescription>
            </CardHeader>

            <CardContent>
                {status === 'success' ? (
                    <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-400">
                                    請檢查您的信箱
                                </h3>
                                <div className="mt-2 text-sm text-green-300">
                                    <p>
                                        我們已發送密碼重設連結。
                                        請檢查您的收件匣（以及垃圾郵件匣）。
                                    </p>
                                </div>
                                <div className="mt-4">
                                    <Link href="/login" className="text-sm font-medium text-green-400 hover:text-green-300">
                                        &larr; 返回登入頁面
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {status === 'error' && (
                            <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
                                <div className="flex">
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-500">
                                            發送失敗
                                        </h3>
                                        <div className="mt-2 text-sm text-red-400">
                                            <p>{errorMessage}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Input
                            label="電子郵件"
                            type="email"
                            placeholder="your@email.com"
                            error={errors.email?.message}
                            {...register('email')}
                            disabled={status === 'loading'}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={status === 'loading'}
                        >
                            發送重設連結
                        </Button>

                        <div className="text-sm text-center">
                            <Link href="/login" className="font-medium text-[#7C3AED] hover:text-[#6D28D9]">
                                返回登入頁面
                            </Link>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
