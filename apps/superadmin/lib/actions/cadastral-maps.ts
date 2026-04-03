// filepath: apps/superadmin/lib/actions/cadastral-maps.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  exportMapByWgs84,
  exportMapByAddress,
  parseAddressNumber,
  GIS_SOURCE_LABELS,
  type CadastralMapParams,
  type MapLayerPreset,
  type GisSource,
  type ExportMapOptions,
} from '@/lib/utils/cadastral-map-fetcher';

// ── Types ─────────────────────────────────────────────────────────────────

export interface FetchResult {
  success: boolean;
  message: string;
  /** Signed URL for preview (1h expiry) */
  url?: string;
  /** Storage path for deletion */
  storagePath?: string;
  /** Document row ID for deletion */
  documentId?: string;
  /** Which GIS source was used */
  source?: GisSource;
  /** ISO timestamp of when the map was fetched */
  fetchedAt?: string;
}

const LAYER_DOC_NAMES: Record<MapLayerPreset, string> = {
  cadastral: '地籍圖',
  building: '建物套繪圖',
  both: '地籍圖+建物套繪圖',
};

// ── Main Action ───────────────────────────────────────────────────────────

/**
 * Fetch cadastral / building overlay map from Taipei GIS and upload to
 * property-documents storage bucket.
 */
export async function fetchCadastralMap(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  ownerId: string,
  layers: MapLayerPreset,
  coords?: { latitude: number; longitude: number } | null,
  address?: {
    district: string;
    street: string;
    addressNumber: string;
  } | null,
  options?: { scale?: number; title?: string; source?: GisSource; markerLabel?: string },
): Promise<FetchResult> {
  try {
    const source = options?.source ?? 'historygis';
    const markerLabel = options?.markerLabel
      || (address ? `${address.street}${address.addressNumber}` : undefined);
    const exportOpts: ExportMapOptions = {
      layers,
      source,
      scale: options?.scale ?? 1000,
      paper: 'A4',
      orientation: 'portrait',
      title: options?.title ?? '',
      markerLabel,
    };

    let result;

    if (coords?.latitude && coords?.longitude) {
      result = await exportMapByWgs84(
        { latitude: coords.latitude, longitude: coords.longitude },
        exportOpts,
      );
    } else if (address?.district && address?.street && address?.addressNumber) {
      const parsed = parseAddressNumber(address.addressNumber);
      const addrParams: CadastralMapParams = {
        district: address.district,
        road: address.street,
        lane: parsed.lane,
        alley: parsed.alley,
        number: parsed.number,
        subNumber: parsed.subNumber,
      };
      result = await exportMapByAddress(addrParams, exportOpts);
    } else {
      return { success: false, message: '缺少座標或地址資訊，無法查詢地籍圖' };
    }

    // Upload to Supabase storage
    const adminClient = createAdminClient();
    const layerSlug = layers === 'both' ? 'cadastral-building' : layers;
    const timestamp = Date.now();
    const fetchedAt = new Date(timestamp).toISOString();
    const storagePath = `${propertyId}/gis-${layerSlug}-${timestamp}.jpg`;

    const { error: uploadError } = await adminClient.storage
      .from('property-documents')
      .upload(storagePath, result.imageBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      return { success: false, message: `圖片上傳失敗：${uploadError.message}` };
    }

    // Insert document record
    const docType = propertyType === 'sale' ? 'sales' : 'rentals';
    const docName = LAYER_DOC_NAMES[layers];
    const sourceLabel = GIS_SOURCE_LABELS[source];

    const { data: insertData, error: insertError } = await adminClient
      .from('property_documents')
      .insert({
        property_id: propertyId,
        property_type: docType,
        owner_id: ownerId,
        document_type: 'cadastral_map',
        document_name: `${docName}-${sourceLabel}`,
        file_path: storagePath,
        file_size_bytes: result.imageBuffer.byteLength,
        mime_type: 'image/jpeg',
        original_filename: `${layerSlug}-${timestamp}.jpg`,
        uploaded_by: ownerId,
        tags: [`gis:${layers}`, `source:${source}`],
      })
      .select('id')
      .single();

    if (insertError) {
      await adminClient.storage.from('property-documents').remove([storagePath]);
      return { success: false, message: `文件記錄寫入失敗：${insertError.message}` };
    }

    // Get signed URL for preview (1 hour expiry; bucket is private)
    const { data: signedData } = await adminClient.storage
      .from('property-documents')
      .createSignedUrl(storagePath, 3600);

    revalidatePath('/superadmin/properties');

    return {
      success: true,
      message: `${docName}已擷取並儲存（${sourceLabel}）`,
      url: signedData?.signedUrl ?? undefined,
      storagePath,
      documentId: insertData?.id,
      source,
      fetchedAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    return { success: false, message: `擷取失敗：${msg}` };
  }
}

/** Delete a previously fetched cadastral map document */
export async function deleteCadastralMap(
  documentId: string,
  storagePath: string,
): Promise<{ success: boolean; message: string }> {
  const adminClient = createAdminClient();

  const { error: storageErr } = await adminClient.storage
    .from('property-documents')
    .remove([storagePath]);

  if (storageErr) {
    console.error('[CadastralMaps] storage delete error:', storageErr);
  }

  const { error } = await adminClient
    .from('property_documents')
    .update({ is_active: false })
    .eq('id', documentId);

  if (error) {
    return { success: false, message: `刪除失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '已刪除' };
}
