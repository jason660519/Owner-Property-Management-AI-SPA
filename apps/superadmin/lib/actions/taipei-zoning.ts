// filepath: apps/superadmin/lib/actions/taipei-zoning.ts
// Query Taipei City zoning data from zone.udd.gov.taipei
'use server';

import { parseLandNumber } from '@/lib/utils/taipei-land-number-parser';

const BASE_URL = 'https://zone.udd.gov.taipei/ashx';

interface QueryResult {
  Success: boolean;
  Code: string;
  DataInfo: string;
}

interface DropdownItem {
  [key: string]: string | number;
}

export interface TaipeiZoningOption {
  id: string;
  label: string;
}

export interface TaipeiZoningLotOption extends TaipeiZoningOption {
  motherNo: string;
  childNo: string;
}

export interface TaipeiZoningOfficialQueryInput {
  label: string;
  mode: 'single' | 'range';
  secId: string;
  sectionId: string;
  subsectionId: string;
  motherNo?: string;
  childNo?: string;
  rangeStartNo?: string;
  rangeEndNo?: string;
}

interface QueryZonePayload {
  options: '單筆查詢' | '連號查詢';
  num: string;
  secid: string;
  aresecid: string;
  aresubid: string;
  aremno: string;
  arepno: string;
  aremnostart: string;
  aremnoend: string;
}

// POST JSON to the Taipei zoning AJAX endpoints
async function postQuery(endpoint: string, body: Record<string, string>): Promise<DropdownItem[]> {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://zone.udd.gov.taipei',
      'Referer': 'https://zone.udd.gov.taipei/ZoneSearch.aspx',
    },
    body: JSON.stringify(body),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`台北市使用分區 API 回傳錯誤 (${res.status})`);
  const json = (await res.json()) as QueryResult;
  if (!json.Success) throw new Error(`API 錯誤: ${json.Code}`);

  try {
    return JSON.parse(json.DataInfo) as DropdownItem[];
  } catch {
    throw new Error(`無法解析 API 回傳資料 (DataInfo): ${json.DataInfo.substring(0, 100)}...`);
  }
}

/**
 * Find the best matching item from a dropdown list by comparing text.
 * Handles potential key casing differences.
 */
function findMatch(
  items: DropdownItem[],
  textKey: string,
  target: string
): DropdownItem | null {
  if (!target || !items.length) return null;

  const normalizedTarget = target.trim();

  const firstItem = items[0];
  const actualKey = Object.keys(firstItem).find(k => k.toLowerCase() === textKey.toLowerCase()) || textKey;

  const exact = items.find((it) => String(it[actualKey] || '').trim() === normalizedTarget);
  if (exact) return exact;

  const contains = items.find((it) => {
    const val = String(it[actualKey] ?? '').trim();
    return val.includes(normalizedTarget) || normalizedTarget.includes(val);
  });
  return contains ?? null;
}

function normalizedApiString(value: string | number | undefined): string {
  return String(value ?? '').trim().replace(/\.0$/, '');
}

export async function getTaipeiZoningDistrictOptions(): Promise<TaipeiZoningOption[]> {
  const districts = await postQuery('Query.ashx', { options: 'Sec' });
  return districts
    .map((item) => ({
      id: normalizedApiString(item.SECID),
      label: normalizedApiString(item.SEC),
    }))
    .filter((item) => item.id && item.label);
}

export async function getTaipeiZoningSectionOptions(secId: string): Promise<TaipeiZoningOption[]> {
  if (!secId) return [];
  const sections = await postQuery('Query.ashx', { options: 'AreSec', secid: secId });
  return sections
    .map((item) => ({
      id: normalizedApiString(item.ARESECID),
      label: normalizedApiString(item.ARESEC),
    }))
    .filter((item) => item.id && item.label);
}

export async function getTaipeiZoningSubsectionOptions(
  secId: string,
  sectionId: string,
): Promise<TaipeiZoningOption[]> {
  if (!secId || !sectionId) return [];
  const subsections = await postQuery('Query.ashx', {
    options: 'AreSub',
    secid: secId,
    aresecid: sectionId,
  });
  return subsections
    .map((item) => ({
      id: normalizedApiString(item.AreSubID),
      label: normalizedApiString(item.AreSub),
    }))
    .filter((item) => item.id && item.label);
}

