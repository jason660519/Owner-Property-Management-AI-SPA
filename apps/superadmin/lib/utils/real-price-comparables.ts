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
}

export function normalizeTaiwanCity(city: string): string {
  return city.replace(/\s/g, '').replace(/台/g, '臺').trim();
}

export function normalizeDistrictLabel(district: string): string {
  return district.replace(/\s/g, '').trim();
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

export function buildComparableContextFromProperty(
  property: PropertyItem,
  asOf = new Date(),
): PropertyComparableContext | null {
  const city = property.addressCity?.trim() ?? '';
  const district = property.addressDistrict?.trim() ?? '';
  if (!city || !district) return null;

  const street = property.addressStreet?.trim() ?? '';
  const villageRaw = property.addressVillage?.trim() ?? '';
  const village = villageRaw.length > 0 ? villageRaw : null;

  return {
    city,
    district,
    street,
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

/** 附近成交：同縣市、座標在直轄市 1km／其他 2km 內、近一年；列印時附直線距離 */
export function filterNearbyComparables(
  rows: NormalizedComparableSale[],
  ctx: PropertyComparableContext,
): Array<NormalizedComparableSale & { distanceKm: number }> {
  if (ctx.lat == null || ctx.lng == null) return [];

  const out: Array<NormalizedComparableSale & { distanceKm: number }> = [];
  for (const r of rows) {
    if (!sameCity(r, ctx)) continue;
    if (r.latitude == null || r.longitude == null) continue;
    if (!isWithinLastYear(r.transactionDate, ctx.asOf)) continue;
    const distanceKm = haversineKm(ctx.lat, ctx.lng, r.latitude, r.longitude);
    if (distanceKm > ctx.radiusKm) continue;
    out.push({ ...r, distanceKm });
  }
  out.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
  return out;
}

/** 同街段：同行政區，且（門牌路街與物件相同 或 地段關鍵字出現在位置摘要／地段欄） */
export function filterStreetSectionComparables(
  rows: NormalizedComparableSale[],
  ctx: PropertyComparableContext,
): NormalizedComparableSale[] {
  const streetNorm = normalizeAddrFragment(ctx.street);
  const hasStreet = streetNorm.length >= 2;
  const sectionNorms = ctx.landSectionTokens.map(normalizeAddrFragment).filter(Boolean);

  if (!hasStreet && sectionNorms.length === 0) return [];

  const out: NormalizedComparableSale[] = [];
  for (const r of rows) {
    if (!sameCityAndDistrict(r, ctx)) continue;
    if (!isWithinLastYear(r.transactionDate, ctx.asOf)) continue;

    const snippetNorm = normalizeAddrFragment(r.addressSnippet);
    const streetMatch = hasStreet && snippetNorm.includes(streetNorm);

    const sectionMatch =
      sectionNorms.length > 0 &&
      (sectionNorms.some((sn) => snippetNorm.includes(sn)) ||
        r.landSectionTokens.some((tok) => {
          const tn = normalizeAddrFragment(tok);
          return sectionNorms.some((sn) => tn.includes(sn) || sn.includes(tn));
        }));

    if (streetMatch || sectionMatch) out.push(r);
  }
  out.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
  return out;
}

function normalizeVillageName(v: string): string {
  return v.replace(/\s/g, '').replace(/台/g, '臺');
}

/** 同里：同行政區且村里欄位一致（物件須填寫里名） */
export function filterVillageComparables(
  rows: NormalizedComparableSale[],
  ctx: PropertyComparableContext,
): NormalizedComparableSale[] {
  if (!ctx.village?.trim()) return [];

  const target = normalizeVillageName(ctx.village);

  const out: NormalizedComparableSale[] = [];
  for (const r of rows) {
    if (!sameCityAndDistrict(r, ctx)) continue;
    if (!isWithinLastYear(r.transactionDate, ctx.asOf)) continue;
    if (!r.village?.trim()) continue;
    if (normalizeVillageName(r.village) !== target) continue;
    out.push(r);
  }
  out.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
  );
  return out;
}
