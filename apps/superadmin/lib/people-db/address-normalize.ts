// Taiwan address normalizer. Splits raw addresses into county / district /
// road / detail so ES can filter/aggregate by level, and produces a canonical
// string that survives full-width/half-width variation, whitespace, and common
// typos. Used by the import pipeline to populate `address_normalized`.

export interface NormalizedAddress {
  raw: string;
  normalized: string;
  county: string | null;
  district: string | null;
  road: string | null;
  detail: string | null;
}

// Canonical county/city names. Order matters — longer/more specific names
// match first so "新北市" doesn't get parsed as "北市".
const COUNTY_PATTERNS = [
  '臺北市',
  '台北市',
  '新北市',
  '桃園市',
  '臺中市',
  '台中市',
  '臺南市',
  '台南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '嘉義市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '台東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
];

const COUNTY_ALIAS: Record<string, string> = {
  台北市: '臺北市',
  台中市: '臺中市',
  台南市: '臺南市',
  台東縣: '臺東縣',
};

const DISTRICT_SUFFIX_REGEX = /^([^市縣]+?[區鄉鎮市])/;
// Captures the road name plus an optional `N段` suffix so `和平東路二段` is kept
// intact. Downstream detail fields (巷/弄/號/樓) are left in `detail`.
const ROAD_SEGMENT_REGEX =
  /^([^區鄉鎮市]*?(?:路|街|大道|大街)(?:[一二三四五六七八九十百〇零]+段)?)/;

export function normalizeAddress(raw: string): NormalizedAddress {
  const cleaned = collapseWhitespace(toHalfWidth(raw ?? ''));
  if (!cleaned) {
    return { raw: raw ?? '', normalized: '', county: null, district: null, road: null, detail: null };
  }

  let rest = cleaned;
  let county: string | null = null;
  for (const candidate of COUNTY_PATTERNS) {
    if (rest.startsWith(candidate)) {
      county = COUNTY_ALIAS[candidate] ?? candidate;
      rest = rest.slice(candidate.length);
      break;
    }
  }

  let district: string | null = null;
  const districtMatch = rest.match(DISTRICT_SUFFIX_REGEX);
  if (districtMatch) {
    district = districtMatch[1];
    rest = rest.slice(district.length);
  }

  let road: string | null = null;
  const roadMatch = rest.match(ROAD_SEGMENT_REGEX);
  if (roadMatch) {
    road = roadMatch[1];
    rest = rest.slice(road.length);
  }

  const detail = rest || null;
  const normalized = [county ?? '', district ?? '', road ?? '', detail ?? '']
    .join('')
    .trim();

  return {
    raw,
    normalized,
    county,
    district,
    road,
    detail,
  };
}

function toHalfWidth(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code === 0x3000) {
      out += ' ';
    } else if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCharCode(code - 0xfee0);
    } else {
      out += text[i];
    }
  }
  return out;
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, '').trim();
}