export async function getTaipeiZoningLotOptions(
  secId: string,
  sectionId: string,
  subsectionId: string,
): Promise<TaipeiZoningLotOption[]> {
  if (!secId || !sectionId || !subsectionId) return [];
  const lots = await postQuery('Query.ashx', {
    options: 'AremnoArepno',
    secid: secId,
    aresecid: sectionId,
    aresubid: subsectionId,
  });
  return lots
    .map((item) => {
      const motherNo = normalizedApiString(item.AREMNO);
      const childNo = normalizedApiString(item.AREPNO || '0');
      const label = childNo === '0' ? motherNo : `${motherNo}-${childNo}`;
      return {
        id: `${motherNo}-${childNo}`,
        label,
        motherNo,
        childNo,
      };
    })
    .filter((item) => item.motherNo);
}

async function queryZoningPayload(
  queryPayload: QueryZonePayload[],
): Promise<Record<string, string>[]> {
  const zoningRes = await fetch(`${BASE_URL}/QueryZone.ashx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Origin': 'https://zone.udd.gov.taipei',
      'Referer': 'https://zone.udd.gov.taipei/ZoneSearch.aspx',
    },
    body: JSON.stringify(queryPayload),
  });
  if (!zoningRes.ok) throw new Error(`使用分區查詢請求失敗 (${zoningRes.status})`);

  const zoningJson = (await zoningRes.json()) as QueryResult;
  if (!zoningJson.Success || zoningJson.Code !== '0000') {
    throw new Error(`查詢失敗（${zoningJson.Code}）：該地號可能不存在於系統中。`);
  }

  return JSON.parse(zoningJson.DataInfo) as Record<string, string>[];
}

function normalizeLotDigits(value: string | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

export async function queryTaipeiZoningOfficialInput(
  input: TaipeiZoningOfficialQueryInput,
): Promise<TaipeiZoningResult> {
  try {
    if (!input.secId || !input.sectionId || !input.subsectionId) {
      return {
        success: false,
        message: '請先選擇行政區、地段與小段。',
      };
    }

    const motherNo = normalizeLotDigits(input.motherNo);
    const childNo = normalizeLotDigits(input.childNo || '0');
    const rangeStartNo = normalizeLotDigits(input.rangeStartNo);
    const rangeEndNo = normalizeLotDigits(input.rangeEndNo);

    if (input.mode === 'single' && !motherNo) {
      return {
        success: false,
        message: '請先選擇地號。',
      };
    }
    if (input.mode === 'range' && (!rangeStartNo || !rangeEndNo)) {
      return {
        success: false,
        message: '請輸入連續地號起號與迄號。',
      };
    }

    const start = Number(rangeStartNo);
    const end = Number(rangeEndNo);
    const orderedStart = input.mode === 'range' ? String(Math.min(start, end)) : '';
    const orderedEnd = input.mode === 'range' ? String(Math.max(start, end)) : '';

    const records = await queryZoningPayload([{
      options: input.mode === 'single' ? '單筆查詢' : '連號查詢',
      num: '1',
      secid: input.secId,
      aresecid: input.sectionId,
      aresubid: input.subsectionId,
      aremno: input.mode === 'single' ? motherNo.padStart(4, '0') : '',
      arepno: input.mode === 'single' ? childNo.padStart(4, '0') : '',
      aremnostart: orderedStart,
      aremnoend: orderedEnd,
    }]);

    if (records.length === 0) {
      return {
        success: false,
        message: '查詢成功但無資料，該地號可能尚未登錄使用分區。',
      };
    }

    const zoneValues = Array.from(new Set(records.map((record) => record['使用分區']).filter(Boolean)));
    return {
      success: true,
      message: input.mode === 'range' ? `查詢成功，共 ${records.length} 筆資料` : '查詢成功',
      data: {
        zone: zoneValues.join('、'),
        note: records[0]['其他規定'] || '',
        raw: records,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `查詢台北市使用分區時發生錯誤：${msg}`,
    };
  }
}

export interface TaipeiZoningResult {
  success: boolean;
  message: string;
  data?: {
    zone: string;
    note: string;
    raw: Record<string, string>[];
  };
  parsedInput?: {
    district: string;
    section: string;
    subsection: string;
    motherNo: string;
    childNo: string;
  };
}

/**
 * Query Taipei City zoning info for a given land number.
 * @param landNumber - e.g. "大安區仁愛段二小段 0367-0000"
 * @param districtHint - e.g. "大安區" (from property address, used as fallback)
 */
export async function queryTaipeiZoning(
  landNumber: string,
  districtHint?: string
): Promise<TaipeiZoningResult> {
  const parsed = parseLandNumber(landNumber);
  if (!parsed) {
    return {
      success: false,
      message: `無法解析地號格式：「${landNumber}」。預期格式如「大安區仁愛段二小段 0367-0000」`,
    };
  }

  // Use district from land number, fallback to property address
  const districtName = parsed.district || districtHint || '';
  if (!districtName) {
    return {
      success: false,
      message: '無法判斷行政區，請確認土地謄本地號包含行政區（如「大安區」）或物件地址已填寫。',
      parsedInput: parsed,
    };
  }

  try {
    // Step 1: Get district list → find ID
    const districts = await postQuery('Query.ashx', { options: 'Sec' });
    // API returns district with 區 suffix (e.g. "大安區"), match directly
    const districtItem = findMatch(districts, 'SEC', districtName.endsWith('區') ? districtName : `${districtName}區`);
    if (!districtItem) {
      return {
        success: false,
        message: `在台北市使用分區系統中找不到行政區「${districtName}」。可能不屬於台北市。`,
        parsedInput: parsed,
      };
    }
    const secId = String(districtItem['SECID']).replace('.0', '');

    // Step 2: Get section list → find ID
    const sections = await postQuery('Query.ashx', { options: 'AreSec', secid: secId });
    const sectionName = parsed.section.replace('段', '');
    const sectionItem = findMatch(sections, 'ARESEC', sectionName);
    if (!sectionItem) {
      return {
        success: false,
        message: `在「${districtName}」下找不到地段「${parsed.section}」。可用地段：${sections.map((s) => s['ARESEC']).join('、')}`,
        parsedInput: parsed,
      };
    }
    const areSecId = String(sectionItem['ARESECID']).replace('.0', '');

    // Step 3: Get subsection list → find ID (may be empty if no subsections)
    const subsections = await postQuery('Query.ashx', {
      options: 'AreSub',
      secid: secId,
      aresecid: areSecId,
    });

    let areSubId = '';
    if (subsections.length > 0 && parsed.subsection) {
      const subName = parsed.subsection.replace('小段', '');
      const subItem = findMatch(subsections, 'AreSub', subName);
      if (!subItem) {
        return {
          success: false,
          message: `在「${parsed.section}」下找不到小段「${parsed.subsection}」。可用小段：${subsections.map((s) => s['AreSub']).join('、')}`,
          parsedInput: parsed,
        };
      }
      areSubId = String(subItem['AreSubID']);
    } else if (subsections.length > 0) {
      // No subsection specified, use first one (often there's only one)
      areSubId = String(subsections[0]['AreSubID']);
    }

    const motherNoPadded = parsed.motherNo.padStart(4, '0');
    const childNoPadded = parsed.childNo.padStart(4, '0');

    const queryPayload: QueryZonePayload[] = [{
      options: '單筆查詢',
      num: '1',
      secid: secId,
      aresecid: areSecId,
      aresubid: areSubId,
      aremno: motherNoPadded,
      arepno: childNoPadded,
      aremnostart: '',
      aremnoend: '',
    }];

    const records = await queryZoningPayload(queryPayload);
    if (records.length === 0) {
      return {
        success: false,
        message: '查詢成功但無資料，該地號可能尚未登錄使用分區。',
        parsedInput: parsed,
      };
    }

    // Extract zoning info — API returns Chinese field names
    const first = records[0];
    const zoneValue = first['使用分區'] || '';
    const noteValue = first['其他規定'] || '';

    return {
      success: true,
      message: '查詢成功',
      data: {
        zone: zoneValue,
        note: noteValue,
        raw: records,
      },
      parsedInput: parsed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `查詢台北市使用分區時發生錯誤：${msg}`,
      parsedInput: parsed,
    };
  }
}
