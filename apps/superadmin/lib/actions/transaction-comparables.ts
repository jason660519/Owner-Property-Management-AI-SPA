// filepath: apps/superadmin/lib/actions/transaction-comparables.ts
// 自動產出三份實價成交行情 PDF（附近／同街段／同里）並寫入 property_documents

'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { getPropertyById } from '@/lib/actions/properties';
import { formatStructuredAddress } from '@/lib/types/properties';
import {
  buildComparableContextFromProperty,
  filterNearbyComparables,
  filterStreetSectionComparables,
  filterVillageComparables,
  normalizeTaiwanCity,
} from '@/lib/utils/real-price-comparables';
import { loadComparableSalesFromEnv } from '@/lib/utils/real-price-comparable-source';
import { buildComparableSalesPdf } from '@/lib/utils/real-price-comparable-pdf';

export type TransactionComparableDocType =
  | 'transaction_comparables_nearby'
  | 'transaction_comparables_street_section'
  | 'transaction_comparables_village';

const DOC_DISPLAY: Record<TransactionComparableDocType, string> = {
  transaction_comparables_nearby: '附近成交價',
  transaction_comparables_street_section: '同街段成交價',
  transaction_comparables_village: '同里成交價',
};

async function removePriorAutoComparable(
  adminClient: ReturnType<typeof createAdminClient>,
  propertyId: string,
  kindTag: string,
): Promise<void> {
  const { data: rows } = await adminClient
    .from('property_documents')
    .select('id, file_path, tags')
    .eq('property_id', propertyId)
    .eq('is_active', true);

  for (const r of rows ?? []) {
    const tags = r.tags as string[] | null;
    if (!Array.isArray(tags) || !tags.includes(kindTag)) continue;
    await adminClient.storage.from('property-documents').remove([r.file_path as string]);
    await adminClient.from('property_documents').update({ is_active: false }).eq('id', r.id as string);
  }
}

async function saveComparablePdf(args: {
  adminClient: ReturnType<typeof createAdminClient>;
  propertyId: string;
  ownerId: string;
  docType: TransactionComparableDocType;
  kindTag: string;
  pdfBytes: Uint8Array;
}): Promise<void> {
  const { adminClient, propertyId, ownerId, docType, kindTag, pdfBytes } = args;
  await removePriorAutoComparable(adminClient, propertyId, kindTag);

  const dayStamp = new Date().toISOString().slice(0, 10);
  const storagePath = `${propertyId}/comparable-${kindTag.replace(/:/g, '-')}-${Date.now()}.pdf`;
  const label = DOC_DISPLAY[docType];

  const { error: uploadError } = await adminClient.storage
    .from('property-documents')
    .upload(storagePath, Buffer.from(pdfBytes), {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf',
    });

  if (uploadError) {
    throw new Error(`Storage 上傳失敗：${uploadError.message}`);
  }

  const documentName = `${label}-${dayStamp}`;
  const { error: insertError } = await adminClient.from('property_documents').insert({
    property_id: propertyId,
    property_type: 'sales',
    owner_id: ownerId,
    document_type: docType,
    document_name: documentName,
    file_path: storagePath,
    file_size_bytes: pdfBytes.byteLength,
    mime_type: 'application/pdf',
    original_filename: `${documentName}.pdf`,
    uploaded_by: ownerId,
    tags: ['comparable:auto', kindTag],
  });

  if (insertError) {
    await adminClient.storage.from('property-documents').remove([storagePath]);
    throw new Error(`寫入文件失敗：${insertError.message}`);
  }
}

export type GenerateTransactionComparablesResult = {
  success: boolean;
  message: string;
  /** 已成功寫入的報表類型 */
  generated?: Array<'nearby' | 'street_section' | 'village'>;
  notes?: string[];
};

/**
 * 依物件產出三份 PDF：附近成交、同街段成交、同里成交（皆為近一年）。
 * 成交來源：環境變數 LVR_COMPARABLES_JSON_PATH 指向之 JSON 陣列；未設定則表格為空但仍產出檔案。
 */
