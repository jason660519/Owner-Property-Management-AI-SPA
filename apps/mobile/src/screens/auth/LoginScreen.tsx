// filepath: apps/mobile/src/screens/auth/LoginScreen.tsx
/**
 * @file LoginScreen.tsx
 * @description Login screen for Expo app with email/password authentication
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
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen({ onNavigateToRegister }: { onNavigateToRegister: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('請輸入 Email 和密碼');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await signIn(email, password);

        if (!result.success) {
            setError(result.error || '登入失敗，請檢查您的帳號密碼');
            setIsLoading(false);
        }
        // If successful, useAuth will update the state and App.tsx will show Dashboard
    };

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
                        <View className="w-16 h-16 bg-accent-primary rounded-lg items-center justify-center mb-4">
                            <Text className="text-white text-3xl font-bold">E</Text>
                        </View>
                        <Text className="text-text-primary text-2xl font-semibold">歡迎回來</Text>
                        <Text className="text-text-secondary text-center mt-2">
                            登入您的 Estatein 帳號
                        </Text>
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View className="bg-red-500/10 border border-red-500 rounded-lg p-3 mb-4">
                            <Text className="text-red-500 text-sm">{error}</Text>
                        </View>
                    )}

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-text-secondary text-sm mb-2">電子郵件</Text>
                        <TextInput
                            className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 text-text-primary"
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
                    <View className="mb-6">
                        <Text className="text-text-secondary text-sm mb-2">密碼</Text>
                        <TextInput
                            className="bg-bg-secondary border border-border-default rounded-lg px-4 py-3 text-text-primary"
                            placeholder="••••••••"
                            placeholderTextColor="#666666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password"
                            editable={!isLoading}
                        />
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        className={`bg-accent-primary rounded-lg py-4 items-center mb-4 ${isLoading ? 'opacity-50' : ''
                            }`}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text className="text-white font-semibold text-base">登入</Text>
                        )}
                    </TouchableOpacity>

                    {/* Register Link */}
                    <View className="flex-row justify-center">
                        <Text className="text-text-secondary text-sm">還沒有帳號？ </Text>
                        <TouchableOpacity onPress={onNavigateToRegister} disabled={isLoading}>
                            <Text className="text-accent-primary text-sm font-semibold">立即註冊</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
