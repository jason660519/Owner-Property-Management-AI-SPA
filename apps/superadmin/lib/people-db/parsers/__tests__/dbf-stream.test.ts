/**
 * @jest-environment node
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DBFFile } from 'dbffile';

import { parseDbf } from '../dbf';
import { parseDbfStreaming } from '../dbf-stream';
import { ParserFailureError } from '../types';

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'people-db-dbf-stream-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

async function writeDbf(
  name: string,
  fields: { name: string; type: string; size: number; decimalPlaces?: number }[],
  records: Record<string, unknown>[],
): Promise<string> {
  const fp = join(tmpDir, name);
  const dbf = await DBFFile.create(fp, fields as unknown as Parameters<typeof DBFFile.create>[1]);
  if (records.length > 0) await dbf.appendRecords(records);
  return fp;
}

describe('parseDbfStreaming', () => {
  it('matches parseDbf row_count and rows for the same file', async () => {
    const fp = await writeDbf(
      'parity.dbf',
      [
        { name: 'NAME', type: 'C', size: 20 },
        { name: 'AGE', type: 'N', size: 3, decimalPlaces: 0 },
      ],
      [
        { NAME: 'Alice', AGE: 30 },
        { NAME: 'Bob', AGE: 25 },
      ],
    );
    const mem = await parseDbf(fp);
    const s = await parseDbfStreaming(fp);
    const streamed: Record<string, string>[] = [];
    for await (const b of s.rowsIter) {
      streamed.push(...b);
    }
    const fin = await s.finalize();
    expect(fin.row_count).toBe(mem.row_count);
    expect(streamed).toEqual(mem.rows);
  });

  it('reads a small dbf in one or more batches', async () => {
    const fp = await writeDbf(
      'small.dbf',
      [
        { name: 'NAME', type: 'C', size: 20 },
        { name: 'AGE', type: 'N', size: 3, decimalPlaces: 0 },
      ],
      [
        { NAME: 'Alice', AGE: 30 },
        { NAME: 'Bob', AGE: 25 },
      ],
    );
    const s = await parseDbfStreaming(fp, { batchSize: 1 });
    const batches: Record<string, string>[][] = [];
    for await (const b of s.rowsIter) {
      batches.push(b);
    }
    expect(batches.length).toBeGreaterThanOrEqual(1);
    const flat = batches.flat();
    expect(flat).toHaveLength(2);
    expect(flat[0].NAME).toBe('Alice');
    const fin = await s.finalize();
    expect(fin.row_count).toBe(2);
    expect(fin.warnings.some((w) => w.includes('0 records'))).toBe(false);
  });

  it('splits into PAGE_SIZE=500 batches', async () => {
    const fields = [{ name: 'N', type: 'C', size: 5 }];
    const records = Array.from({ length: 1200 }, (_, i) => ({ N: String(i) }));
    const fp = await writeDbf('many.dbf', fields, records);
    const s = await parseDbfStreaming(fp, { batchSize: 500 });
    let n = 0;
    let batchCount = 0;
    for await (const b of s.rowsIter) {
      batchCount += 1;
      n += b.length;
    }
    expect(n).toBe(1200);
    expect(batchCount).toBe(3);
    await expect(s.finalize()).resolves.toMatchObject({ row_count: 1200 });
  });

  it('maps date fields to ISO-like strings', async () => {
    const fp = await writeDbf(
      'dates.dbf',
      [
        { name: 'NAME', type: 'C', size: 10 },
        { name: 'JOINED', type: 'D', size: 8 },
      ],
      [{ NAME: 'X', JOINED: new Date('2026-04-19T00:00:00Z') }],
    );
    const s = await parseDbfStreaming(fp);
    const rows: Record<string, string>[] = [];
    for await (const b of s.rowsIter) {
      rows.push(...b);
    }
    expect(rows[0].JOINED).toMatch(/^2026-04-19T/);
  });

  it('warns on empty dbf (header only)', async () => {
    const fp = await writeDbf('empty.dbf', [{ name: 'X', type: 'C', size: 5 }], []);
    const s = await parseDbfStreaming(fp);
    for await (const _ of s.rowsIter) {
      /* drain */
    }
    const fin = await s.finalize();
    expect(fin.row_count).toBe(0);
    expect(fin.warnings.some((w) => w.includes('0 records'))).toBe(true);
  });

  it('warns when memo version expects .dbt but file is absent', async () => {
    const fp = join(tmpDir, 'memohdr.dbf');
    const template = await writeDbf('t.dbf', [{ name: 'M', type: 'C', size: 5 }], [{ M: 'a' }]);
    const buf = readFileSync(template);
    buf.writeUInt8(0x83, 0);
    writeFileSync(fp, buf);
    const s = await parseDbfStreaming(fp);
    for await (const _ of s.rowsIter) {
      /* drain */
    }
    const fin = await s.finalize();
    expect(fin.warnings.some((w) => w.toLowerCase().includes('memo'))).toBe(true);
    expect(fin.row_count).toBeGreaterThanOrEqual(0);
  });

  it('throws ParserFailureError when the path is not a valid dbf', async () => {
    const bad = join(tmpDir, 'garbage.dbf');
    writeFileSync(bad, 'not a dbf');
    await expect(parseDbfStreaming(bad)).rejects.toBeInstanceOf(ParserFailureError);
  });

  it('does not retain unbounded heap for a larger synthetic dbf', async () => {
    const n = 8000;
    const fp = await writeDbf(
      'heap.dbf',
      [{ name: 'PAD', type: 'C', size: 200 }],
      Array.from({ length: n }, (_, i) => ({ PAD: 'x'.repeat(180) + String(i).padStart(10, '0') })),
    );
    const before = process.memoryUsage().heapUsed;
    const s = await parseDbfStreaming(fp, { batchSize: 500 });
    let count = 0;
    for await (const b of s.rowsIter) {
      count += b.length;
    }
    await s.finalize();
    const after = process.memoryUsage().heapUsed;
    expect(count).toBe(n);
    const deltaMb = (after - before) / (1024 * 1024);
    expect(deltaMb).toBeLessThan(100);
  }, 60_000);
});
