/**
 * @jest-environment node
 */
// Row 145 Sprint 2 — xls parser tests. We use SheetJS to author a real .xls
// (BIFF8) fixture so we exercise the full read path including BIFF parsing,
// not just our coercion layer.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as XLSX from 'xlsx';

import { parseXls } from '../xls';
import { ParserFailureError } from '../types';

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'people-db-xls-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeXls(name: string, sheets: { name: string; aoa: unknown[][] }[]): string {
  const wb = XLSX.utils.book_new();
  for (const { name: sheetName, aoa } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const fp = join(tmpDir, name);
  // bookType 'biff8' = legacy .xls binary format
  XLSX.writeFile(wb, fp, { bookType: 'biff8' });
  return fp;
}

describe('parseXls', () => {
  it('reads a single-sheet xls header + rows', async () => {
    const fp = writeXls('basic.xls', [
      {
        name: 'Sheet1',
        aoa: [
          ['name', 'phone'],
          ['王小明', '0912000000'],
          ['李大華', '0922000000'],
        ],
      },
    ]);
    const result = await parseXls(fp);
    expect(result.parser).toBe('xls');
    expect(result.row_count).toBe(2);
    expect(result.columns).toEqual(expect.arrayContaining(['name', 'phone']));
    expect(result.rows).toEqual([
      { name: '王小明', phone: '0912000000' },
      { name: '李大華', phone: '0922000000' },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('skips blank rows but keeps rows with at least one cell', async () => {
    const fp = writeXls('sparse.xls', [
      {
        name: 'Sheet1',
        aoa: [
          ['a', 'b'],
          ['1', ''],
          ['', ''],
          ['', '2'],
        ],
      },
    ]);
    const result = await parseXls(fp);
    expect(result.row_count).toBe(2);
    expect(result.rows).toEqual([
      { a: '1', b: '' },
      { a: '', b: '2' },
    ]);
  });

  it('reads multi-sheet xls with __sheet column and warning', async () => {
    const fp = writeXls('multi.xls', [
      { name: 'people', aoa: [['name'], ['Alice']] },
      { name: 'orders', aoa: [['id'], ['o-1']] },
    ]);
    const result = await parseXls(fp);
    expect(result.row_count).toBe(2);
    expect(result.rows).toEqual([
      { __sheet: 'people', name: 'Alice' },
      { __sheet: 'orders', id: 'o-1' },
    ]);
    expect(result.warnings).toEqual(['xls has 2 sheets; reading all and prefixing with __sheet']);
    expect(result.columns).toContain('__sheet');
  });

  it('synthesizes col_N for missing header cells', async () => {
    const fp = writeXls('noheader.xls', [
      {
        name: 'Sheet1',
        aoa: [
          ['', 'phone', ''],
          ['Bob', '0911', 'extra'],
        ],
      },
    ]);
    const result = await parseXls(fp);
    expect(result.columns).toEqual(expect.arrayContaining(['col_1', 'phone', 'col_3']));
    expect(result.rows[0]).toMatchObject({ col_1: 'Bob', phone: '0911', col_3: 'extra' });
  });

  it('throws ParserFailureError when file does not exist', async () => {
    // SheetJS is lenient and will fall back to PRN/TXT for almost any byte
    // soup, so a non-existent path is the only reliable trigger for the
    // catch block. Real-world corrupt .xls files surface as empty results
    // with warnings rather than throws — see next test.
    await expect(parseXls('/nonexistent/path/does-not-exist.xls')).rejects.toBeInstanceOf(
      ParserFailureError,
    );
  });

  it('returns empty result for a corrupt xls instead of throwing', async () => {
    // Document the lenient-fallback behavior: SheetJS happily decodes random
    // bytes as a one-cell text "sheet". We don't fight it; the worker can
    // still mark the file parsed-with-warnings and humans review it.
    const fp = join(tmpDir, 'corrupt.xls');
    writeFileSync(fp, Buffer.from([0xff, 0xfe, 0xfd]));
    const result = await parseXls(fp);
    expect(result.parser).toBe('xls');
    expect(result.row_count).toBe(0);
  });
});
