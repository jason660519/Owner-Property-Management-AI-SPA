import type { StructuredAddress } from '@/lib/types/properties';

/**
 * 粗略解析台灣門牌地址，將「完整門牌」拆成「路名 / 門牌號碼 / 樓層 / 單位」。
 *
 * 範例：
 * - 「臺北市大安區仁愛路四段345巷4弄25號3樓之2」
 * - 「大安區仁愛路四段345號」
 * - 「仁愛路四段345巷4弄25號之3」
 */
export function parseTaiwanDoorAddress(full: string): Pick<StructuredAddress, 'city' | 'district' | 'street' | 'number' | 'floor' | 'unit'> {
  const result: Pick<StructuredAddress, 'city' | 'district' | 'street' | 'number' | 'floor' | 'unit'> = {};
  if (!full) return result;

  let s = full.trim();

  // 1) Capture and strip city/district prefix
  //    e.g. 「臺北市大安區仁愛路四段345號」→ city: 臺北市, district: 大安區, rest: 「仁愛路四段345號」
  const cityDistrictPattern = /^([^\d\s]{2,3}(?:市|縣))?([^\d\s]{1,3}(?:區|鎮|鄉|市))?/u;
  const mCity = s.match(cityDistrictPattern);
  if (mCity) {
    if (mCity[1]) result.city = mCity[1];
    if (mCity[2]) result.district = mCity[2];
    s = s.slice((mCity[0] ?? '').length).trim();
  }

  // 2) 抓門牌號碼（含「號」「之X」）
  //    e.g. 345號、345號之2
  let working = s;
  const numberMatch = working.match(/(\d+號(?:之\d+)?)/u);
  if (numberMatch) {
    result.number = numberMatch[1];
    working = working.replace(numberMatch[1], '').trim();
  }

  // 3) 抓樓層：3樓、3F、3層
  const floorMatch = working.match(/(\d+(?:F|樓|層))/u);
  if (floorMatch) {
    result.floor = floorMatch[1];
    working = working.replace(floorMatch[1], '').trim();
  }

  // 4) 抓單位：之2、之3
  const unitMatch = working.match(/之(\d+)/u);
  if (unitMatch) {
    result.unit = `之${unitMatch[1]}`;
    working = working.replace(unitMatch[0], '').trim();
  }

  // 5) 剩下的視為「路／街／段／巷／弄」等組合
  if (!result.street) {
    result.street = working || undefined;
  }

  return result;
}

