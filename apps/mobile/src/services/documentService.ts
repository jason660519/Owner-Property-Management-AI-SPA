// filepath: apps/mobile/src/services/documentService.ts
// description: Document upload and management service
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import { supabase } from '../lib/supabase';
import { File } from 'expo-file-system';
import type { UploadDocumentParams, PropertyDocument } from '../types/documents';

/**
 * Upload document to Supabase Storage and create database record
 */
export async function uploadDocument(params: UploadDocumentParams) {
  try {
    const { fileUri, documentName, documentType, propertyId, fileSize, mimeType, propertyType } = params;

    // 1. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    // 2. Read file using new expo-file-system v19 API
    const file = new File(fileUri);
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mimeType });

    // 4. Generate storage path
    const timestamp = Date.now();
    const fileExtension = documentName.split('.').pop() || 'pdf';
    const sanitizedName = documentName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = propertyId
      ? `property-documents/${propertyId}/${timestamp}_${sanitizedName}`
      : `property-documents/general/${timestamp}_${sanitizedName}`;

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-documents')
      .upload(storagePath, blob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 6. Get public URL
    const { data: urlData } = supabase.storage
      .from('property-documents')
      .getPublicUrl(storagePath);

    // 7. Create database record
    const { data: dbData, error: dbError } = await supabase
      .from('property_documents')
      .insert([{
        owner_id: user.id,
        property_id: propertyId || null,
        document_type: documentType,
        document_name: documentName,
        file_path: storagePath,
        file_size: fileSize,
        file_extension: fileExtension,
        mime_type: mimeType,
        ocr_status: 'pending',
        property_type: propertyType || null,
        is_verified: false,
        uploaded_by: user.id,
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    return {
      success: true,
      data: dbData as PropertyDocument,
      publicUrl: urlData.publicUrl,
    };

  } catch (error) {
    console.error('Upload document failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user's documents
 */
export async function getUserDocuments(propertyId?: string) {
  try {
    let query = supabase
      .from('property_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data as PropertyDocument[] };
  } catch (error) {
    console.error('Get documents failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string, filePath: string) {
  try {
    // 1. Delete from storage
    const { error: storageError } = await supabase.storage
      .from('property-documents')
      .remove([filePath]);

    if (storageError) throw storageError;

    // 2. Delete database record
    const { error: dbError } = await supabase
      .from('property_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) throw dbError;

    return { success: true };
  } catch (error) {
    console.error('Delete document failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
