import { normalizeAddress } from '../address-normalize';

describe('normalizeAddress', () => {
  it('splits standard Taipei address', () => {
    const r = normalizeAddress('臺北市大安區和平東路二段106號');
    expect(r.county).toBe('臺北市');
    expect(r.district).toBe('大安區');
    expect(r.road).toBe('和平東路二段');
    expect(r.detail).toBe('106號');
    expect(r.normalized).toBe('臺北市大安區和平東路二段106號');
  });

  it('normalizes simplified 台 to 臺', () => {
    const r = normalizeAddress('台北市信義區信義路五段7號');
    expect(r.county).toBe('臺北市');
  });

  it('handles 新北市 (three-char county) without mistaking as 北市', () => {
    const r = normalizeAddress('新北市板橋區中山路一段1號');
    expect(r.county).toBe('新北市');
    expect(r.district).toBe('板橋區');
  });

  it('converts full-width digits to half-width', () => {
    const r = normalizeAddress('臺中市西屯區臺灣大道三段１０１號');
    expect(r.normalized).toContain('101號');
  });

  it('collapses whitespace', () => {
    const r = normalizeAddress('  桃園市  中壢區  元化路 100 號 ');
    expect(r.county).toBe('桃園市');
    expect(r.normalized).toBe('桃園市中壢區元化路100號');
  });

  it('returns empty normalized for empty input', () => {
    const r = normalizeAddress('');
    expect(r.normalized).toBe('');
    expect(r.county).toBeNull();
  });

  it('handles addresses without recognizable county', () => {
    const r = normalizeAddress('沒有地址資訊');
    expect(r.county).toBeNull();
    expect(r.normalized).toBe('沒有地址資訊');
  });

  it('handles address with 鄉 / 鎮 level', () => {
    const r = normalizeAddress('雲林縣斗六市民生路100號');
    expect(r.county).toBe('雲林縣');
    expect(r.district).toBe('斗六市');
  });
});
