// filepath: apps/mobile/src/hooks/useImagePicker.ts
// description: Custom hook for camera and photo library selection
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface ImagePickerResult {
  success: boolean;
  uri?: string;
  width?: number;
  height?: number;
  error?: string;
  canceled?: boolean;
}

interface UseImagePickerReturn {
  takePhoto: (options?: { quality?: number }) => Promise<ImagePickerResult>;
  pickFromLibrary: (options?: { quality?: number }) => Promise<ImagePickerResult>;
  isProcessing: boolean;
}

export function useImagePicker(): UseImagePickerReturn {
  const [isProcessing, setIsProcessing] = useState(false);

  const takePhoto = async (options?: { quality?: number }): Promise<ImagePickerResult> => {
    try {
      setIsProcessing(true);

      // Request camera permission
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { success: false, error: '需要相機權限' };
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: options?.quality || 0.8,
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const asset = result.assets[0];

      // Compress image if needed
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1920 } }], // Max width 1920px
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        success: true,
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const pickFromLibrary = async (options?: { quality?: number }): Promise<ImagePickerResult> => {
    try {
      setIsProcessing(true);

      // Request permission
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return { success: false, error: '需要相簿權限' };
      }

      // Launch library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: options?.quality || 0.8,
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      const asset = result.assets[0];

      // Compress if needed
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1920 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        success: true,
        uri: compressed.uri,
        width: compressed.width,
        height: compressed.height,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    takePhoto,
    pickFromLibrary,
    isProcessing,
  };
}
