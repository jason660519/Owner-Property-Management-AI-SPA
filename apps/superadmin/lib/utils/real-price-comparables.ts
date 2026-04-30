// filepath: apps/superadmin/lib/utils/real-price-comparables.ts
// Real-price (實價登錄) comparable rules: 六都半徑、同街段、同里、近一年。

import type { PropertyItem } from '@/lib/types/properties';

/** 直轄市（六都）：附近成交半徑 1km；其餘縣市 2km */
const SPECIAL_MUNICIPALITIES = new Set([
  '臺北市',
  '新北市',
  '桃園市',
  '臺中市',
  '臺南市',
  '高雄市',
]);

export interface NormalizedComparableSale {
  transactionDate: string;
  totalPriceTwd: number;
  buildingAreaSqm: number | null;
  unitPricePerSqm: number | null;
  buildingType: string | null;
  floor: string | null;
  /** 政府開放資料之模糊門牌／位置摘要 */
  addressSnippet: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  district: string;
  village: string | null;
  landSectionTokens: string[];
}

export interface PropertyComparableContext {
  city: string;
  district: string;
  street: string;
  village: string | null;
  landSectionTokens: string[];
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  asOf: Date;
  startDate?: Date;
  endDate?: Date;
}

/** 台灣地址通用正規化：台/臺、一/1、空格處理 */
export function normalizeTaiwanAddress(s: string): string {
  if (!s) return '';
  return s
    .replace(/\s/g, '')
    .replace(/台/g, '臺')
    .replace(/一/g, '1')
    .replace(/二/g, '2')
    .replace(/三/g, '3')
    .replace(/四/g, '4')
    .replace(/五/g, '5')
    .replace(/六/g, '6')
    .replace(/七/g, '7')
    .replace(/八/g, '8')
    .replace(/九/g, '9')
    .replace(/十/g, '10') // 簡易處理，實務上十位數需更複雜正則，此處先解決基本匹配
    .trim();
}

export function normalizeTaiwanCity(city: string): string {
  return normalizeTaiwanAddress(city);
}

export function normalizeDistrictLabel(district: string): string {
  return normalizeTaiwanAddress(district);
}

export function isSpecialMunicipality(city: string): boolean {
  return SPECIAL_MUNICIPALITIES.has(normalizeTaiwanCity(city));
}

/** 直轄市 1km，其他縣市 2km */
export function comparableRadiusKmForCity(city: string): number {
  return isSpecialMunicipality(city) ? 1 : 2;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isWithinLastYear(transactionIsoDate: string, asOf: Date): boolean {
  const d = new Date(transactionIsoDate);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date(asOf);
  start.setFullYear(start.getFullYear() - 1);
  return d >= start && d <= asOf;
}

export function isWithinComparablePeriod(
  transactionIsoDate: string,
  ctx: Pick<PropertyComparableContext, 'asOf' | 'startDate' | 'endDate'>,
): boolean {
  const d = new Date(transactionIsoDate);
  if (Number.isNaN(d.getTime())) return false;
  const start = ctx.startDate ? new Date(ctx.startDate) : new Date(ctx.asOf);
  if (!ctx.startDate) {
    start.setFullYear(start.getFullYear() - 1);
  }
  const end = ctx.endDate ? new Date(ctx.endDate) : ctx.asOf;
  return d >= start && d <= end;
}

/** 自謄本／地號字串擷取地段關鍵字（例：仁愛段、仁愛段二小段） */
export function extractLandSectionTokens(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const s = text.replace(/\s/g, '');
  const out = new Set<string>();
  const re = /([\u4e00-\u9fff○〇]+段)([一二三四五六七八九十百]+小段)?/g;
  for (const m of s.matchAll(re)) {
    if (m[0]) out.add(m[0]);
  }
  return [...out];
}

export function buildLandSectionTokensFromProperty(
  property: Pick<PropertyItem, 'landNumber' | 'landTranscript' | 'buildingTranscript'>,
): string[] {
  const texts: string[] = [];
  if (property.landNumber) texts.push(property.landNumber);
  if (property.landTranscript?.description?.landNumber) {
    texts.push(property.landTranscript.description.landNumber);
  }
  if (property.landTranscript?.header?.documentTitle) {
    texts.push(property.landTranscript.header.documentTitle);
  }
  if (property.buildingTranscript?.description?.landParcelNumber) {
    texts.push(property.buildingTranscript.description.landParcelNumber);
  }
  if (property.buildingTranscript?.header?.documentTitle) {
    texts.push(property.buildingTranscript.header.documentTitle);
  }
  const acc = new Set<string>();
  for (const t of texts) {
    for (const tok of extractLandSectionTokens(t)) acc.add(tok);
  }
  return [...acc];
}

function normalizeAddrFragment(s: string): string {
  return s.replace(/\s/g, '').replace(/台/g, '臺').toLowerCase();
}

/**
 * 門牌／位置摘要比對：台→臺、去空白與星號遮罩、全形數字→半形。
 * 刻意不使用 `normalizeTaiwanAddress` 內的一→1、四→4 等替換，以免「四段」被改成「4段」導致比對失敗。
 */
export function normalizeComparableAddressText(s: string): string {
  const noStars = s.replace(/[\s*＊]+/g, '');
  let t = noStars.replace(/台/g, '臺');
  t = t.replace(/[\uFF10-\uFF19]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30),
  );
  return t.toLowerCase();
}

