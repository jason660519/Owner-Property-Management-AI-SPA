import {
  buildFacts,
  buildGenerationSettings,
  buildResources,
  getMaxTokens,
  truncate,
} from './utils';

describe('property description stream utils', () => {
  it('buildFacts formats listing facts with address, layout, area, and price', () => {
    const result = buildFacts({
      listingType: 'sale',
      title: '大安區電梯三房',
      propertyType: '住宅',
      area: 99,
      bedrooms: 3,
      bathrooms: 2,
      livingRooms: 2,
      parkingSpaces: 1,
      price: 3280,
      addressCity: '台北市',
      addressDistrict: '大安區',
      addressStreet: '信義路',
      addressNumber: '100號',
      addressFloor: '10樓',
    });

    expect(result).toContain('- 交易類型：出售');
    expect(result).toContain('- 物件標題：大安區電梯三房');
    expect(result).toContain('- 地點：台北市大安區信義路100號10樓');
    expect(result).toContain('- 格局：3房2廳2衛');
    expect(result).toContain('- 面積：29.9 坪');
    expect(result).toContain('- 售價 NT$3,280');
    expect(result).toContain('- 車位：1 個');
  });

  it('buildGenerationSettings uses defaults when generation options are omitted', () => {
    const result = buildGenerationSettings({ listingType: 'rental' });

    expect(result).toContain('文案風格：專業銷售');
    expect(result).toContain('輸出長度：標準版');
    expect(result).toContain('使用目的：網站物件介紹');
  });

  it('buildResources filters empty values and preserves current description signal', () => {
    const result = buildResources({
      listingType: 'rental',
      title: '中山站套房',
      monthlyRent: 28000,
      currentDescription: '原有文案',
    });

    expect(result).toEqual([
      { label: '標題', value: '中山站套房' },
      { label: '月租', value: 'NT$28,000' },
      { label: '現有文案', value: '已納入參考' },
    ]);
  });

  it('getMaxTokens returns token ranges by target length', () => {
    expect(getMaxTokens('short')).toBe(300);
    expect(getMaxTokens('medium')).toBe(500);
    expect(getMaxTokens('long')).toBe(800);
    expect(getMaxTokens(undefined)).toBe(500);
  });

  it('truncate keeps short text and shortens long text with ellipsis', () => {
    expect(truncate('abc', 10)).toBe('abc');
    expect(truncate('abcdefghij', 5)).toBe('abcde...');
  });
});