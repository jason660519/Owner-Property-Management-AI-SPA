// filepath: apps/mobile/src/services/ocrService.ts
// description: OCR-specific service functions
// created: 2026-01-31
// creator: Claude Sonnet 4.5

import { supabase } from '../lib/supabase';
import type { OCRParsedData, OCRMetadata } from '../types/documents';

/**
 * Retry OCR processing for a failed document
 */
export async function retryOCRProcessing(documentId: string) {
  try {
    // Reset status to 'pending' to trigger re-processing
    const { data, error } = await supabase
      .from('property_documents')
      .update({
        ocr_status: 'pending',
        ocr_processed_at: null,
        ocr_confidence_score: null,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Retry OCR processing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get OCR result details including parsed data and metadata
 */
export async function getOCRResult(documentId: string) {
  try {
    const { data, error } = await supabase
      .from('property_documents')
      .select('ocr_status, ocr_parsed_data, ocr_engine, ocr_confidence_score, ocr_processed_at')
      .eq('id', documentId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        status: data.ocr_status,
        parsedData: data.ocr_parsed_data as OCRParsedData | null,
        metadata: {
          engine: data.ocr_engine,
          confidence_score: data.ocr_confidence_score,
          processed_at: data.ocr_processed_at,
        } as OCRMetadata,
      },
    };
  } catch (error) {
    console.error('Get OCR result failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update OCR parsed data (for manual corrections)
 */
export async function updateOCRParsedData(
  documentId: string,
  parsedData: OCRParsedData
) {
  try {
    const { data, error } = await supabase
      .from('property_documents')
      .update({
        ocr_parsed_data: parsedData,
        is_verified: true, // Mark as manually verified
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Update OCR parsed data failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get OCR statistics for user's documents
 */
export async function getOCRStatistics(userId: string) {
  try {
    const { data, error } = await supabase
      .from('property_documents')
      .select('ocr_status, ocr_confidence_score, document_type')
      .eq('owner_id', userId);

    if (error) throw error;

    // Calculate statistics
    const total = data.length;
    const completed = data.filter(d => d.ocr_status === 'completed').length;
    const failed = data.filter(d => d.ocr_status === 'failed').length;
    const processing = data.filter(d => d.ocr_status === 'processing').length;
    const pending = data.filter(d => d.ocr_status === 'pending').length;

    const avgConfidence =
      data
        .filter(d => d.ocr_confidence_score !== null)
        .reduce((sum, d) => sum + (d.ocr_confidence_score || 0), 0) /
      (completed || 1);

    return {
      success: true,
      data: {
        total,
        completed,
        failed,
        processing,
        pending,
        successRate: total > 0 ? (completed / total) * 100 : 0,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
    };
  } catch (error) {
    console.error('Get OCR statistics failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