/**
 * Extract village (里) from street field if user typed it there.
 * e.g. "敦化南路一段光武里" → { cleanStreet: "敦化南路一段", village: "光武里" }
 */
function extractVillageFromStreet(street: string): { cleanStreet: string; village: string | null } {
  // Match pattern: ...XXX里 at the end of street, or XXX里 anywhere
  // Village names are typically 2-4 chars + 里
  const match = street.match(/([\u4e00-\u9fff]{1,4}里)$/);
  if (match) {
    return {
      cleanStreet: street.slice(0, -match[1].length).trim(),
      village: match[1],
    };
  }
  // Also try mid-string: "XX里YY路" → not a village suffix, skip
  return { cleanStreet: street, village: null };
}

/**
 * 當 `address_street` 未寫入但 `address` 有完整字串時，扣掉縣市／區／門牌後推斷路街（與編輯頁顯示一致）。
 */
export function inferStreetFromPropertyAddress(
  property: Pick<
    PropertyItem,
    'address' | 'addressCity' | 'addressDistrict' | 'addressStreet' | 'addressNumber'
  >,
): string {
  const fromField = property.addressStreet?.trim();
  if (fromField) return fromField;

  const city = property.addressCity?.trim() ?? '';
  const district = property.addressDistrict?.trim() ?? '';
  let rest = (property.address ?? '').replace(/\s/g, '');
  if (!rest) return '';

  const stripLeading = (s: string, prefix: string): string => {
    if (!prefix) return s;
    const variants = [
      prefix.replace(/\s/g, ''),
      prefix.replace(/\s/g, '').replace(/台/g, '臺'),
      prefix.replace(/\s/g, '').replace(/臺/g, '台'),
    ];
    for (const v of variants) {
      if (s.startsWith(v)) return s.slice(v.length);
    }
    return s;
  };

  rest = stripLeading(rest, city);
  rest = stripLeading(rest, district);

  const num = property.addressNumber?.replace(/\s/g, '') ?? '';
  if (num.length >= 1 && rest.endsWith(num)) {
    rest = rest.slice(0, -num.length);
  }
  rest = rest.replace(/(\d|０-９)+樓.*$/u, '');
  rest = rest.replace(/之\d+.*$/u, '');
  rest = rest.replace(/^[之]+/, '');
  const trimmed = rest.trim();
  if (trimmed.length >= 2) return trimmed;

  const raw = (property.address ?? '').replace(/\s/g, '');
  const m = raw.match(
    /([\u4e00-\u9fff○〇]{2,}(?:路|街)(?:[一二三四五六七八九十百千]+段|[\u4e00-\u9fff○〇]{1,4}(?:巷|弄))?)/,
  );
  return m?.[1]?.trim() ?? '';
}

export function buildComparableContextFromProperty(
  property: PropertyItem,
  asOf = new Date(),
): PropertyComparableContext | null {
  const city = property.addressCity?.trim() ?? '';
  const district = property.addressDistrict?.trim() ?? '';
  if (!city || !district) return null;

  const rawStreet =
    property.addressStreet?.trim() || inferStreetFromPropertyAddress(property);
  const villageFromField = property.addressVillage?.trim() ?? '';

  // If user typed village (里) in the street field, extract it
  const { cleanStreet, village: villageFromStreet } = extractVillageFromStreet(rawStreet);
  const village = villageFromField.length > 0
    ? villageFromField
    : villageFromStreet;

  return {
    city,
    district,
    street: cleanStreet,
    village,
    landSectionTokens: buildLandSectionTokensFromProperty(property),
    lat: property.latitude ?? null,
    lng: property.longitude ?? null,
    radiusKm: comparableRadiusKmForCity(city),
    asOf,
  };
}

