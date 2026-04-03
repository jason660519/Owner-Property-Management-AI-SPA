import { buildComparableSalesPdf } from '@/lib/utils/real-price-comparable-pdf';

describe('real-price-comparable-pdf', () => {
  it('buildComparableSalesPdf 產出非空 PDF（含中文列）', async () => {
    const pdf = await buildComparableSalesPdf({
      kind: 'street_section',
      reportTitle: '同街段成交測試',
      criteriaLines: ['條件一'],
      propertyLines: ['物件地址：測試'],
      warnings: [],
      rows: [
        {
          transactionDate: '2026-01-01',
          totalPriceTwd: 10_000_000,
          buildingAreaSqm: 30,
          unitPricePerSqm: 30,
          buildingType: '住宅',
          floor: '5層',
          addressSnippet: '臺北市大安區忠孝東路四段',
          latitude: null,
          longitude: null,
          city: '臺北市',
          district: '大安區',
          village: null,
          landSectionTokens: [],
        },
      ],
      generatedAtLabel: '產製時間：測試',
    });
    expect(pdf.byteLength).toBeGreaterThan(400);
    expect(new TextDecoder('latin1').decode(pdf.slice(0, 8))).toContain('%PDF');
  });

  it('nearby 列印距離為 — 當 distanceKm 為 null', async () => {
    const pdf = await buildComparableSalesPdf({
      kind: 'nearby',
      reportTitle: '附近成交測試',
      criteriaLines: ['半徑內'],
      propertyLines: ['座標已設定'],
      warnings: [],
      rows: [
        {
          transactionDate: '2026-01-01',
          totalPriceTwd: 10_000_000,
          buildingAreaSqm: 30,
          unitPricePerSqm: null,
          buildingType: '住宅',
          floor: '5層',
          addressSnippet: '臺北市大安區路名',
          latitude: null,
          longitude: null,
          city: '臺北市',
          district: '大安區',
          village: null,
          landSectionTokens: [],
          distanceKm: null,
        },
      ],
      generatedAtLabel: '產製時間：',
    });
    expect(pdf.byteLength).toBeGreaterThan(400);
  });
});
