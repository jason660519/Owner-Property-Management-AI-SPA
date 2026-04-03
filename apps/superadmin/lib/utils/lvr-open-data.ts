// filepath: apps/superadmin/lib/utils/lvr-open-data.ts
// Fetch real-price transaction data from 內政部不動產成交案件實際資訊資料供應系統 (Open Data).
// Downloads seasonal CSV ZIPs, parses them, and upserts into lvr_land_transactions.

import JSZip from 'jszip';
import { createAdminClient } from '@/utils/supabase/admin';
import { normalizeTaiwanAddress } from '@/lib/utils/real-price-comparables';

// City name → government file code (lowercase letter prefix in ZIP)
const CITY_CODE_MAP: Record<string, string> = {
  '臺北市': 'a', '臺中市': 'b', '基隆市': 'c', '臺南市': 'd',
  '高雄市': 'e', '新北市': 'f', '宜蘭縣': 'g', '桃園市': 'h',
  '嘉義市': 'i', '新竹縣': 'j', '苗栗縣': 'k', '南投縣': 'm',
  '彰化縣': 'n', '新竹市': 'o', '雲林縣': 'p', '嘉義縣': 'q',
  '屏東縣': 't', '花蓮縣': 'u', '臺東縣': 'v', '金門縣': 'w',
  '澎湖縣': 'x', '連江縣': 'z',
};

// Reverse: code → city name
const CODE_CITY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_CODE_MAP).map(([city, code]) => [code, city]),
);

