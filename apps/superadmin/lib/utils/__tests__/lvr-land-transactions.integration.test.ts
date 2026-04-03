/**
 * 需 `apps/superadmin/.env.local` 內 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY（對應本機或遠端）。
 * 本機：`npx supabase db push --local` 後應有 lvr_land_transactions。
 *
 * 執行：`cd apps/superadmin && npm run test:lvr-integration`（需本機 Supabase 已啟動）
 *
 * @jest-environment node
 */
import { loadComparableSalesCombined } from '@/lib/utils/real-price-comparable-source';
import {
  buildComparableContextFromProperty,
  filterNearbyComparables,
  filterStreetSectionComparables,
} from '@/lib/utils/real-price-comparables';
import type { PropertyItem } from '@/lib/types/properties';

function minimalSaleProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  return {
    id: 'test-prop',
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
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

const hasCreds = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

(hasCreds ? describe : describe.skip)('lvr_land_transactions integration', () => {
  it(
    'loadComparableSalesCombined 能讀取臺北市近一年成交且篩選不為空',
    async () => {
      const asOf = new Date();
      const ctx = buildComparableContextFromProperty(minimalSaleProperty(), asOf);
      expect(ctx).not.toBeNull();

      const { rows: pool, fetchNotes } = await loadComparableSalesCombined(ctx!);
      expect(fetchNotes.some((n) => n.includes('讀取成交資料表失敗'))).toBe(false);

      expect(pool.length).toBeGreaterThan(0);

      const nearby = filterNearbyComparables(pool, ctx!);
      const street = filterStreetSectionComparables(pool, ctx!);
      expect(nearby.length + street.length).toBeGreaterThan(0);
    },
    60_000,
  );
});
