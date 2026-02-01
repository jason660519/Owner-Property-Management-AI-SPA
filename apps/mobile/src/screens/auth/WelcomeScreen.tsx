// filepath: apps/mobile/src/screens/auth/WelcomeScreen.tsx
/**
 * @file WelcomeScreen.tsx
 * @description Welcome screen with login/register options
 * @created 2026-02-01
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-02-01
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface WelcomeScreenProps {
    onNavigateToLogin: () => void;
    onNavigateToRegister: () => void;
}

export default function WelcomeScreen({ onNavigateToLogin, onNavigateToRegister }: WelcomeScreenProps) {
    return (
        <View className="flex-1 bg-bg-primary justify-center px-6">
            {/* Logo */}
            <View className="items-center mb-12">
                <View className="w-20 h-20 bg-accent rounded-2xl items-center justify-center mb-6">
                    <Text className="text-white text-4xl font-bold">E</Text>
                </View>
                <Text className="text-text-primary text-3xl font-bold mb-3">
                    Welcome to Estatein
                </Text>
                <Text className="text-text-secondary text-center text-base">
                    房東物業的 AI 好幫手{'\n'}
                    輕鬆管理您的不動產資產
                </Text>
            </View>

            {/* Buttons */}
            <View className="space-y-4">
                {/* Login Button */}
                <TouchableOpacity
                    className="bg-accent rounded-lg py-4 items-center"
                    onPress={onNavigateToLogin}
                >
                    <Text className="text-white font-semibold text-base">登入</Text>
                </TouchableOpacity>

                {/* Register Button */}
                <TouchableOpacity
                    className="bg-bg-secondary border border-border rounded-lg py-4 items-center"
                    onPress={onNavigateToRegister}
                >
                    <Text className="text-text-primary font-semibold text-base">註冊新帳號</Text>
                </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="mt-12">
                <Text className="text-text-muted text-center text-sm">
                    登入即表示您同意我們的{'\n'}
                    <Text className="text-accent">服務條款</Text> 和 <Text className="text-accent">隱私政策</Text>
                </Text>
            </View>
        </View>
    );
}