/** Convert ROC date string (YYYMMDD or YYY/MM/DD) to ISO date (YYYY-MM-DD) */
function rocDateToIso(rocDate: string): string | null {
  const clean = rocDate.replace(/\//g, '').trim();
  if (clean.length < 7) return null;
  const rocYear = parseInt(clean.slice(0, clean.length - 4), 10);
  const month = clean.slice(-4, -2);
  const day = clean.slice(-2);
  if (isNaN(rocYear) || rocYear < 100 || rocYear > 200) return null;
  const adYear = rocYear + 1911;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${adYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Get recent season codes to fetch (last N quarters from asOf date) */
function getRecentSeasons(asOf: Date, count = 4): string[] {
  const year = asOf.getFullYear();
  const month = asOf.getMonth() + 1;
  const rocYear = year - 1911;
  const currentQuarter = Math.ceil(month / 3);

  const seasons: string[] = [];
  let y = rocYear;
  let q = currentQuarter;

  for (let i = 0; i < count; i++) {
    seasons.push(`${y}S${q}`);
    q--;
    if (q < 1) {
      q = 4;
      y--;
    }
  }
  return seasons;
}

/** Resolve city name to normalized form (handles 台→臺) */
export function resolveCityName(input: string): string {
  const normalized = normalizeTaiwanAddress(input);
  // Check direct match
  if (CITY_CODE_MAP[normalized]) return normalized;
  // Check all keys
  for (const key of Object.keys(CITY_CODE_MAP)) {
    if (normalizeTaiwanAddress(key) === normalized) return key;
  }
  return normalized;
}

/** Get city file code from city name */
function getCityCode(cityName: string): string | null {
  const resolved = resolveCityName(cityName);
  return CITY_CODE_MAP[resolved] ?? null;
}

/** Parse a single CSV line respecting quoted fields */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

interface LvrRawRow {
  district: string;
  addressSnippet: string;
  transactionDate: string; // ISO
  buildingType: string | null;
  floor: string | null;
  buildingAreaSqm: number | null;
  totalPriceTwd: number;
  unitPricePerSqm: number | null;
  village: string | null;
}

/** Parse government CSV content into structured rows */
function parseLvrCsv(csvText: string, cityName: string): LvrRawRow[] {
  // Strip BOM if present
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const lines = cleaned.split('\n').map((l) => l.replace(/\r$/, ''));
  if (lines.length < 2) return [];

  // Find the header row (contains '鄉鎮市區')
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].includes('鄉鎮市區')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return [];

  const headers = parseCsvLine(lines[headerIdx]);
  const colIdx = (name: string) => headers.findIndex((h) => h.includes(name));

  const iDistrict = colIdx('鄉鎮市區');
  // Handle both column name variants across data versions
  let iAddr = colIdx('土地位置建物門牌');
  if (iAddr < 0) iAddr = colIdx('土地區段位置建物區段門牌');
  const iDate = colIdx('交易年月日');
  const iBuildType = colIdx('建物型態');
  const iFloor = colIdx('移轉層次');
  const iArea = colIdx('建物移轉總面積平方公尺');
  const iPrice = colIdx('總價元');
  const iUnitPrice = colIdx('單價元平方公尺');

  if (iDistrict < 0 || iAddr < 0 || iDate < 0 || iPrice < 0) {
    console.warn('[LVR CSV] Missing required columns. Headers:', headers.slice(0, 10).join(', '));
    return [];
  }

  const rows: LvrRawRow[] = [];

  // Skip English header row (row right after Chinese header, starts with English text)
  const dataStartIdx = headerIdx + 1;

  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Skip English header row (contains "villages" or "transaction sign")
    if (line.toLowerCase().startsWith('the ') || line.toLowerCase().includes('transaction sign')) continue;

    const fields = parseCsvLine(line);
    const district = fields[iDistrict]?.trim();
    const addrSnippet = fields[iAddr]?.trim();
    const rocDate = fields[iDate]?.trim();
    const priceStr = fields[iPrice]?.trim();

    if (!district || !addrSnippet || !rocDate || !priceStr) continue;

    const transactionDate = rocDateToIso(rocDate);
    if (!transactionDate) continue;

    const totalPrice = parseInt(priceStr, 10);
    if (isNaN(totalPrice) || totalPrice <= 0) continue;

    const areaStr = iArea >= 0 ? fields[iArea]?.trim() : '';
    const unitPriceStr = iUnitPrice >= 0 ? fields[iUnitPrice]?.trim() : '';
    const buildType = iBuildType >= 0 ? fields[iBuildType]?.trim() || null : null;
    const floor = iFloor >= 0 ? fields[iFloor]?.trim() || null : null;

    const area = areaStr ? parseFloat(areaStr) : null;
    const unitPrice = unitPriceStr ? parseFloat(unitPriceStr) : null;

    rows.push({
      district,
      addressSnippet: addrSnippet,
      transactionDate,
      buildingType: buildType,
      floor,
      buildingAreaSqm: area && !isNaN(area) ? area : null,
      totalPriceTwd: totalPrice,
      unitPricePerSqm: unitPrice && !isNaN(unitPrice) ? unitPrice : null,
      village: null, // Government CSV doesn't have a village column; extracted from address if possible
    });
  }

  return rows;
}

/** Try to extract village (里) from address snippet */
function extractVillageFromAddress(addr: string): string | null {
  // Pattern: ...區XXX里... or ...鎮XXX里...
  const match = addr.match(/([\u4e00-\u9fff]{1,4}里)/);
  if (match) return match[1];
  return null;
}

/** Extract land section tokens from address snippet */
function extractSectionTokens(addr: string): string[] {
  const tokens = new Set<string>();
  const re = /([\u4e00-\u9fff○〇]+段)([一二三四五六七八九十百]+小段)?/g;
  for (const m of addr.matchAll(re)) {
    if (m[0]) tokens.add(m[0]);
  }
  return [...tokens];
}

export interface LvrFetchResult {
  season: string;
  rowsFetched: number;
  rowsInserted: number;
  error?: string;
}

/**
 * Fetch one season of LVR data for a specific city and insert into DB.
 * Returns the number of rows inserted.
 */
async function fetchAndImportSeason(
  cityName: string,
  season: string,
): Promise<LvrFetchResult> {
  const cityCode = getCityCode(cityName);
  if (!cityCode) {
    return { season, rowsFetched: 0, rowsInserted: 0, error: `Unknown city: ${cityName}` };
  }

  const resolvedCity = resolveCityName(cityName);
  const url = `https://plvr.land.moi.gov.tw/DownloadSeason?season=${season}&type=csv&fileName=lvr_landcsv.zip`;

  console.log(`[LVR] Fetching ${url} for city=${resolvedCity} (code=${cityCode})`);

  let zipBuffer: ArrayBuffer;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Owner-Property-Management-AI-SPA/1.0',
        Accept: 'application/zip',
      },
    });
    if (!res.ok) {
      return { season, rowsFetched: 0, rowsInserted: 0, error: `HTTP ${res.status}` };
    }
    zipBuffer = await res.arrayBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { season, rowsFetched: 0, rowsInserted: 0, error: `Fetch failed: ${msg}` };
  }

  // Extract the specific city CSV from the ZIP
  // File naming: {cityCode}_lvr_land_a.csv (不動產買賣)
  const targetFileName = `${cityCode}_lvr_land_a.csv`;
  let csvText: string;

  try {
    const zip = await JSZip.loadAsync(zipBuffer);
    const csvFile = zip.file(targetFileName);
    if (!csvFile) {
      // Try case-insensitive search
      const allFiles = Object.keys(zip.files);
      const found = allFiles.find((f) => f.toLowerCase() === targetFileName.toLowerCase());
      if (!found) {
        console.log(`[LVR] CSV file ${targetFileName} not found in ZIP. Available: ${allFiles.join(', ')}`);
        return { season, rowsFetched: 0, rowsInserted: 0, error: `CSV not found in ZIP` };
      }
      csvText = await zip.file(found)!.async('string');
    } else {
      csvText = await csvFile.async('string');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { season, rowsFetched: 0, rowsInserted: 0, error: `ZIP parse failed: ${msg}` };
  }

  const rows = parseLvrCsv(csvText, resolvedCity);
  if (rows.length === 0) {
    return { season, rowsFetched: 0, rowsInserted: 0 };
  }

  // Prepare DB inserts
  const adminClient = createAdminClient();
  const insertPayloads = rows.map((r) => ({
    transaction_date: r.transactionDate,
    total_price_twd: r.totalPriceTwd,
    building_area_sqm: r.buildingAreaSqm,
    unit_price_per_sqm: r.unitPricePerSqm,
    building_type: r.buildingType,
    floor: r.floor,
    address_snippet: r.addressSnippet,
    latitude: null as number | null,
    longitude: null as number | null,
    city: resolvedCity,
    district: r.district,
    village: extractVillageFromAddress(r.addressSnippet),
    land_section_tokens: extractSectionTokens(r.addressSnippet),
  }));

  // Batch upsert (Supabase handles up to ~1000 rows per call)
  // Using onConflict to handle duplicates based on the new unique constraint
  let inserted = 0;
  const batchSize = 500;
  for (let i = 0; i < insertPayloads.length; i += batchSize) {
    const batch = insertPayloads.slice(i, i + batchSize);
    const { error } = await adminClient
      .from('lvr_land_transactions')
      .upsert(batch, { 
        onConflict: 'city,district,transaction_date,total_price_twd,building_area_sqm,address_snippet',
        ignoreDuplicates: true 
      });
      
    if (error) {
      console.error(`[LVR] Upsert batch error:`, error.message);
    } else {
      inserted += batch.length;
    }
  }

  console.log(`[LVR] Season ${season}: parsed ${rows.length}, inserted ${inserted}`);
  return { season, rowsFetched: rows.length, rowsInserted: inserted };
}

