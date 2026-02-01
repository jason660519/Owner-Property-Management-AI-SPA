// filepath: apps/mobile/src/screens/auth/RegisterScreen.tsx
/**
 * @file RegisterScreen.tsx
 * @description Registration screen for Expo app
 * @created 2026-02-01
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-01
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { signUp } from '../../lib/supabase';

export default function RegisterScreen({ onNavigateToLogin }: { onNavigateToLogin: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!email || !password || !confirmPassword || !fullName) {
            setError('請填寫所有欄位');
            return;
        }

        if (password !== confirmPassword) {
            setError('密碼不一致');
            return;
        }

        if (password.length < 8) {
            setError('密碼至少需要 8 個字元');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await signUp(email, password);

        if (!result.success) {
            setError(result.error || '註冊失敗，請稍後再試');
            setIsLoading(false);
        } else {
            setSuccess(true);
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <View className="flex-1 bg-bg-primary justify-center px-6">
                <View className="items-center">
                    <View className="w-16 h-16 bg-green-500 rounded-full items-center justify-center mb-4">
                        <Text className="text-white text-3xl">✓</Text>
                    </View>
                    <Text className="text-text-primary text-2xl font-semibold mb-2">註冊成功！</Text>
                    <Text className="text-text-secondary text-center mb-6">
                        請檢查您的 Email 信箱{'\n'}點擊驗證連結以啟用帳號
                    </Text>
                    <TouchableOpacity
                        className="bg-accent rounded-lg py-4 px-8"
                        onPress={onNavigateToLogin}
                    >
                        <Text className="text-white font-semibold">前往登入</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-bg-primary"
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 justify-center px-6">
                    {/* Logo */}
                    <View className="items-center mb-8">
                        <View className="w-16 h-16 bg-accent rounded-lg items-center justify-center mb-4">
                            <Text className="text-white text-3xl font-bold">E</Text>
                        </View>
                        <Text className="text-text-primary text-2xl font-semibold">建立帳號</Text>
                        <Text className="text-text-secondary text-center mt-2">
                            加入 Estatein 開始管理您的物業
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-4">
                            <Text className="text-red-500 text-sm">{error}</Text>
                        </View>
                    )}

                    {/* Full Name Input */}
                    <View className="mb-4">
                        <Text className="text-text-secondary text-sm mb-2">姓名</Text>
                        <TextInput
                            className="bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary"
                            placeholder="您的姓名"
                            placeholderTextColor="#666666"
                            value={fullName}
                            onChangeText={setFullName}
                            autoComplete="name"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-text-secondary text-sm mb-2">電子郵件</Text>
                        <TextInput
                            className="bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary"
                            placeholder="your@email.com"
                            placeholderTextColor="#666666"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Password Input */}
                    <View className="mb-4">
                        <Text className="text-text-secondary text-sm mb-2">密碼</Text>
                        <TextInput
                            className="bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary"
                            placeholder="至少 8 個字元"
                            placeholderTextColor="#666666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password-new"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Confirm Password Input */}
                    <View className="mb-6">
                        <Text className="text-text-secondary text-sm mb-2">確認密碼</Text>
                        <TextInput
                            className="bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary"
                            placeholder="再次輸入密碼"
                            placeholderTextColor="#666666"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            autoComplete="password-new"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Register Button */}
                    <TouchableOpacity
                        className={`bg-accent rounded-lg py-4 items-center mb-4 ${isLoading ? 'opacity-50' : ''
                            }`}
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-semibold text-base">註冊</Text>
                        )}
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View className="flex-row justify-center">
                        <Text className="text-text-secondary text-sm">已有帳號？ </Text>
                        <TouchableOpacity onPress={onNavigateToLogin} disabled={isLoading}>
                            <Text className="text-accent text-sm font-semibold">立即登入</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
