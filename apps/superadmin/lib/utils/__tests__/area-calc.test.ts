import {
  parseAreaNumber,
  formatAreaNumber,
  parseShareRatio,
  getSharedCommonArea,
  sqmToPing,
  formatPing,
} from '../area-calc';

describe('parseAreaNumber', () => {
  it('parses plain number', () => {
    expect(parseAreaNumber('123.45')).toBe(123.45);
  });

  it('parses number with commas', () => {
    expect(parseAreaNumber('1,234.56')).toBe(1234.56);
  });

  it('returns 0 for empty string', () => {
    expect(parseAreaNumber('')).toBe(0);
  });

  it('returns 0 for whitespace', () => {
    expect(parseAreaNumber('  ')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(parseAreaNumber('abc')).toBe(0);
  });

  it('handles integer strings', () => {
    expect(parseAreaNumber('100')).toBe(100);
  });
});

describe('formatAreaNumber', () => {
  it('formats integer without decimals', () => {
    expect(formatAreaNumber(100)).toBe('100');
  });

  it('formats decimal with up to 2 places', () => {
    expect(formatAreaNumber(123.456)).toBe('123.46');
  });

  it('removes trailing zeros', () => {
    expect(formatAreaNumber(100.10)).toBe('100.1');
  });

  it('returns empty for zero', () => {
    expect(formatAreaNumber(0)).toBe('');
  });

  it('returns empty for negative', () => {
    expect(formatAreaNumber(-5)).toBe('');
  });

  it('returns empty for NaN', () => {
    expect(formatAreaNumber(NaN)).toBe('');
  });
});

describe('parseShareRatio', () => {
  it('parses plain fraction "1/4"', () => {
    expect(parseShareRatio('1/4')).toBe(0.25);
  });

  it('parses Taiwan format "89484分之1339"', () => {
    expect(parseShareRatio('89484分之1339')).toBeCloseTo(1339 / 89484, 10);
  });

  it('parses "全部" as 1', () => {
    expect(parseShareRatio('全部')).toBe(1);
  });

  it('returns 0 for empty string', () => {
    expect(parseShareRatio('')).toBe(0);
  });

  it('handles whitespace in ratio', () => {
    expect(parseShareRatio(' 1 / 4 ')).toBe(0.25);
  });

  it('handles "10000分之125"', () => {
    expect(parseShareRatio('10000分之125')).toBeCloseTo(0.0125, 10);
  });

  it('handles decimal fractions "2.5/10"', () => {
    expect(parseShareRatio('2.5/10')).toBe(0.25);
  });
});

describe('getSharedCommonArea', () => {
  it('calculates area * ratio', () => {
    expect(getSharedCommonArea('1000', '1/4')).toBe(250);
  });

  it('handles Taiwan ratio format', () => {
    expect(getSharedCommonArea('89484', '89484分之1339')).toBeCloseTo(1339, 5);
  });

  it('returns 0 when area is empty', () => {
    expect(getSharedCommonArea('', '1/4')).toBe(0);
  });

  it('returns 0 when ratio is empty', () => {
    expect(getSharedCommonArea('1000', '')).toBe(0);
  });
});

describe('sqmToPing', () => {
  it('converts 3.305785 sqm to ~1 ping', () => {
    expect(sqmToPing(3.305785)).toBeCloseTo(1, 4);
  });

  it('converts 33.05785 sqm to ~10 ping', () => {
    expect(sqmToPing(33.05785)).toBeCloseTo(10, 4);
  });

  it('returns 0 for 0', () => {
    expect(sqmToPing(0)).toBe(0);
  });
});

describe('formatPing', () => {
  it('formats sqm to ping with 2 decimals', () => {
    expect(formatPing(3.305785)).toBe('1.00');
  });

  it('returns empty for 0', () => {
    expect(formatPing(0)).toBe('');
  });

  it('returns empty for negative', () => {
    expect(formatPing(-1)).toBe('');
  });
});