function sameCityAndDistrict(
  row: NormalizedComparableSale,
  ctx: PropertyComparableContext,
): boolean {
  return (
    normalizeTaiwanCity(row.city) === normalizeTaiwanCity(ctx.city) &&
    normalizeDistrictLabel(row.district) === normalizeDistrictLabel(ctx.district)
  );
}

function sameCity(row: NormalizedComparableSale, ctx: PropertyComparableContext): boolean {
  return normalizeTaiwanCity(row.city) === normalizeTaiwanCity(ctx.city);
}

export type NearbyComparableRow = NormalizedComparableSale & {
  /** 直線距離；開放資料無座標時改以同行政區＋路街近似，為 null */
  distanceKm: number | null;
};

/** 路街比對用關鍵字（正規化後）；可擴充多組以後援比對 */
export function buildStreetMatchKeys(street: string): string[] {
  const n = normalizeComparableAddressText(street);
  if (n.length < 2) return [];
  const keys = new Set<string>([n]);
  return [...keys];
}

function matchesStreetDistrictFallback(
  row: NormalizedComparableSale,
  ctx: PropertyComparableContext,
  streetKeys: string[],
): boolean {
  if (normalizeDistrictLabel(row.district) !== normalizeDistrictLabel(ctx.district)) return false;
  if (streetKeys.length === 0) return false;
  const snippetKey = normalizeComparableAddressText(row.addressSnippet);
  return streetKeys.some((k) => k.length >= 2 && snippetKey.includes(k));
}

/**
 * 附近成交：有物件座標時優先 Haversine（直轄市 1km／其他 2km）；案件無座標或無法定位時改同行政區＋路街。
 * 無物件座標時（僅能依編輯頁結構化地址）亦以同行政區＋路街近似，距離欄為 —。
 */
export function filterNearbyComparables(
  rows: NormalizedComparableSale[],
  ctx: PropertyComparableContext,
): NearbyComparableRow[] {
  const streetKeys = buildStreetMatchKeys(ctx.street);
  const hasStreetKey = streetKeys.length > 0;
  const hasPropertyCoords = ctx.lat != null && ctx.lng != null;

  const out: NearbyComparableRow[] = [];
  for (const r of rows) {
    if (!sameCity(r, ctx)) continue;
    if (!isWithinComparablePeriod(r.transactionDate, ctx)) continue;

    if (hasPropertyCoords) {
      if (r.latitude != null && r.longitude != null) {
        const distanceKm = haversineKm(ctx.lat!, ctx.lng!, r.latitude, r.longitude);
        if (distanceKm > ctx.radiusKm) continue;
        out.push({ ...r, distanceKm });
        continue;
      }
      if (matchesStreetDistrictFallback(r, ctx, streetKeys)) {
        out.push({ ...r, distanceKm: null });
      }
      continue;
    }

    if (matchesStreetDistrictFallback(r, ctx, streetKeys)) {
      out.push({ ...r, distanceKm: null });
    }
  }

  out.sort((a, b) => {
    const ta = new Date(a.transactionDate).getTime();
    const tb = new Date(b.transactionDate).getTime();
    const da = a.distanceKm;
    const db = b.distanceKm;
    if (da != null && db != null && da !== db) return da - db;
    if (da != null && db == null) return -1;
    if (da == null && db != null) return 1;
    return tb - ta;
  });
  return out;
}

/** 同街段：同行政區，且（門牌路街與物件相同 或 地段關鍵字出現在位置摘要／地段欄） */
export function filterStreetSectionComparables(
  rows: NormalizedComparableSale[],
  ctx: PropertyComparableContext,
): NormalizedComparableSale[] {
  const streetKeys = buildStreetMatchKeys(ctx.street);
  const hasStreet = streetKeys.length > 0;
  const sectionNorms = ctx.landSectionTokens.map(normalizeComparableAddressText).filter(Boolean);

  if (!hasStreet && sectionNorms.length === 0) return [];

  const out: NormalizedComparableSale[] = [];
  for (const r of rows) {
    if (!sameCityAndDistrict(r, ctx)) continue;
    if (!isWithinComparablePeriod(r.transactionDate, ctx)) continue;

    const snippetNorm = normalizeComparableAddressText(r.addressSnippet);
    const streetMatch = hasStreet && streetKeys.some((k) => snippetNorm.includes(k));

    const sectionMatch =
      sectionNorms.length > 0 &&
      (sectionNorms.some((sn) => snippetNorm.includes(sn)) ||
        r.landSectionTokens.some((tok) => {
          const tn = normalizeComparableAddressText(tok);
          return sectionNorms.some((sn) => tn.includes(sn) || sn.includes(tn));
        }));

    if (streetMatch || sectionMatch) out.push(r);
  }
  out.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
  return out;
}
