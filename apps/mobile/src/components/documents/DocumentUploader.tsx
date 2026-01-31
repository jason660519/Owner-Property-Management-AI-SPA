// filepath: apps/mobile/src/components/documents/DocumentUploader.tsx
// description: Main document uploader component with type selection
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';
import { useImagePicker } from '../../hooks/useImagePicker';
import type { DocumentType, PropertyType } from '../../types/documents';

interface DocumentUploaderProps {
  propertyId?: string;
  propertyType?: PropertyType;
  onUploadComplete?: () => void;
}

export default function DocumentUploader({
  propertyId,
  propertyType,
  onUploadComplete,
}: DocumentUploaderProps) {
  const { pickAndUpload, uploadDocument, isUploading, uploadProgress, error } = useDocumentUpload();
  const { takePhoto, isProcessing: isTakingPhoto } = useImagePicker();
  const [selectedType, setSelectedType] = useState<DocumentType>('building_title');

  const handleUpload = async () => {
    const result = await pickAndUpload(selectedType, propertyId, propertyType);

    if (result.success) {
      Alert.alert('成功', '文件上傳成功');
      onUploadComplete?.();
    } else if (!result.canceled) {
      Alert.alert('錯誤', result.error || '上傳失敗');
    }
  };

  const handleTakePhoto = async () => {
    const result = await takePhoto();

    if (result.success && result.uri) {
      // Upload photo taken from camera
      const uploadResult = await uploadDocument({
        fileUri: result.uri,
        documentName: `photo_${Date.now()}.jpg`,
        documentType: selectedType,
        propertyId,
        fileSize: 0, // Size will be calculated in service
        mimeType: 'image/jpeg',
        propertyType,
      });

      if (uploadResult.success) {
        Alert.alert('成功', '照片上傳成功');
        onUploadComplete?.();
      } else {
        Alert.alert('錯誤', uploadResult.error || '上傳失敗');
      }
    } else if (result.error) {
      Alert.alert('錯誤', result.error);
    }
  };

  const documentTypes: Array<{ value: DocumentType; label: string; icon: string }> = [
    { value: 'building_title', label: '建物權狀', icon: 'building' },
    { value: 'land_title', label: '土地權狀', icon: 'map' },
    { value: 'contract', label: '合約', icon: 'file-contract' },
    { value: 'tax_document', label: '稅務文件', icon: 'file-invoice-dollar' },
    { value: 'id_card', label: '身分證', icon: 'id-card' },
    { value: 'other', label: '其他', icon: 'file' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>上傳文件</Text>

      {/* Document Type Selector */}
      <Text style={styles.label}>選擇文件類型</Text>
      <View style={styles.typeGrid}>
        {documentTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeButton,
              selectedType === type.value && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType(type.value)}
          >
            <FontAwesome5
              name={type.icon}
              size={20}
              color={selectedType === type.value ? '#7C3AED' : '#999'}
            />
            <Text
              style={[
                styles.typeButtonText,
                selectedType === type.value && styles.typeButtonTextActive,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upload Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.uploadButton, (isUploading || isTakingPhoto) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={isUploading || isTakingPhoto}
        >
          {isUploading ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.uploadButtonText}>上傳中 {uploadProgress}%</Text>
            </>
          ) : (
            <>
              <FontAwesome5 name="cloud-upload-alt" size={20} color="#FFF" />
              <Text style={styles.uploadButtonText}>選擇文件</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cameraButton, (isUploading || isTakingPhoto) && styles.uploadButtonDisabled]}
          onPress={handleTakePhoto}
          disabled={isUploading || isTakingPhoto}
        >
          {isTakingPhoto ? (
            <ActivityIndicator color="#7C3AED" />
          ) : (
            <>
              <FontAwesome5 name="camera" size={20} color="#7C3AED" />
              <Text style={styles.cameraButtonText}>拍攝照片</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <FontAwesome5 name="exclamation-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Info */}
      <Text style={styles.infoText}>
        支援格式：PDF, JPG, PNG | 最大 10MB
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#262626',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#1E1B3B',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#999',
  },
  typeButtonTextActive: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 8,
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  cameraButtonText: {
    color: '#7C3AED',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3F1F1F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
