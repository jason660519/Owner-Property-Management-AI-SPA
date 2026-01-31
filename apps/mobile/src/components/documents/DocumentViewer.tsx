// filepath: apps/mobile/src/components/documents/DocumentViewer.tsx
// description: Fullscreen document viewer with zoom support
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import ImageViewing from 'react-native-image-viewing';
import type { PropertyDocument } from '../../types/documents';

interface DocumentViewerProps {
  visible: boolean;
  document: PropertyDocument | null;
  onClose: () => void;
}

export default function DocumentViewer({
  visible,
  document,
  onClose,
}: DocumentViewerProps) {
  if (!document) return null;

  const isImage = ['jpg', 'jpeg', 'png'].includes(
    document.file_extension?.toLowerCase() || ''
  );

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${document.file_path}`;

  if (isImage) {
    return (
      <ImageViewing
        images={[{ uri: imageUrl }]}
        imageIndex={0}
        visible={visible}
        onRequestClose={onClose}
        HeaderComponent={() => (
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome5 name="times" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      />
    );
  }

  // For PDF, show a placeholder (需要 PDF viewer 庫)
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.pdfContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesome5 name="times" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.pdfPlaceholder}>
          <FontAwesome5 name="file-pdf" size={64} color="#7C3AED" />
          <Text style={styles.pdfText}>PDF 預覽功能即將推出</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  pdfPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  pdfText: {
    fontSize: 16,
    color: '#999',
  },
});
