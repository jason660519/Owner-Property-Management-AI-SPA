import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import Dashboard from './src/Dashboard';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import { useAuth } from './src/hooks/useAuth';
import './global.css';

type AuthScreen = 'welcome' | 'login' | 'register';

export default function App() {
  const { user, loading, exchangeToken } = useAuth();
  const [initializing, setInitializing] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('welcome');

  useEffect(() => {
    // Handle Deep Link on app launch
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleDeepLink(initialUrl);
      }
      setInitializing(false);
    };

    // Handle Deep Link while app is running
    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      handleDeepLink(event.url);
    });

    handleInitialURL();

    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (url: string) => {
    try {
      const { queryParams } = Linking.parse(url);
      const token = queryParams?.token as string;

      if (token) {
        console.log('Received transfer token, exchanging for session...');
        const result = await exchangeToken(token);

        if (result.success) {
          console.log('Successfully authenticated via Deep Link');
        } else {
          console.error('Failed to exchange token:', result.error);
        }
      }
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  };

  if (loading || initializing) {
    return (
      <View className="flex-1 bg-bg-primary items-center justify-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-bg-primary">
        <StatusBar style="light" />
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            onNavigateToLogin={() => setCurrentScreen('login')}
            onNavigateToRegister={() => setCurrentScreen('register')}
          />
        )}
        {currentScreen === 'login' && (
          <LoginScreen onNavigateToRegister={() => setCurrentScreen('register')} />
        )}
        {currentScreen === 'register' && (
          <RegisterScreen onNavigateToLogin={() => setCurrentScreen('login')} />
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-primary">
      <StatusBar style="light" />
      <Dashboard />
    </View>
  );
}
