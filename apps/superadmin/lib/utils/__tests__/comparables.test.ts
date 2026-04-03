
import { 
  filterNearbyComparables, 
  filterStreetSectionComparables, 
  PropertyComparableContext,
  NormalizedComparableSale
} from '../real-price-comparables';

describe('Real Price Comparables Filtering', () => {
  const mockCtx: PropertyComparableContext = {
    city: '臺北市',
    district: '大安區',
    street: '敦化南路一段',
    village: '光武里',
    landSectionTokens: ['仁愛段'],
    lat: 25.0415,
    lng: 121.5485,
    radiusKm: 1,
    asOf: new Date('2026-04-04'),
  };

  const mockPool: NormalizedComparableSale[] = [
    {
      transactionDate: '2025-10-01',
      totalPriceTwd: 30000000,
      buildingAreaSqm: 100,
      unitPricePerSqm: 300000,
      buildingType: '大樓',
      floor: '10',
      addressSnippet: '臺北市大安區敦化南路一段101~130號',
      latitude: 25.0420,
      longitude: 121.5490,
      city: '臺北市',
      district: '大安區',
      village: '光武里',
      landSectionTokens: ['仁愛段'],
    },
    {
      transactionDate: '2025-05-01',
      totalPriceTwd: 25000000,
      buildingAreaSqm: 80,
      unitPricePerSqm: 312500,
      buildingType: '華廈',
      floor: '5',
      addressSnippet: '臺北市大安區安和路一段1~30號',
      latitude: 25.0400,
      longitude: 121.5500,
      city: '臺北市',
      district: '大安區',
      village: '仁愛里',
      landSectionTokens: ['仁愛段'],
    }
  ];

  test('filterNearbyComparables matches by coordinates', () => {
    const rows = filterNearbyComparables(mockPool, mockCtx);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].addressSnippet).toContain('敦化南路一段');
    expect(rows[0].distanceKm).not.toBeNull();
  });

  test('filterNearbyComparables matches by street when no coordinates', () => {
    const ctxNoCoords = { ...mockCtx, lat: null, lng: null };
    const rows = filterNearbyComparables(mockPool, ctxNoCoords);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].addressSnippet).toContain('敦化南路一段');
    expect(rows[0].distanceKm).toBeNull();
  });

  test('filterStreetSectionComparables matches by street name', () => {
    const rows = filterStreetSectionComparables(mockPool, mockCtx);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].addressSnippet).toContain('敦化南路一段');
  });

  test('filterStreetSectionComparables matches by land section tokens', () => {
    const ctxNoStreet = { ...mockCtx, street: '' };
    const rows = filterStreetSectionComparables(mockPool, ctxNoStreet);
    expect(rows.length).toBe(2); // Both have '仁愛段'
  });
});
