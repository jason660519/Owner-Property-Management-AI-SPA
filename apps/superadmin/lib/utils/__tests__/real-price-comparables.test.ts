import {
  buildComparableContextFromProperty,
  comparableRadiusKmForCity,
  extractLandSectionTokens,
  filterNearbyComparables,
  filterStreetSectionComparables,
  filterVillageComparables,
  haversineKm,
  inferStreetFromPropertyAddress,
  isWithinLastYear,
  normalizeComparableAddressText,
} from '@/lib/utils/real-price-comparables';
import type { PropertyItem } from '@/lib/types/properties';

function baseProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  return {
    id: 'p1',
    type: 'sale',
    title: 't',
    address: '臺北市大安區忠孝東路四段1號',
    addressCity: '臺北市',
    addressDistrict: '大安區',
    addressStreet: '忠孝東路四段',
    addressNumber: '1號',
    status: 'active',
    price: 1,
    monthlyRent: null,
    ownerName: null,
    ownerId: 'o1',
    area: 10,
    propertyType: 'suite',
    bedrooms: 1,
    bathrooms: 1,
    livingRooms: 1,
    parkingSpaces: 0,
    createdAt: new Date().toISOString(),
    latitude: 25.041,
    longitude: 121.551,
    ...overrides,
  };
}

