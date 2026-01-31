// filepath: apps/mobile/src/hooks/useDocumentUpload.ts
// description: Custom hook for document upload functionality
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { uploadDocument as uploadDocumentService } from '../services/documentService';
import type { DocumentType, PropertyType, UploadDocumentParams } from '../types/documents';

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async (
    documentType: DocumentType,
    propertyId?: string,
    propertyType?: PropertyType
  ) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setIsUploading(false);
        return { success: false, canceled: true };
      }

      const file = result.assets[0];

      // Validate file size (10MB limit)
      if (file.size && file.size > 10 * 1024 * 1024) {
        throw new Error('檔案大小超過 10MB 限制');
      }

      setUploadProgress(50);

      // Upload
      const uploadResult = await uploadDocumentService({
        fileUri: file.uri,
        documentName: file.name,
        documentType,
        propertyId,
        fileSize: file.size || 0,
        mimeType: file.mimeType || 'application/pdf',
        propertyType,
      });

      setUploadProgress(100);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setIsUploading(false);
      return { success: true, data: uploadResult.data };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsUploading(false);
      return { success: false, error: errorMessage };
    }
  };

  const uploadDocument = async (params: UploadDocumentParams) => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      setUploadProgress(50);

      const uploadResult = await uploadDocumentService(params);

      setUploadProgress(100);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      setIsUploading(false);
      return { success: true, data: uploadResult.data };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsUploading(false);
      return { success: false, error: errorMessage };
    }
  };

  return {
    pickAndUpload,
    uploadDocument,
    isUploading,
    uploadProgress,
    error,
  };
}
