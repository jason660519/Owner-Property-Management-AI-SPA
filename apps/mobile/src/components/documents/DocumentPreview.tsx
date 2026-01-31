// filepath: apps/mobile/src/components/documents/DocumentPreview.tsx
// description: Document preview card with thumbnail
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { PropertyDocument } from '../../types/documents';

interface DocumentPreviewProps {
  document: PropertyDocument;
  onPress?: () => void;
  onMenuPress?: () => void;
}

export default function DocumentPreview({
  document,
  onPress,
  onMenuPress,
}: DocumentPreviewProps) {
  const isImage = ['jpg', 'jpeg', 'png'].includes(
    document.file_extension?.toLowerCase() || ''
  );
  const isPDF = document.file_extension?.toLowerCase() === 'pdf';

  // Get preview URL from Supabase Storage
  const getPreviewUrl = () => {
    if (!document.file_path) return null;
    // Use Supabase public URL
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    return `${SUPABASE_URL}/storage/v1/object/public/${document.file_path}`;
  };

  const previewUrl = getPreviewUrl();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {isImage && previewUrl ? (
          <Image
            source={{ uri: previewUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.iconContainer}>
            <FontAwesome5
              name={isPDF ? 'file-pdf' : 'file'}
              size={32}
              color="#7C3AED"
            />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.fileName} numberOfLines={2}>
          {document.document_name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {document.file_size ? formatFileSize(document.file_size) : 'Unknown'}
          </Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>
            {document.file_extension?.toUpperCase()}
          </Text>
        </View>

        {/* OCR Status Badge */}
        <View style={[styles.statusBadge, getStatusStyle(document.ocr_status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(document.ocr_status)]}>
            OCR: {getStatusLabel(document.ocr_status)}
          </Text>
        </View>
      </View>

      {/* Menu Button */}
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <FontAwesome5 name="ellipsis-v" size={16} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getStatusStyle = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#FFA500',
    processing: '#3B82F6',
    completed: '#10B981',
    failed: '#EF4444',
    manual_review: '#F59E0B',
  };
  return { backgroundColor: (colors[status] || '#999') + '20' };
};

const getStatusTextStyle = (status: string) => {
  const colors: Record<string, string> = {
    pending: '#FFA500',
    processing: '#3B82F6',
    completed: '#10B981',
    failed: '#EF4444',
    manual_review: '#F59E0B',
  };
  return { color: colors[status] || '#999' };
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: '等待處理',
    processing: '處理中',
    completed: '已完成',
    failed: '失敗',
    manual_review: '待審核',
  };
  return labels[status] || status;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  menuButton: {
    padding: 8,
  },
});
