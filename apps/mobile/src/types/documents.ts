// filepath: apps/mobile/src/types/documents.ts
// description: Document type definitions for property document management
// created: 2026-01-31
// creator: Claude Sonnet 4.5

/**
 * Document type from database
 */
export type DocumentType =
  | 'building_title'
  | 'land_title'
  | 'contract'
  | 'tax_document'
  | 'id_card'
  | 'passport'
  | 'other';

/**
 * OCR processing status
 */
export type OCRStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'manual_review';

/**
 * OCR engine types
 */
export type OCREngine =
  | 'tesseract'
  | 'google_vision'
  | 'azure_ocr'
  | 'manual';

/**
 * Property type classification
 */
export type PropertyType = 'sales' | 'rentals';

/**
 * Property document record from database
 */
export interface PropertyDocument {
  id: string;
  owner_id: string;
  property_id?: string;
  document_type: DocumentType;
  document_name: string;
  file_path: string;
  file_size?: number;
  file_extension?: string;
  mime_type?: string;
  ocr_status: OCRStatus;
  ocr_parsed_data?: Record<string, any>;
  ocr_engine?: OCREngine;
  ocr_confidence_score?: number;
  ocr_result_path?: string;
  ocr_processed_at?: string;
  property_type?: PropertyType;
  is_verified: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for uploading a new document
 */
export interface UploadDocumentParams {
  propertyId?: string;
  documentType: DocumentType;
  documentName: string;
  fileUri: string;
  fileSize: number;
  mimeType: string;
  propertyType?: PropertyType;
}

/**
 * Document preview information
 */
export interface DocumentPreview {
  documentId: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  isImage: boolean;
  isPDF: boolean;
}

/**
 * Upload progress details
 */
export interface UploadProgress {
  percentage: number;
  loaded: number;
  total: number;
  speed?: number;
  estimatedTime?: number;
}

/**
 * Camera options for image picker
 */
export interface CameraOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}

/**
 * Document action types
 */
export type DocumentAction = 'view' | 'download' | 'delete';

/**
 * OCR result parsed data structure (based on Jason Schema)
 */
export interface OCRParsedData {
  basic_info?: {
    document_number?: string;
    issue_date?: string;
    location?: string;
  };
  ownership?: {
    owner_name?: string;
    owner_id?: string;
    ownership_ratio?: string;
  };
  building_profile?: {
    building_type?: string;
    construction_date?: string;
    floor_info?: string;
  };
  area_summary?: {
    area_sqm?: number;
    area_ping?: number;
  };
  [key: string]: any; // Allow other fields
}

/**
 * OCR metadata information
 */
export interface OCRMetadata {
  engine?: OCREngine;
  confidence_score?: number;
  processed_at?: string;
  processing_time_ms?: number;
  error_message?: string;
}

/**
 * Realtime subscription status
 */
export type RealtimeStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

/**
 * Document update event from Realtime subscription
 */
export interface DocumentUpdateEvent {
  documentId: string;
  oldStatus: OCRStatus;
  newStatus: OCRStatus;
  parsedData?: OCRParsedData;
  metadata?: OCRMetadata;
}