/**
 * Check if we already have data for this city in the past year.
 */
async function hasExistingData(cityName: string, asOf: Date): Promise<boolean> {
  const adminClient = createAdminClient();
  const resolved = resolveCityName(cityName);
  const start = new Date(asOf);
  start.setFullYear(start.getFullYear() - 1);

  const { count, error } = await adminClient
    .from('lvr_land_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('city', resolved)
    .gte('transaction_date', start.toISOString().slice(0, 10));

  if (error) {
    console.error('[LVR] Count check error:', error.message);
    return false;
  }
  // Consider "has data" if we have at least 10 rows (filter out stale test data)
  return (count ?? 0) >= 10;
}

export interface LvrAutoFetchResult {
  fetched: boolean;
  totalInserted: number;
  seasonResults: LvrFetchResult[];
  message: string;
}

/**
 * Auto-fetch LVR data for a city if not already cached in DB.
 * Downloads the last 4 seasons in parallel.
 */
export async function autoFetchLvrDataIfNeeded(
  cityName: string,
  asOf = new Date(),
): Promise<LvrAutoFetchResult> {
  const resolved = resolveCityName(cityName);

  if (!getCityCode(resolved)) {
    return {
      fetched: false,
      totalInserted: 0,
      seasonResults: [],
      message: `無法辨識縣市「${cityName}」`,
    };
  }

  // Skip if we already have enough data
  const already = await hasExistingData(resolved, asOf);
  if (already) {
    return {
      fetched: false,
      totalInserted: 0,
      seasonResults: [],
      message: '資料庫已有足夠成交資料',
    };
  }

  console.log(`[LVR] Auto-fetching data for ${resolved}...`);
  const seasons = getRecentSeasons(asOf, 4);

  // Fetch all seasons in parallel
  const results = await Promise.all(
    seasons.map((s) => fetchAndImportSeason(resolved, s)),
  );

  const totalInserted = results.reduce((acc, r) => acc + r.rowsInserted, 0);

  return {
    fetched: true,
    totalInserted,
    seasonResults: results,
    message: totalInserted > 0
      ? `已從內政部開放資料匯入 ${totalInserted} 筆${resolved}成交紀錄（${results.filter((r) => r.rowsInserted > 0).map((r) => r.season).join('、')}）`
      : `嘗試下載但未取得${resolved}成交資料（可能尚未公佈或網路問題）`,
  };
}

/**
 * Fetch LVR data for a city and upsert into DB (Incremental Update).
 */
export async function forceFetchLvrData(
  cityName: string,
  asOf = new Date(),
): Promise<LvrAutoFetchResult> {
  const resolved = resolveCityName(cityName);

  if (!getCityCode(resolved)) {
    return {
      fetched: false,
      totalInserted: 0,
      seasonResults: [],
      message: `無法辨識縣市「${cityName}」`,
    };
  }

  console.log(`[LVR] Fetching latest data for ${resolved} (Incremental)...`);

  const seasons = getRecentSeasons(asOf, 4);
  const results = await Promise.all(
    seasons.map((s) => fetchAndImportSeason(resolved, s)),
  );

  const totalInserted = results.reduce((acc, r) => acc + r.rowsInserted, 0);

  return {
    fetched: true,
    totalInserted,
    seasonResults: results,
    message: totalInserted > 0
      ? `已完成增量更新：從內政部開放資料匯入 ${totalInserted} 筆${resolved}成交紀錄（自動過濾重複紀錄）。`
      : `更新完成，但未發現新的${resolved}成交資料。`,
  };
}
