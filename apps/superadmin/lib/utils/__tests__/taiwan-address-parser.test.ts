import { parseTaiwanDoorAddress } from '../taiwan-address-parser';

describe('parseTaiwanDoorAddress', () => {
  it('parses full Taipei address with floor and unit', () => {
    const full = '臺北市大安區仁愛路四段345巷4弄25號3樓之2';
    const parsed = parseTaiwanDoorAddress(full);
    expect(parsed.street).toBe('仁愛路四段345巷4弄');
    expect(parsed.number).toBe('25號');
    expect(parsed.floor).toBe('3樓');
    expect(parsed.unit).toBe('之2');
  });

  it('parses address without floor / unit', () => {
    const full = '臺北市大安區仁愛路四段295號';
    const parsed = parseTaiwanDoorAddress(full);
    expect(parsed.street).toBe('仁愛路四段');
    expect(parsed.number).toBe('295號');
    expect(parsed.floor).toBeUndefined();
    expect(parsed.unit).toBeUndefined();
  });

  it('handles address without city/district prefix', () => {
    const full = '仁愛路四段345巷4弄25號';
    const parsed = parseTaiwanDoorAddress(full);
    expect(parsed.street).toBe('仁愛路四段345巷4弄');
    expect(parsed.number).toBe('25號');
  });
});

