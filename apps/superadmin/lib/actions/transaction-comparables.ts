// filepath: apps/superadmin/lib/actions/transaction-comparables.ts
// 自動產出實價成交行情 PDF（附近／同街段）並寫入 property_documents

'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/utils/supabase/admin';
import { getPropertyById, updateProperty } from '@/lib/actions/properties';
import {
  buildComparableContextFromProperty,
  filterNearbyComparables,
  filterStreetSectionComparables,
  normalizeComparableAddressText,
  normalizeTaiwanAddress,
  type NormalizedComparableSale,
} from '@/lib/utils/real-price-comparables';
import { loadComparableSalesCombined } from '@/lib/utils/real-price-comparable-source';
import { buildComparableSalesPdf } from '@/lib/utils/real-price-comparable-pdf';
import { geocodeAddress } from '@/lib/utils/geocoding';

export type TransactionComparableDocType =
  | 'transaction_comparables_nearby'
  | 'transaction_comparables_street_section';

const DOC_DISPLAY: Record<TransactionComparableDocType, string> = {
  transaction_comparables_nearby: '附近成交價',
  transaction_comparables_street_section: '同街段成交價',
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
  displayLabel?: string;
}): Promise<void> {
  const { adminClient, propertyId, ownerId, docType, kindTag, pdfBytes, displayLabel } = args;
  await removePriorAutoComparable(adminClient, propertyId, kindTag);

  const dayStamp = new Date().toISOString().slice(0, 10);
  const storagePath = `${propertyId}/comparable-${kindTag.replace(/:/g, '-')}-${Date.now()}.pdf`;
  const label = displayLabel ?? DOC_DISPLAY[docType];

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

export type GenerateSingleComparableResult = {
  success: boolean;
  message: string;
  notes?: string[];
};

export type ManualTransactionComparableMode = 'nearby' | 'street_section';

export type ManualTransactionComparableInput = {
  mode: ManualTransactionComparableMode;
  radiusKm?: number;
  addressKeyword?: string;
  street?: string;
  landSection?: string;
  startYearMonth?: string;
  endYearMonth?: string;
};

function parseYearMonthRange(input: ManualTransactionComparableInput): {
  startDate: Date;
  endDate: Date;
  label: string;
} {
  const now = new Date();
  const fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fallbackStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const parseStart = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallbackStart;
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1);
  };
  const parseEnd = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return fallbackEnd;
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month, 0);
  };
  const startDate = parseStart(input.startYearMonth);
  const endDate = parseEnd(input.endYearMonth);
  if (startDate > endDate) {
    throw new Error('交易期間起日不可晚於迄日');
  }
  return {
    startDate,
    endDate,
    label: `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')} 至 ${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`,
  };
}

function applyAddressKeywordFilter<T extends NormalizedComparableSale>(
  rows: T[],
  keyword?: string,
): T[] {
  const key = normalizeComparableAddressText(keyword?.trim() ?? '');
  if (key.length < 2) return rows;
  return rows.filter((row) => normalizeComparableAddressText(row.addressSnippet).includes(key));
}

