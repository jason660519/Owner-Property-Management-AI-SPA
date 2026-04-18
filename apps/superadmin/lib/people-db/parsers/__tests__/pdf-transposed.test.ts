// Row 145 Sprint 3 — transposed-table detection for PDF imports.
// TDD: locks the column-header-in-first-column heuristic used to recover
// 台北市里長 PDFs where each row is a column and the first column is the
// field name (編號 / 姓名 / 地址 / 電話 …). Without this, parsePdfTabular
// treats the first *line* as the header and every subsequent person's
// fields get shifted by one, binding 闕貴卿 to the next neighbour's address.

import { detectTransposedTable, transposeTable } from '../pdf-transposed';

describe('detectTransposedTable', () => {
  it('returns true when first column hits ≥3 dictionary terms (tab-delimited)', () => {
    const lines = [
      '編號\t305\t306\t307',
      '姓名\t闕貴卿\t詹坤隆\t王大明',
      '地址\t南港路一段212號\t中南街123號\t重陽路504巷1弄9號',
      '電話\t02-1111-1111\t02-2222-2222\t02-3333-3333',
    ];
    expect(detectTransposedTable(lines)).toBe(true);
  });

  it('returns false for a standard table where headers live in row 0', () => {
    const lines = [
      'name\tphone\taddress',
      '王小明\t0912345678\t台北市',
      '李小華\t0987654321\t新北市',
    ];
    expect(detectTransposedTable(lines)).toBe(false);
  });

  it('returns false when first column hits only 2 dictionary terms (below threshold)', () => {
    const lines = [
      '編號\t305\t306',
      '姓名\t闕貴卿\t詹坤隆',
      '其他資料\tA\tB',
      '無關欄\tX\tY',
    ];
    expect(detectTransposedTable(lines)).toBe(false);
  });

  it('returns true when first column hits 4 dictionary terms', () => {
    const lines = [
      '編號\t305\t306',
      '姓名\t闕貴卿\t詹坤隆',
      '地址\tA\tB',
      '電話\t02-1\t02-2',
    ];
    expect(detectTransposedTable(lines)).toBe(true);
  });

  it('handles multi-space delimiter fallback', () => {
    const lines = [
      '編號   305   306   307',
      '姓名   闕貴卿   詹坤隆   王大明',
      '地址   南港路   中南街   重陽路',
    ];
    expect(detectTransposedTable(lines)).toBe(true);
  });

  it('returns false for empty input', () => {
    expect(detectTransposedTable([])).toBe(false);
  });
});

describe('transposeTable', () => {
  it('transposes a rectangular matrix: first column becomes headers, rest become rows', () => {
    const matrix = [
      ['編號', '305', '306'],
      ['姓名', '闕貴卿', '詹坤隆'],
      ['地址', '南港路一段212號2樓', '中南街123號'],
    ];
    const result = transposeTable(matrix);
    expect(result.columns).toEqual(['編號', '姓名', '地址']);
    expect(result.rows).toEqual([
      { 編號: '305', 姓名: '闕貴卿', 地址: '南港路一段212號2樓' },
      { 編號: '306', 姓名: '詹坤隆', 地址: '中南街123號' },
    ]);
  });

  it('pads short rows with empty strings rather than throwing', () => {
    // Row 2 (地址) is short by one cell — the second person has no address.
    const matrix = [
      ['編號', '305', '306'],
      ['姓名', '闕貴卿', '詹坤隆'],
      ['地址', '南港路一段212號'], // missing column for 詹坤隆
    ];
    const result = transposeTable(matrix);
    expect(result.columns).toEqual(['編號', '姓名', '地址']);
    expect(result.rows).toEqual([
      { 編號: '305', 姓名: '闕貴卿', 地址: '南港路一段212號' },
      { 編號: '306', 姓名: '詹坤隆', 地址: '' },
    ]);
  });

  it('returns empty result for empty matrix', () => {
    expect(transposeTable([])).toEqual({ columns: [], rows: [] });
  });

  it('returns empty rows when matrix has only one column (just the field names)', () => {
    const matrix = [['編號'], ['姓名'], ['地址']];
    const result = transposeTable(matrix);
    expect(result.columns).toEqual(['編號', '姓名', '地址']);
    expect(result.rows).toEqual([]);
  });
});
