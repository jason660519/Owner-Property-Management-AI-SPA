'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { updatePassword } from '@/lib/supabase/auth';
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validators/auth';

export default function UpdatePasswordPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        mode: 'onChange',
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

    const onSubmit = async (data: ResetPasswordFormData) => {
        setStatus('loading');
        setErrorMessage('');

        try {
            await updatePassword(data.password);
            setStatus('success');
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (error: any) {
            setStatus('error');
            setErrorMessage(error.message || '更新密碼失敗，請稍後再試');
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
                <CardTitle className="text-center">設定新密碼</CardTitle>
            </CardHeader>

            <CardContent>
                {status === 'success' ? (
                    <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                        <p className="text-green-400 font-medium text-center">
                            密碼更新成功！正在重定向...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {status === 'error' && (
                            <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
                                <p className="text-sm text-red-500 text-center">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <Input
                            label="新密碼"
                            type="password"
                            placeholder="••••••••"
                            error={errors.password?.message}
                            {...register('password')}
                            disabled={status === 'loading'}
                        />

                        {password && (
                            <div className="space-y-2">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-colors ${i < passwordStrength
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
                            type="password"
                            placeholder="••••••••"
                            error={errors.confirmPassword?.message}
                            {...register('confirmPassword')}
                            disabled={status === 'loading'}
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={status === 'loading'}
                        >
                            更新密碼
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}