export async function generateTransactionComparableDocuments(
  propertyId: string,
): Promise<GenerateTransactionComparablesResult> {
  const property = await getPropertyById(propertyId);
  if (!property) {
    return { success: false, message: '找不到物件' };
  }
  if (property.type !== 'sale') {
    return { success: false, message: '僅「出售」物件可使用成交行情自動產出' };
  }

  const ctx = buildComparableContextFromProperty(property);
  if (!ctx) {
    return { success: false, message: '請先補齊物件縣市與行政區（結構化地址）' };
  }

  const allRows = loadComparableSalesFromEnv();
  const pool = allRows.filter(
    (r) => normalizeTaiwanCity(r.city) === normalizeTaiwanCity(ctx.city),
  );

  const nearbyRows = filterNearbyComparables(pool, ctx);
  const streetRows = filterStreetSectionComparables(pool, ctx);
  const villageRows = filterVillageComparables(pool, ctx);

  const addrLine = formatStructuredAddress(property);
  const isMetro = ctx.radiusKm === 1;
  const propertyLines = [
    `物件地址：${addrLine}`,
    `座標：${
      ctx.lat != null && ctx.lng != null
        ? `${ctx.lat.toFixed(6)}, ${ctx.lng.toFixed(6)}`
        : '（未設定）'
    }`,
    `附近範圍：${isMetro ? '直轄市方圓 1 公里' : '非直轄市方圓 2 公里'}（直線距離）`,
  ];

  const generated: Array<'nearby' | 'street_section' | 'village'> = [];
  const notes: string[] = [];

  if (pool.length === 0 && !process.env.LVR_COMPARABLES_JSON_PATH?.trim()) {
    notes.push(
      '尚未設定 LVR_COMPARABLES_JSON_PATH，成交列表為空。請匯入內政部開放資料並產出 JSON 後設定此環境變數。',
    );
  } else if (pool.length === 0) {
    notes.push('成交資料庫為空或 JSON 無法解析，請檢查 LVR_COMPARABLES_JSON_PATH 檔案內容。');
  }

  if (ctx.lat == null || ctx.lng == null) {
    notes.push('未設定 WGS84 座標時，「附近成交價」報表將無列案（請至「地圖／座標」補齊）。');
  }

  if (!property.addressStreet?.trim() && ctx.landSectionTokens.length === 0) {
    notes.push('無門牌路街且無法自謄本擷取地段時，「同街段成交價」報表將無列案。');
  }

  if (!property.addressVillage?.trim()) {
    notes.push('未填寫村里名稱時，「同里成交價」報表將無列案（請至「地理資訊」填寫里名）。');
  }

  const generatedAtLabel = `產製時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`;

  const adminClient = createAdminClient();

  try {
    const nearbyPdf = await buildComparableSalesPdf({
      kind: 'nearby',
      reportTitle: '附近成交價（近一年）',
      criteriaLines: [
        `同一縣市（${ctx.city}）內，與本物件座標直線距離 ≤ ${ctx.radiusKm} 公里之案件`,
        '交易日期：最近一年內',
      ],
      propertyLines,
      warnings:
        ctx.lat == null || ctx.lng == null
          ? ['本物件未設定座標，故篩選結果為空。']
          : [],
      rows: nearbyRows,
      generatedAtLabel,
    });
    await saveComparablePdf({
      adminClient,
      propertyId,
      ownerId: property.ownerId,
      docType: 'transaction_comparables_nearby',
      kindTag: 'comparable:kind:nearby',
      pdfBytes: nearbyPdf,
    });
    generated.push('nearby');

    const streetPdf = await buildComparableSalesPdf({
      kind: 'street_section',
      reportTitle: '同街段成交價（近一年）',
      criteriaLines: [
        `行政區：${ctx.city}${ctx.district}`,
        `門牌路街與物件相同（${ctx.street || '—'}），或地段關鍵字與謄本／地號一致：${
          ctx.landSectionTokens.length > 0 ? ctx.landSectionTokens.join('、') : '（無）'
        }`,
        '交易日期：最近一年內',
      ],
      propertyLines,
      warnings: [],
      rows: streetRows,
      generatedAtLabel,
    });
    await saveComparablePdf({
      adminClient,
      propertyId,
      ownerId: property.ownerId,
      docType: 'transaction_comparables_street_section',
      kindTag: 'comparable:kind:street_section',
      pdfBytes: streetPdf,
    });
    generated.push('street_section');

    const villagePdf = await buildComparableSalesPdf({
      kind: 'village',
      reportTitle: '同里成交價（近一年）',
      criteriaLines: [
        `行政區：${ctx.city}${ctx.district}`,
        `村里：${ctx.village ?? '（未填寫）'}`,
        '交易日期：最近一年內',
      ],
      propertyLines,
      warnings: [],
      rows: villageRows,
      generatedAtLabel,
    });
    await saveComparablePdf({
      adminClient,
      propertyId,
      ownerId: property.ownerId,
      docType: 'transaction_comparables_village',
      kindTag: 'comparable:kind:village',
      pdfBytes: villagePdf,
    });
    generated.push('village');

    revalidatePath('/superadmin/properties');
    revalidatePath(`/superadmin/properties/${propertyId}/edit`);

    return {
      success: true,
      message: '已產出並儲存三份成交行情 PDF（附近／同街段／同里）。',
      generated,
      notes: notes.length > 0 ? notes : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `產出失敗：${msg}`, notes: notes.length > 0 ? notes : undefined };
  }
}
