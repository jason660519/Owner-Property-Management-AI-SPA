'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import type { ActionResult, PropertyDocumentItem } from '@/lib/types/properties';

const DOCUMENT_TYPE = 'zoning_usage_certificate';
const SOURCE_NAME = '臺北市政府都市發展局使用分區查詢系統';
const SOURCE_URL = 'https://zone.udd.gov.taipei/ZoneSearch.aspx';

function normalizeKey(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase().slice(0, 80);
}

function safePathPart(value: string): string {
  return value
    .replace(/[\\/:"*?<>|#%{}^~[\]`]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function removePriorAutoZoningDocument(
  adminClient: ReturnType<typeof createAdminClient>,
  propertyId: string,
  keyTag: string,
  keepDocumentId: string,
): Promise<void> {
  const { data: rows } = await adminClient
    .from('property_documents')
    .select('id, file_path, tags')
    .eq('property_id', propertyId)
    .eq('document_type', DOCUMENT_TYPE)
    .eq('is_active', true);

  for (const row of rows ?? []) {
    if (row.id === keepDocumentId) continue;
    const tags = row.tags as string[] | null;
    if (!Array.isArray(tags) || !tags.includes('zoning:auto') || !tags.includes(keyTag)) continue;
    await adminClient.storage.from('property-documents').remove([row.file_path as string]);
    await adminClient.from('property_documents').update({ is_active: false }).eq('id', row.id as string);
  }
}

export async function saveZoningQueryDocument(args: {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  landNumber: string;
  html: string;
}): Promise<ActionResult & { document?: PropertyDocumentItem }> {
  const { propertyId, propertyType, ownerId, landNumber, html } = args;
  if (!propertyId || !ownerId || !landNumber || !html) {
    return { success: false, message: '缺少使用分區查詢檔案儲存必要資料' };
  }

  const adminClient = createAdminClient();
  const keyTag = `zoning:key:${normalizeKey(landNumber)}`;

  const dayStamp = new Date().toISOString().slice(0, 10);
  const fileName = `使用分區查詢-${safePathPart(landNumber)}-${dayStamp}.html`;
  const storagePath = `${propertyId}/zoning/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.html`;
  const bytes = Buffer.from(html, 'utf8');

  const { error: uploadError } = await adminClient.storage
    .from('property-documents')
    .upload(storagePath, bytes, {
      cacheControl: '3600',
      contentType: 'text/html',
      upsert: false,
    });

  if (uploadError) {
    return { success: false, message: `使用分區查詢檔案上傳失敗：${uploadError.message}` };
  }

  const documentName = `使用分區查詢-${landNumber}`;
  const { data, error: insertError } = await adminClient
    .from('property_documents')
    .insert({
      property_id: propertyId,
      property_type: propertyType === 'sale' ? 'sales' : 'rentals',
      owner_id: ownerId,
      document_type: DOCUMENT_TYPE,
      document_name: documentName,
      file_path: storagePath,
      file_size_bytes: bytes.byteLength,
      mime_type: 'text/html',
      original_filename: fileName,
      uploaded_by: ownerId,
      tags: ['zoning:auto', keyTag],
      metadata: {
        sourceName: SOURCE_NAME,
        sourceUrl: SOURCE_URL,
        landNumber,
        savedAt: new Date().toISOString(),
      },
    })
    .select('id, document_type, document_name, file_path, tags, created_at')
    .single();

  if (insertError || !data) {
    await adminClient.storage.from('property-documents').remove([storagePath]);
    return { success: false, message: `寫入使用分區查詢文件失敗：${insertError?.message}` };
  }

  await removePriorAutoZoningDocument(adminClient, propertyId, keyTag, data.id);

  revalidatePath('/superadmin/properties');
  return {
    success: true,
    message: '使用分區查詢結果已儲存',
    document: {
      id: data.id,
      documentType: data.document_type,
      documentName: data.document_name,
      filePath: data.file_path,
      tags: (data.tags as string[] | null) ?? null,
      createdAt: data.created_at,
      url: `/api/documents/${data.id}/view`,
    },
  };
}
