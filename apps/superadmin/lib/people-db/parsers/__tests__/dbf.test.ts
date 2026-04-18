/**
 * @jest-environment node
 */
// Row 145 Sprint 2 — dbf parser tests. We round-trip through dbffile to
// generate real .dbf fixtures in a tmp dir; this exercises the actual
// binary format rather than mocking the lib.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DBFFile } from 'dbffile';

import { parseDbf } from '../dbf';
import { ParserFailureError } from '../types';

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'people-db-dbf-'));
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
  // dbffile create() expects FieldDescriptor[]; cast through unknown so the
  // test file does not need to redeclare the lib's internal types.
  const dbf = await DBFFile.create(fp, fields as unknown as Parameters<typeof DBFFile.create>[1]);
  if (records.length > 0) await dbf.appendRecords(records);
  return fp;
}

describe('parseDbf', () => {
  it('reads a simple ASCII dbf round-tripped through dbffile', async () => {
    const fp = await writeDbf(
      'simple.dbf',
      [
        { name: 'NAME', type: 'C', size: 20 },
        { name: 'AGE', type: 'N', size: 3, decimalPlaces: 0 },
      ],
      [
        { NAME: 'Alice', AGE: 30 },
        { NAME: 'Bob', AGE: 25 },
      ],
    );

    const result = await parseDbf(fp);
    expect(result.parser).toBe('dbf');
    expect(result.row_count).toBe(2);
    expect(result.columns).toEqual(['NAME', 'AGE']);
    expect(result.rows).toEqual([
      { NAME: 'Alice', AGE: '30' },
      { NAME: 'Bob', AGE: '25' },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('coerces date and boolean fields to ISO / T|F strings', async () => {
    const fp = await writeDbf(
      'mixed.dbf',
      [
        { name: 'NAME', type: 'C', size: 10 },
        { name: 'JOINED', type: 'D', size: 8 },
        { name: 'ACTIVE', type: 'L', size: 1 },
      ],
      [{ NAME: 'X', JOINED: new Date('2026-04-19T00:00:00Z'), ACTIVE: true }],
    );
    const result = await parseDbf(fp);
    expect(result.rows[0].JOINED).toMatch(/^2026-04-19T/);
    expect(result.rows[0].ACTIVE).toBe('T');
  });

  it('warns on empty dbf (header but zero records)', async () => {
    const fp = await writeDbf('empty.dbf', [{ name: 'X', type: 'C', size: 5 }], []);
    const result = await parseDbf(fp);
    expect(result.row_count).toBe(0);
    expect(result.warnings).toEqual(['dbf has 0 records']);
  });

  it('throws ParserFailureError when file is not a valid dbf', async () => {
    const fp = join(tmpDir, 'garbage.dbf');
    writeFileSync(fp, 'not a dbf');
    await expect(parseDbf(fp)).rejects.toBeInstanceOf(ParserFailureError);
  });
});
