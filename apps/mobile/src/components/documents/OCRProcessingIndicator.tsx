// filepath: apps/mobile/src/components/documents/OCRProcessingIndicator.tsx
// description: Processing indicator animation for OCR
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface OCRProcessingIndicatorProps {
  message?: string;
}

export default function OCRProcessingIndicator({
  message = '正在處理文件...'
}: OCRProcessingIndicatorProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#3B82F6" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  text: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
});
