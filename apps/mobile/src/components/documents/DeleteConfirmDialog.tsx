// filepath: apps/mobile/src/components/documents/DeleteConfirmDialog.tsx
// description: Delete confirmation dialog with document details
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import type { PropertyDocument } from '../../types/documents';

interface DeleteConfirmDialogProps {
  visible: boolean;
  document: PropertyDocument | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function DeleteConfirmDialog({
  visible,
  document,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!document) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <FontAwesome5 name="exclamation-triangle" size={32} color="#EF4444" />
          </View>

          {/* Title */}
          <Text style={styles.title}>確認刪除文件？</Text>

          {/* Document Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>文件名稱</Text>
            <Text style={styles.infoValue}>{document.document_name}</Text>

            <Text style={styles.infoLabel}>文件類型</Text>
            <Text style={styles.infoValue}>
              {getDocumentTypeLabel(document.document_type)}
            </Text>
          </View>

          {/* Warning */}
          <Text style={styles.warning}>
            此操作無法復原，文件將從雲端永久刪除
          </Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton, isDeleting && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.deleteButtonText}>刪除</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getDocumentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    building_title: '建物權狀',
    land_title: '土地權狀',
    contract: '合約',
    tax_document: '稅務文件',
    id_card: '身分證',
    passport: '護照',
    other: '其他',
  };
  return labels[type] || type;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#262626',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  warning: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