/** 產出單份「附近成交價」PDF */
export async function generateNearbyComparableDocument(
  propertyId: string,
  radiusKm?: number,
): Promise<GenerateSingleComparableResult> {
  const property = await getPropertyById(propertyId);
  if (!property || property.type !== 'sale') {
    return { success: false, message: '找不到物件或非出售物件' };
  }

  const notes: string[] = [];

  // Build context first (also extracts village from street if needed)
  const ctx = buildComparableContextFromProperty(property);
  if (!ctx) return { success: false, message: '請先補齊物件縣市與行政區' };

  // Override radius if provided
  if (radiusKm && radiusKm > 0) {
    ctx.radiusKm = radiusKm;
  }

  // Auto-geocode if no coordinates: use cleaned address (without village in street)
  if (ctx.lat == null || ctx.lng == null) {
    const geo = await geocodeAddress({
      city: ctx.city,
      district: ctx.district,
      street: ctx.street,
      number: property.addressNumber || '',
      rawAddress: property.address,
    });

    if (geo) {
      ctx.lat = geo.lat;
      ctx.lng = geo.lng;
      await updateProperty(property.id, property.type, {
        latitude: geo.lat,
        longitude: geo.lng,
      });
      notes.push(`[自動定位成功] ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}（${geo.displayName}）`);
    } else {
      notes.push(`[自動定位失敗] 無法從地址取得座標，請手動在「Google 地圖定位」頁標記位置以啟用精確半徑篩選。`);
    }
  }

  const { rows: pool, fetchNotes } = await loadComparableSalesCombined(ctx);
  notes.push(...fetchNotes);

  const rows = filterNearbyComparables(pool, ctx);

  if (pool.length === 0 && fetchNotes.length === 0) notes.push('成交資料庫為空，且無法自動取得資料。');
  const hasStreetKey = normalizeComparableAddressText(ctx.street).length >= 2;
  if (ctx.lat == null || ctx.lng == null) {
    notes.push(
      '物件尚無 WGS84：附近成交改以「編輯頁所填縣市／行政區／路街」與實價位置摘要比對（距離欄為 —）；自動定位成功後可改以半徑篩選。',
    );
  } else if (rows.some((r) => r.distanceKm == null)) {
    notes.push(
      '部分成交案件無政府開放資料座標，已改以同行政區＋同路街近似列出（距離欄為 —）。',
    );
  }

  const addrLine = `${ctx.city}${ctx.district}${ctx.street}${property.addressNumber || ''}`;
  const radiusLabel = `${ctx.radiusKm}km`;

  const propertyLines = [
    `物件地址：${addrLine}`,
    `座標：${ctx.lat?.toFixed(6) ?? '未偵測'}, ${ctx.lng?.toFixed(6) ?? '未偵測'}`,
    `附近範圍：${radiusLabel}`,
  ];

  const nearbyCriteria =
    ctx.lat != null && ctx.lng != null
      ? [`直線距離 ≤ ${ctx.radiusKm} 公里（有座標時）`, '交易日期：最近一年內']
      : [
          '同縣市、同行政區且路街與編輯頁地址一致（無 WGS84 時之近似）',
          '交易日期：最近一年內',
        ];

  const nearbyWarnings: string[] = [];
  if (rows.length === 0 && pool.length > 0) {
    if (!hasStreetKey) {
      nearbyWarnings.push('門牌路街過短或空白：請在「物件編輯」頁補齊結構化地址。');
    } else {
      nearbyWarnings.push('資料庫有成交資料，但無符合「附近」條件之案件。');
    }
  }

  const adminClient = createAdminClient();
  const pdf = await buildComparableSalesPdf({
    kind: 'nearby',
    reportTitle: `附近成交價 ${radiusLabel}（近一年）`,
    criteriaLines: nearbyCriteria,
    propertyLines,
    warnings: nearbyWarnings,
    rows,
    generatedAtLabel: `產製時間：${new Date().toLocaleString('zh-TW')}`,
  });

  await saveComparablePdf({
    adminClient,
    propertyId,
    ownerId: property.ownerId,
    docType: 'transaction_comparables_nearby',
    kindTag: `comparable:kind:nearby:${radiusLabel}`,
    pdfBytes: pdf,
    displayLabel: `附近成交價-${radiusLabel}`,
  });

  revalidatePath(`/superadmin/properties/${propertyId}/edit`);
  return { success: true, message: '附近成交價產出成功', notes };
}

/** 產出單份「同街段成交價」PDF */
export async function generateStreetSectionComparableDocument(
  propertyId: string,
): Promise<GenerateSingleComparableResult> {
  const property = await getPropertyById(propertyId);
  if (!property || property.type !== 'sale') return { success: false, message: '找不到物件' };
  const ctx = buildComparableContextFromProperty(property);
  if (!ctx) return { success: false, message: '地址不完整' };

  const { rows: pool, fetchNotes } = await loadComparableSalesCombined(ctx);
  const rows = filterStreetSectionComparables(pool, ctx);
  const notes: string[] = [...fetchNotes];
  if (pool.length === 0 && fetchNotes.length === 0) notes.push('成交資料庫為空，且無法自動取得資料。');
  if (pool.length > 0 && rows.length === 0) {
    notes.push(
      '資料庫有成交資料但無符合「同街段／地段」條件之案件（請確認路街或謄本地段關鍵字）。',
    );
  }

  const addrLine = `${ctx.city}${ctx.district}${ctx.street}${property.addressNumber || ''}`;

  const adminClient = createAdminClient();
  const pdf = await buildComparableSalesPdf({
    kind: 'street_section',
    reportTitle: '同街段成交價（近一年）',
    criteriaLines: [
      `行政區：${ctx.city}${ctx.district}`,
      `門牌路街：${ctx.street || '—'}`,
      `地段關鍵字：${ctx.landSectionTokens.join('、') || '—'}`,
    ],
    propertyLines: [`物件地址：${addrLine}`],
    warnings: [],
    rows,
    generatedAtLabel: `產製時間：${new Date().toLocaleString('zh-TW')}`,
  });

  await saveComparablePdf({
    adminClient,
    propertyId,
    ownerId: property.ownerId,
    docType: 'transaction_comparables_street_section',
    kindTag: 'comparable:kind:street_section',
    pdfBytes: pdf,
  });

  revalidatePath(`/superadmin/properties/${propertyId}/edit`);
  return { success: true, message: '同街段成交價產出成功', notes };
}

