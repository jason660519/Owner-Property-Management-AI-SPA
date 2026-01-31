// filepath: apps/mobile/src/components/documents/OCRStatusBadge.tsx
// description: Reusable OCR status badge component
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { OCRStatus } from '../../types/documents';

interface OCRStatusBadgeProps {
  status: OCRStatus;
  size?: 'small' | 'medium' | 'large';
}

export default function OCRStatusBadge({ status, size = 'medium' }: OCRStatusBadgeProps) {
  const config = getStatusConfig(status);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, sizeStyles.container]}>
      <FontAwesome5 name={config.icon} size={sizeStyles.iconSize} color={config.color} />
      <Text style={[styles.text, { color: config.color }, sizeStyles.text]}>
        {config.label}
      </Text>
    </View>
  );
}

function getStatusConfig(status: OCRStatus) {
  switch (status) {
    case 'pending':
      return {
        icon: 'clock' as const,
        label: '待處理',
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
      };
    case 'processing':
      return {
        icon: 'sync' as const,
        label: '處理中',
        color: '#3B82F6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
      };
    case 'completed':
      return {
        icon: 'check-circle' as const,
        label: '已完成',
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
      };
    case 'failed':
      return {
        icon: 'exclamation-circle' as const,
        label: '失敗',
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
      };
    case 'skipped':
      return {
        icon: 'ban' as const,
        label: '已跳過',
        color: '#6B7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
      };
    case 'manual_review':
      return {
        icon: 'eye' as const,
        label: '待審核',
        color: '#8B5CF6',
        bgColor: 'rgba(139, 92, 246, 0.1)',
      };
  }
}

function getSizeStyles(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return {
        container: { paddingHorizontal: 6, paddingVertical: 3, gap: 4 },
        iconSize: 10,
        text: { fontSize: 11 },
      };
    case 'medium':
      return {
        container: { paddingHorizontal: 8, paddingVertical: 4, gap: 6 },
        iconSize: 12,
        text: { fontSize: 12 },
      };
    case 'large':
      return {
        container: { paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
        iconSize: 14,
        text: { fontSize: 14 },
      };
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
