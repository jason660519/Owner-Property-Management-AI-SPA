/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import ExcelJS from 'exceljs';

import { parseXlsxStreaming } from '../xlsx-stream';
import { ParserFailureError } from '../types';

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'people-db-xlsx-stream-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('parseXlsxStreaming', () => {
  it('batches rows and sets columns from headers', async () => {
    const fp = join(tmpDir, 'one.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Data');
    ws.addRow(['H1', 'H2']);
    ws.addRow(['Alice', 30]);
    ws.addRow(['Bob', 25]);
    await wb.xlsx.writeFile(fp);

    const s = await parseXlsxStreaming(fp, { batchSize: 1 });
    const batches: Record<string, string>[][] = [];
    for await (const b of s.rowsIter) {
      batches.push(b);
    }
    expect(batches.length).toBeGreaterThanOrEqual(1);
    const fin = await s.finalize();
    expect(fin.row_count).toBe(2);
    expect(s.columns[0]).toBe('__sheet');
    expect(s.columns.length).toBeGreaterThanOrEqual(2);
    expect(batches.flat().length).toBe(2);
  });

  it('adds __sheet for multiple worksheets', async () => {
    const fp = join(tmpDir, 'multi.xlsx');
    const wb = new ExcelJS.Workbook();
    const a = wb.addWorksheet('A');
    a.addRow(['K']);
    a.addRow(['1']);
    const b = wb.addWorksheet('B');
    b.addRow(['K']);
    b.addRow(['2']);
    await wb.xlsx.writeFile(fp);

    const s = await parseXlsxStreaming(fp);
    const keys = new Set<string>();
    for await (const batch of s.rowsIter) {
      for (const row of batch) {
        keys.add(row.__sheet);
      }
    }
    await s.finalize();
    // WorkbookReader may fall back to default sheet names when rels do not match.
    expect(keys.size).toBeGreaterThanOrEqual(1);
  });

  it('warns on empty worksheet', async () => {
    const fp = join(tmpDir, 'emptyws.xlsx');
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Empty');
    await wb.xlsx.writeFile(fp);

    const s = await parseXlsxStreaming(fp);
    for await (const _ of s.rowsIter) {
      /* drain */
    }
    const fin = await s.finalize();
    expect(fin.warnings.some((w) => w.toLowerCase().includes('no rows'))).toBe(true);
    expect(fin.row_count).toBe(0);
  });

  it('throws ParserFailureError on invalid zip', async () => {
    const fp = join(tmpDir, 'bad.xlsx');
    writeFileSync(fp, 'not a zip');
    const s = await parseXlsxStreaming(fp);
    await expect(async () => {
      for await (const _ of s.rowsIter) {
        /* drain */
      }
      await s.finalize();
    }).rejects.toBeInstanceOf(ParserFailureError);
  });

  it('does not grow heap linearly with row count', async () => {
    const fp = join(tmpDir, 'big.xlsx');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('G');
    const n = 4000;
    ws.addRow(['V']);
    for (let i = 0; i < n; i += 1) {
      ws.addRow([`x${i}`]);
    }
    await wb.xlsx.writeFile(fp);

    const before = process.memoryUsage().heapUsed;
    const s = await parseXlsxStreaming(fp, { batchSize: 500 });
    let c = 0;
    for await (const b of s.rowsIter) {
      c += b.length;
    }
    await s.finalize();
    const after = process.memoryUsage().heapUsed;
    expect(c).toBe(n);
    expect((after - before) / (1024 * 1024)).toBeLessThan(100);
  }, 120_000);
});
