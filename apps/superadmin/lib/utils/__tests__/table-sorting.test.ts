import type { Row } from '@tanstack/react-table';
import { numericStringSortingFn, parseNumericCell } from '../table-sorting';

describe('parseNumericCell', () => {
  it('parses currency strings', () => {
    expect(parseNumericCell('$4.50')).toBe(4.5);
    expect(parseNumericCell('$10.00')).toBe(10);
    expect(parseNumericCell('$0.75')).toBe(0.75);
  });

  it('parses non-USD currency symbols', () => {
    expect(parseNumericCell('¥1,234')).toBe(1234);
    expect(parseNumericCell('€0.99')).toBe(0.99);
    expect(parseNumericCell('£50')).toBe(50);
  });

  it('parses thousands separators', () => {
    expect(parseNumericCell('1,234.56')).toBe(1234.56);
    expect(parseNumericCell('1,000,000')).toBe(1_000_000);
  });

  it('parses SI suffixes (k/M/B/T)', () => {
    expect(parseNumericCell('128k')).toBe(128_000);
    expect(parseNumericCell('1M')).toBe(1_000_000);
    expect(parseNumericCell('3B')).toBe(3_000_000_000);
    expect(parseNumericCell('1.5k')).toBe(1_500);
    expect(parseNumericCell('2.5M')).toBe(2_500_000);
  });

  it('handles trailing units and percent', () => {
    expect(parseNumericCell('72.5 tok/s')).toBe(72.5);
    expect(parseNumericCell('0.5 s')).toBe(0.5);
    expect(parseNumericCell('15%')).toBe(15);
  });

  it('handles negative numbers', () => {
    expect(parseNumericCell('-3.2')).toBe(-3.2);
    expect(parseNumericCell('-$5.00')).toBe(-5);
  });

  it('handles accounting-style negative (parens)', () => {
    expect(parseNumericCell('($1.50)')).toBe(-1.5);
    expect(parseNumericCell('(100)')).toBe(-100);
  });

  it('returns NaN for missing value markers', () => {
    expect(parseNumericCell('—')).toBeNaN();
    expect(parseNumericCell('-')).toBeNaN();
    expect(parseNumericCell('N/A')).toBeNaN();
    expect(parseNumericCell('n/a')).toBeNaN();
    expect(parseNumericCell('')).toBeNaN();
    expect(parseNumericCell(null)).toBeNaN();
    expect(parseNumericCell(undefined)).toBeNaN();
  });

  it('passes through plain numbers', () => {
    expect(parseNumericCell(42)).toBe(42);
    expect(parseNumericCell(0)).toBe(0);
    expect(parseNumericCell(-1.5)).toBe(-1.5);
    expect(parseNumericCell(Number.NaN)).toBeNaN();
    expect(parseNumericCell(Number.POSITIVE_INFINITY)).toBeNaN();
  });

  it('returns NaN for garbage', () => {
    expect(parseNumericCell('abc')).toBeNaN();
    expect(parseNumericCell('$$$')).toBeNaN();
  });
});

describe('numericStringSortingFn', () => {
  const makeRow = (value: unknown): Row<unknown> =>
    ({ getValue: () => value } as unknown as Row<unknown>);

  const sort = (values: unknown[]): unknown[] => {
    const rows = values.map(makeRow);
    return [...rows]
      .sort((a, b) => numericStringSortingFn(a, b, 'col'))
      .map((r) => r.getValue('col'));
  };

  it('sorts currency strings ascending by numeric value', () => {
    expect(sort(['$4.50', '$5.63', '$4.81', '$10.00'])).toEqual([
      '$4.50',
      '$4.81',
      '$5.63',
      '$10.00',
    ]);
  });

  it('sorts context-window suffixes correctly', () => {
    expect(sort(['128k', '1M', '200k', '32k'])).toEqual([
      '32k',
      '128k',
      '200k',
      '1M',
    ]);
  });

  it('pushes missing values to the end in ascending order', () => {
    const result = sort(['$5', '—', '$1', 'N/A', '$3']);
    expect(result.slice(0, 3)).toEqual(['$1', '$3', '$5']);
    // last two are the NaN cells (order between them is stable = input order)
    expect(result.slice(3).every((v) => v === '—' || v === 'N/A')).toBe(true);
  });

  it('treats equal numeric values as equal', () => {
    const rowA = makeRow('$4.50');
    const rowB = makeRow('4.5');
    expect(numericStringSortingFn(rowA, rowB, 'col')).toBe(0);
  });
});
