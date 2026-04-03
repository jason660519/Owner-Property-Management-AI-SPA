// filepath: apps/superadmin/lib/utils/real-price-comparable-source.ts
// Load real-price transaction data. Priority: DB → auto-fetch from government → JSON fallback.

import { createAdminClient } from '@/utils/supabase/admin';
import type { NormalizedComparableSale, PropertyComparableContext } from '@/lib/utils/real-price-comparables';
import { autoFetchLvrDataIfNeeded, resolveCityName } from '@/lib/utils/lvr-open-data';

/** 從資料庫載入最近一年的成交資料 (按縣市＋行政區篩選，支援 台/臺 正規化) */
export async function loadComparableSalesFromDb(ctx: PropertyComparableContext): Promise<{
  rows: NormalizedComparableSale[];
  dbError?: string;
}> {
  const adminClient = createAdminClient();
  const start = new Date(ctx.asOf);
  start.setFullYear(start.getFullYear() - 1);

  // Normalize city name (台北市 → 臺北市) to match DB convention
  const normalizedCity = resolveCityName(ctx.city);

  // Use district to narrow down the pool (1000+ per district is still common in big cities)
  // Implementing pagination to fetch all rows for the city/district
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await adminClient
      .from('lvr_land_transactions')
      .select('*')
      .eq('city', normalizedCity)
      .eq('district', ctx.district)
      .gte('transaction_date', start.toISOString().slice(0, 10))
      .lte('transaction_date', ctx.asOf.toISOString().slice(0, 10))
      .order('transaction_date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return { rows: allRows.length > 0 ? mapToNormalized(allRows) : [], dbError: error.message };
    }

    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;

    // Safety limit to avoid infinite loop or memory blowup
    if (allRows.length >= 10000) break;
  }

  return { rows: mapToNormalized(allRows) };
}

function mapToNormalized(data: any[]): NormalizedComparableSale[] {
  return data.map((o) => ({
    transactionDate: o.transaction_date,
    totalPriceTwd: Number(o.total_price_twd),
    buildingAreaSqm: o.building_area_sqm ? Number(o.building_area_sqm) : null,
    unitPricePerSqm: o.unit_price_per_sqm ? Number(o.unit_price_per_sqm) : null,
    buildingType: o.building_type,
    floor: o.floor,
    addressSnippet: o.address_snippet,
    latitude: o.latitude,
    longitude: o.longitude,
    city: o.city,
    district: o.district,
    village: o.village,
    landSectionTokens: o.land_section_tokens || [],
  }));
}

export interface LoadComparablesResult {
  rows: NormalizedComparableSale[];
  /** Notes about auto-fetch progress */
  fetchNotes: string[];
}

/**
 * Load comparable sales: DB first, auto-fetch from government if empty, then retry DB.
 */
export async function loadComparableSalesCombined(ctx: PropertyComparableContext): Promise<LoadComparablesResult> {
  const notes: string[] = [];

  // 1. Try DB first
  let { rows, dbError } = await loadComparableSalesFromDb(ctx);
  if (dbError) {
    notes.push(`讀取成交資料表失敗（請確認已執行 migration：lvr_land_transactions）：${dbError}`);
  }
  if (rows.length > 0) {
    return { rows, fetchNotes: notes };
  }

  // 2. DB empty → auto-fetch from government open data
  const fetchResult = await autoFetchLvrDataIfNeeded(ctx.city, ctx.asOf);

  if (fetchResult.fetched) {
    notes.push(fetchResult.message);

    if (fetchResult.totalInserted > 0) {
      const second = await loadComparableSalesFromDb(ctx);
      rows = second.rows;
      if (second.dbError) {
        notes.push(`匯入後讀取失敗：${second.dbError}`);
      }
      return { rows, fetchNotes: notes };
    }
  } else if (fetchResult.message) {
    notes.push(fetchResult.message);
  }

  return { rows: [], fetchNotes: notes };
}
