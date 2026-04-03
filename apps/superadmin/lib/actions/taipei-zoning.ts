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

// POST JSON to the Taipei zoning AJAX endpoints
async function postQuery(endpoint: string, body: Record<string, string>): Promise<DropdownItem[]> {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Taipei zoning API returned ${res.status}`);
  const json = (await res.json()) as QueryResult;
  if (!json.Success) throw new Error(`API error: ${json.Code}`);
  return JSON.parse(json.DataInfo) as DropdownItem[];
}

/**
 * Find the best matching item from a dropdown list by comparing text.
 * The dropdown items have an ID field and a display text field.
 */
function findMatch(
  items: DropdownItem[],
  textKey: string,
  target: string
): DropdownItem | null {
  if (!target) return null;
  // Exact match first
  const exact = items.find((it) => String(it[textKey]) === target);
  if (exact) return exact;
  // Contains match
  const contains = items.find((it) => {
    const val = String(it[textKey] ?? '');
    return val.includes(target) || target.includes(val);
  });
  return contains ?? null;
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

    // Step 4: Query zoning
    const queryPayload = [{
      options: '單筆查詢',
      num: '1',
      secid: secId,
      aresecid: areSecId,
      aresubid: areSubId,
      aremno: parsed.motherNo,
      arepno: parsed.childNo,
      aremnostart: '',
      aremnoend: '',
    }];

    const zoningRes = await fetch(`${BASE_URL}/QueryZone.ashx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(queryPayload),
    });
    if (!zoningRes.ok) throw new Error(`Zoning query returned ${zoningRes.status}`);

    const zoningJson = (await zoningRes.json()) as QueryResult;
    if (!zoningJson.Success || zoningJson.Code !== '0000') {
      return {
        success: false,
        message: `查詢失敗（${zoningJson.Code}）：該地號可能不存在於系統中。`,
        parsedInput: parsed,
      };
    }

    const records = JSON.parse(zoningJson.DataInfo) as Record<string, string>[];
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
