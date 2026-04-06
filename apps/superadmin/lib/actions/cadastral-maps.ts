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

/** Set `CADASTRAL_MAP_DEBUG=1` to log Server Action timing (start/end + ms). */
function cadastralMapDebugEnabled(): boolean {
  return process.env.CADASTRAL_MAP_DEBUG === '1' || process.env.CADASTRAL_MAP_DEBUG === 'true';
}

function logCadastralMap(
  phase: 'start' | 'end',
  t0: number,
  fields: {
    propertyId: string;
    layers: MapLayerPreset;
    source: GisSource;
    success?: boolean;
    detail?: string;
  },
): void {
  if (!cadastralMapDebugEnabled()) return;
  console.log('[fetchCadastralMap]', phase, {
    ms: Date.now() - t0,
    ...fields,
  });
}

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
  const t0 = Date.now();
  const source = options?.source ?? 'historygis';
  logCadastralMap('start', t0, { propertyId, layers, source });

  try {
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
      logCadastralMap('end', t0, {
        propertyId,
        layers,
        source,
        success: false,
        detail: 'missing_coords_or_address',
      });
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
      logCadastralMap('end', t0, {
        propertyId,
        layers,
        source,
        success: false,
        detail: `upload:${uploadError.message}`,
      });
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
      logCadastralMap('end', t0, {
        propertyId,
        layers,
        source,
        success: false,
        detail: `insert:${insertError.message}`,
      });
      return { success: false, message: `文件記錄寫入失敗：${insertError.message}` };
    }

    // Get signed URL for preview (1 hour expiry; bucket is private)
    const { data: signedData } = await adminClient.storage
      .from('property-documents')
      .createSignedUrl(storagePath, 3600);

    revalidatePath('/superadmin/properties');

    logCadastralMap('end', t0, { propertyId, layers, source, success: true });
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
    logCadastralMap('end', t0, {
      propertyId,
      layers,
      source,
      success: false,
      detail: `exception:${msg}`,
    });
    return { success: false, message: `擷取失敗：${msg}` };
  }
}

/** Stored GIS file info */
export interface StoredGisFile {
  id: string;
  name: string;
  filePath: string;
  createdAt: string;
  tags: string[];
}

/** List all stored cadastral map files for a property from the database */
export async function listCadastralMapFiles(
  propertyId: string,
): Promise<{ data: StoredGisFile[]; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('property_documents')
    .select('id, document_name, file_path, created_at, tags')
    .eq('property_id', propertyId)
    .eq('document_type', 'cadastral_map')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { data: [], error: error.message };

  return {
    data: (data ?? []).map((r) => ({
      id: r.id as string,
      name: (r.document_name as string) ?? '',
      filePath: (r.file_path as string) ?? '',
      createdAt: (r.created_at as string) ?? '',
      tags: (r.tags as string[]) ?? [],
    })),
    error: null,
  };
}

/** Get a signed URL for a stored GIS file */
export async function getGisFileUrl(
  filePath: string,
): Promise<{ url: string | null; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('property-documents')
    .createSignedUrl(filePath, 60 * 60);

  if (error) return { url: null, error: error.message };
  return { url: data?.signedUrl ?? null, error: null };
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
