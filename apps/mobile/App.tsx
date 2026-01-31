import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Dashboard from './src/Dashboard';
import './global.css';

export default function App() {
  return (
    <View className="flex-1 bg-bg-primary">
      <StatusBar style="light" />
      <Dashboard />
    </View>
  );
}