describe('real-price-comparables', () => {
  const asOf = new Date('2026-06-15T12:00:00.000Z');

  it('comparableRadiusKmForCity: 六都 1km、其他 2km', () => {
    expect(comparableRadiusKmForCity('臺北市')).toBe(1);
    expect(comparableRadiusKmForCity('台北市')).toBe(1);
    expect(comparableRadiusKmForCity('宜蘭縣')).toBe(2);
  });

  it('haversineKm 距離合理', () => {
    const d = haversineKm(25.041, 121.551, 25.042, 121.552);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(2);
  });

  it('isWithinLastYear', () => {
    expect(isWithinLastYear('2025-07-01', asOf)).toBe(true);
    expect(isWithinLastYear('2025-05-01', asOf)).toBe(false);
  });

  it('extractLandSectionTokens', () => {
    expect(extractLandSectionTokens('大安區仁愛段二小段 345地號')).toEqual(
      expect.arrayContaining(['大安區仁愛段二小段']),
    );
  });

  it('filterNearbyComparables 同縣市且半徑內', () => {
    const ctx = buildComparableContextFromProperty(baseProperty(), asOf);
    expect(ctx).not.toBeNull();
    const rows = [
      {
        transactionDate: '2026-01-01',
        totalPriceTwd: 10_000_000,
        buildingAreaSqm: 30,
        unitPricePerSqm: null,
        buildingType: '住宅大樓',
        floor: '5層',
        addressSnippet: '台北市大安區…',
        latitude: 25.0411,
        longitude: 121.5511,
        city: '臺北市',
        district: '大安區',
        village: null,
        landSectionTokens: [],
      },
    ];
    const out = filterNearbyComparables(rows, ctx!);
    expect(out).toHaveLength(1);
    expect(out[0].distanceKm).toBeLessThan(0.5);
  });

  it('filterNearbyComparables：開放資料無座標時改以同行政區＋路街近似', () => {
    const ctx = buildComparableContextFromProperty(baseProperty(), asOf);
    expect(ctx).not.toBeNull();
    const rows = [
      {
        transactionDate: '2026-01-01',
        totalPriceTwd: 10_000_000,
        buildingAreaSqm: 30,
        unitPricePerSqm: null,
        buildingType: '住宅大樓',
        floor: '5層',
        addressSnippet: '臺北市大安區忠孝東路四段＊＊＊',
        latitude: null,
        longitude: null,
        city: '臺北市',
        district: '大安區',
        village: null,
        landSectionTokens: [],
      },
    ];
    const out = filterNearbyComparables(rows, ctx!);
    expect(out).toHaveLength(1);
    expect(out[0].distanceKm).toBeNull();
  });

  it('filterNearbyComparables：物件無 WGS84 時仍以同行政區＋路街近似', () => {
    const ctx = buildComparableContextFromProperty(
      baseProperty({ latitude: null, longitude: null }),
      asOf,
    );
    expect(ctx).not.toBeNull();
    const rows = [
      {
        transactionDate: '2026-01-01',
        totalPriceTwd: 10_000_000,
        buildingAreaSqm: 30,
        unitPricePerSqm: null,
        buildingType: '住宅大樓',
        floor: '5層',
        addressSnippet: '臺北市大安區忠孝東路四段***',
        latitude: null,
        longitude: null,
        city: '臺北市',
        district: '大安區',
        village: null,
        landSectionTokens: [],
      },
    ];
    const out = filterNearbyComparables(rows, ctx!);
    expect(out).toHaveLength(1);
    expect(out[0].distanceKm).toBeNull();
  });

  it('normalizeComparableAddressText 去除星號並統一全形數字', () => {
    expect(normalizeComparableAddressText('忠孝東路四段１２３號')).toContain('123');
    expect(normalizeComparableAddressText('忠孝東路四段***')).toContain('忠孝東路四段');
  });

  it('inferStreetFromPropertyAddress：address_street 空白時從 address 扣縣市區門牌', () => {
    expect(
      inferStreetFromPropertyAddress({
        address: '臺北市大安區忠孝東路四段1號',
        addressCity: '臺北市',
        addressDistrict: '大安區',
        addressStreet: '',
        addressNumber: '1號',
      }),
    ).toBe('忠孝東路四段');
  });

  it('buildComparableContextFromProperty：無 addressStreet 仍可由 address 得到路街', () => {
    const ctx = buildComparableContextFromProperty(
      baseProperty({
        addressStreet: undefined,
        address: '臺北市大安區忠孝東路四段1號',
        addressNumber: '1號',
      }),
      asOf,
    );
    expect(ctx?.street).toContain('忠孝東路');
  });

  it('filterStreetSectionComparables 路街或地段', () => {
    const prop = baseProperty({
      landTranscript: {
        header: {
          transcriptType: '',
          documentTitle: '大安區仁愛段二小段',
          printTime: '',
          pageInfo: '',
          printer: '',
          checkNumber: '',
          documentNumber: '',
          dataJurisdiction: '',
          issuingAuthority: '',
          transcriptNotes: '',
        },
        description: {
          landNumber: '',
          regDate: '',
          regReason: '',
          landCategory: '',
          grade: '',
          area: '',
          useZone: '',
          useCategory: '',
          announcedValueYear: '',
          announcedValuePerSqm: '',
          buildingsOnLand: '',
          notes: '',
        },
        ownership: [],
        encumbrances: [],
      },
    });
    const ctx = buildComparableContextFromProperty(prop, asOf);
    const rows = [
      {
        transactionDate: '2026-02-01',
        totalPriceTwd: 8_000_000,
        buildingAreaSqm: 25,
        unitPricePerSqm: null,
        buildingType: '華廈',
        floor: '3層',
        addressSnippet: '臺北市大安區忠孝東路四段***',
        latitude: null,
        longitude: null,
        city: '臺北市',
        district: '大安區',
        village: null,
        landSectionTokens: [],
      },
      {
        transactionDate: '2026-02-02',
        totalPriceTwd: 9_000_000,
        buildingAreaSqm: 28,
        unitPricePerSqm: null,
        buildingType: '套房',
        floor: '2層',
        addressSnippet: '臺北市大安區仁愛路***',
        latitude: null,
        longitude: null,
        city: '臺北市',
        district: '大安區',
        village: null,
        landSectionTokens: ['仁愛段二小段'],
      },
    ];
    const out = filterStreetSectionComparables(rows, ctx!);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.some((r) => r.addressSnippet.includes('忠孝'))).toBe(true);
  });

  it('filterVillageComparables', () => {
    const prop = baseProperty({ addressVillage: '龍門里' });
    const ctx = buildComparableContextFromProperty(prop, asOf);
    const rows = [
      {
        transactionDate: '2026-03-01',
        totalPriceTwd: 12_000_000,
        buildingAreaSqm: 40,
        unitPricePerSqm: null,
        buildingType: '住宅大樓',
        floor: '10層',
        addressSnippet: '…',
        latitude: null,
        longitude: null,
        city: '臺北市',
        district: '大安區',
        village: '龍門里',
        landSectionTokens: [],
      },
      {
        transactionDate: '2026-03-02',
        totalPriceTwd: 11_000_000,
        buildingAreaSqm: 38,
        unitPricePerSqm: null,
        buildingType: '住宅大樓',
        floor: '8層',
        addressSnippet: '…',
        latitude: null,
        longitude: null,
        city: '臺北市',
        district: '大安區',
        village: '其他里',
        landSectionTokens: [],
      },
    ];
    const out = filterVillageComparables(rows, ctx!);
    expect(out).toHaveLength(1);
    expect(out[0].village).toBe('龍門里');
  });
});