export async function generateManualTransactionComparableDocument(
  propertyId: string,
  input: ManualTransactionComparableInput,
): Promise<GenerateSingleComparableResult> {
  const property = await getPropertyById(propertyId);
  if (!property || property.type !== 'sale') {
    return { success: false, message: '找不到物件或非出售物件' };
  }

  try {
    const { startDate, endDate, label: periodLabel } = parseYearMonthRange(input);
    const ctx = buildComparableContextFromProperty(property, endDate);
    if (!ctx) return { success: false, message: '請先補齊物件縣市與行政區' };

    ctx.startDate = startDate;
    ctx.endDate = endDate;

    const radiusKm = Number(input.radiusKm);
    if (Number.isFinite(radiusKm) && radiusKm > 0) {
      ctx.radiusKm = radiusKm;
    }

    const street = input.street?.trim();
    if (street) {
      ctx.street = street;
    }

    const landSection = input.landSection?.trim();
    if (landSection) {
      ctx.landSectionTokens = [landSection];
    }

    if (ctx.lat == null || ctx.lng == null) {
      const geo = await geocodeAddress({
        city: ctx.city,
        district: ctx.district,
        street: ctx.street,
        number: property.addressNumber || '',
        rawAddress: property.address,
      });

      if (geo) {
        ctx.lat = geo.lat;
        ctx.lng = geo.lng;
        await updateProperty(property.id, property.type, {
          latitude: geo.lat,
          longitude: geo.lng,
        });
      }
    }

    const { rows: pool, fetchNotes } = await loadComparableSalesCombined(ctx);
    const notes: string[] = [...fetchNotes];
    const addressKeyword = input.addressKeyword?.trim();
    const adminClient = createAdminClient();
    const generatedAtLabel = `產製時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`;
    const addrLine = `${ctx.city}${ctx.district}${ctx.street}${property.addressNumber || ''}`;
    const commonPropertyLines = [
      `物件地址：${addrLine}`,
      `區段位置或門牌：${addressKeyword || '（未指定）'}`,
      `交易期間：${periodLabel}`,
    ];

    if (input.mode === 'nearby') {
      const rows = applyAddressKeywordFilter(filterNearbyComparables(pool, ctx), addressKeyword);
      const radiusLabel = `${ctx.radiusKm}km`;
      const pdf = await buildComparableSalesPdf({
        kind: 'nearby',
        reportTitle: `附近成交價 ${radiusLabel}`,
        criteriaLines: [
          '類型：買賣案件',
          `搜尋模式：周邊距離 ${radiusLabel}`,
          `街道：${ctx.street || '—'}`,
          `地段：${ctx.landSectionTokens.join('、') || '—'}`,
          `交易期間：${periodLabel}`,
        ],
        propertyLines: [
          ...commonPropertyLines,
          `座標：${ctx.lat != null && ctx.lng != null ? `${ctx.lat.toFixed(6)}, ${ctx.lng.toFixed(6)}` : '（未設定）'}`,
        ],
        warnings: [],
        rows,
        generatedAtLabel,
      });

      await saveComparablePdf({
        adminClient,
        propertyId,
        ownerId: property.ownerId,
        docType: 'transaction_comparables_nearby',
        kindTag: `comparable:kind:manual:nearby:${radiusLabel}:${startDate.toISOString().slice(0, 7)}:${endDate.toISOString().slice(0, 7)}`,
        pdfBytes: pdf,
        displayLabel: `手動查詢-附近成交價-${radiusLabel}`,
      });
      revalidatePath(`/superadmin/properties/${propertyId}/edit`);
      return { success: true, message: `手動查詢附近成交價 ${radiusLabel} 產出成功`, notes };
    }

    const rows = applyAddressKeywordFilter(filterStreetSectionComparables(pool, ctx), addressKeyword);
    const streetLabel = ctx.street || landSection || '路段地段';
    const pdf = await buildComparableSalesPdf({
      kind: 'street_section',
      reportTitle: '路段／地段成交價',
      criteriaLines: [
        '類型：買賣案件',
        '搜尋模式：路段／地段',
        `街道：${ctx.street || '—'}`,
        `地段：${ctx.landSectionTokens.join('、') || '—'}`,
        `交易期間：${periodLabel}`,
      ],
      propertyLines: commonPropertyLines,
      warnings: [],
      rows,
      generatedAtLabel,
    });

    await saveComparablePdf({
      adminClient,
      propertyId,
      ownerId: property.ownerId,
      docType: 'transaction_comparables_street_section',
      kindTag: `comparable:kind:manual:street:${normalizeTaiwanAddress(streetLabel)}:${startDate.toISOString().slice(0, 7)}:${endDate.toISOString().slice(0, 7)}`,
      pdfBytes: pdf,
      displayLabel: '手動查詢-路段地段成交價',
    });
    revalidatePath(`/superadmin/properties/${propertyId}/edit`);
    return { success: true, message: '手動查詢路段／地段成交價產出成功', notes };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export type GenerateTransactionComparablesResult = {
  success: boolean;
  message: string;
  generated?: Array<'nearby' | 'street_section'>;
  notes?: string[];
};

/**
 * 依物件產出兩份 PDF：附近成交、同街段成交（皆為近一年）。
 * 成交來源：自動從內政部開放資料下載，或讀取已匯入之資料庫。
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

  const geocodeNotes: string[] = [];
  if (ctx.lat == null || ctx.lng == null) {
    const geo = await geocodeAddress({
      city: ctx.city,
      district: ctx.district,
      street: ctx.street,
      number: property.addressNumber || '',
      rawAddress: property.address,
    });

    if (geo) {
      ctx.lat = geo.lat;
      ctx.lng = geo.lng;
      await updateProperty(property.id, property.type, {
        latitude: geo.lat,
        longitude: geo.lng,
      });
      geocodeNotes.push(`[自動定位成功] ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}（${geo.displayName}）`);
    } else {
      geocodeNotes.push(`[自動定位失敗] 無法從地址取得座標，請手動在「Google 地圖定位」頁標記位置以啟用精確半徑篩選。`);
    }
  }

  const { rows: pool, fetchNotes } = await loadComparableSalesCombined(ctx);

  const nearbyRows = filterNearbyComparables(pool, ctx);
  const streetRows = filterStreetSectionComparables(pool, ctx);

  const addrLine = `${ctx.city}${ctx.district}${ctx.street}${property.addressNumber || ''}`;

  const propertyLines = [
    `物件地址：${addrLine}`,
    `座標：${
      ctx.lat != null && ctx.lng != null
        ? `${ctx.lat.toFixed(6)}, ${ctx.lng.toFixed(6)}`
        : '（未設定）'
    }`,
    `附近範圍：${ctx.radiusKm === 1 ? '直轄市方圓 1 公里' : '非直轄市方圓 2 公里'}（直線距離）`,
  ];

  const generated: Array<'nearby' | 'street_section'> = [];
  const notes: string[] = [...geocodeNotes, ...fetchNotes];

  if (pool.length === 0 && fetchNotes.length === 0) {
    notes.push('成交資料庫為空，且無法自動取得資料。');
  }

  const hasStreetKey = normalizeComparableAddressText(ctx.street).length >= 2;
  if (ctx.lat == null || ctx.lng == null) {
    notes.push(
      '物件尚無 WGS84：附近成交改以編輯頁縣市／行政區／路街近似比對；自動定位成功後可改以半徑篩選。',
    );
  } else if (nearbyRows.some((r) => r.distanceKm == null)) {
    notes.push(
      '部分成交案件無政府座標，附近表已改以同行政區＋同路街近似列出（距離欄為 —）。',
    );
  }

  if (!ctx.street && ctx.landSectionTokens.length === 0) {
    notes.push('無門牌路街且無法自謄本擷取地段，「同街段成交價」報表將無列案。');
  }

  const nearbyBatchCriteria =
    ctx.lat != null && ctx.lng != null
      ? [
          `同一縣市（${ctx.city}）內，與本物件座標直線距離 ≤ ${ctx.radiusKm} 公里之案件`,
          '交易日期：最近一年內',
        ]
      : [
          `同一縣市（${ctx.city}）、同行政區且路街與編輯頁一致（無 WGS84 時之近似）`,
          '交易日期：最近一年內',
        ];

  const nearbyBatchWarnings: string[] = [];
  if (nearbyRows.length === 0 && pool.length > 0) {
    if (!hasStreetKey) {
      nearbyBatchWarnings.push('門牌路街過短或空白：請在「物件編輯」頁補齊結構化地址。');
    } else {
      nearbyBatchWarnings.push('資料庫有成交資料，但無符合「附近」條件之案件。');
    }
  }

  const generatedAtLabel = `產製時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`;

  const adminClient = createAdminClient();

  try {
    const nearbyPdf = await buildComparableSalesPdf({
      kind: 'nearby',
      reportTitle: '附近成交價（近一年）',
      criteriaLines: nearbyBatchCriteria,
      propertyLines,
      warnings: nearbyBatchWarnings,
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

    revalidatePath('/superadmin/properties');
    revalidatePath(`/superadmin/properties/${propertyId}/edit`);

    return {
      success: true,
      message: '已產出並儲存成交行情 PDF（附近／同街段）。',
      generated,
      notes: notes.length > 0 ? notes : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, message: `產出失敗：${msg}`, notes: notes.length > 0 ? notes : undefined };
  }
}
