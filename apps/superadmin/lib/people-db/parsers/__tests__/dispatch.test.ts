/**
 * @jest-environment node
 */
// Row 145 Sprint 2 — dispatcher routing tests. The individual parsers have
// their own coverage; this suite only verifies the dispatcher picks the
// correct parser for each extension and propagates errors correctly.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

jest.mock('../mdb', () => ({ parseMdb: jest.fn() }));
jest.mock('../dbf', () => ({ parseDbf: jest.fn() }));
jest.mock('../xls', () => ({ parseXls: jest.fn() }));
jest.mock('../fp', () => ({ parseFp: jest.fn() }));
jest.mock('../../xlsx-parse', () => ({ parseXlsx: jest.fn() }));
jest.mock('../../pdf-parse', () => ({ parsePdfTabular: jest.fn() }));

import { dispatchByPath, UnsupportedParserError } from '../index';
import type { ParserName } from '../types';
import { parseMdb } from '../mdb';
import { parseDbf } from '../dbf';
import { parseXls } from '../xls';
import { parseFp } from '../fp';
import { parseXlsx } from '../../xlsx-parse';
import { parsePdfTabular } from '../../pdf-parse';

const mockMdb = parseMdb as jest.MockedFunction<typeof parseMdb>;
const mockDbf = parseDbf as jest.MockedFunction<typeof parseDbf>;
const mockXls = parseXls as jest.MockedFunction<typeof parseXls>;
const mockFp = parseFp as jest.MockedFunction<typeof parseFp>;
const mockXlsx = parseXlsx as jest.MockedFunction<typeof parseXlsx>;
const mockPdf = parsePdfTabular as jest.MockedFunction<typeof parsePdfTabular>;

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'people-db-dispatch-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
});

// Typed so .mockResolvedValue(makeStub(...)) satisfies ParseResult. Keeping
// `parser` as the narrow `ParserName` union (not plain string) prevents
// type-erasure on jest's resolved-value inference.
function makeStub(parser: ParserName) {
  return {
    rows: [{ a: '1' }],
    row_count: 1,
    parser,
    warnings: [] as string[],
    columns: ['a'],
  };
}

describe('dispatchByPath', () => {
  it('routes .csv to parseCsv via filesystem read', async () => {
    const fp = join(tmpDir, 'people.csv');
    writeFileSync(fp, 'name,age\nAlice,30\n');
    const result = await dispatchByPath(fp);
    expect(result.parser).toBe('csv');
    expect(result.row_count).toBe(1);
    expect(result.rows).toEqual([{ name: 'Alice', age: '30' }]);
  });

  it('routes .txt the same way as .csv', async () => {
    const fp = join(tmpDir, 'people.txt');
    writeFileSync(fp, 'name\nAlice\n');
    const result = await dispatchByPath(fp);
    expect(result.parser).toBe('csv');
  });

  it('routes .xlsx to parseXlsx', async () => {
    const fp = join(tmpDir, 'a.xlsx');
    writeFileSync(fp, 'fake');
    mockXlsx.mockResolvedValue({ columns: ['x'], rows: [{ x: '1' }] });
    const result = await dispatchByPath(fp);
    expect(mockXlsx).toHaveBeenCalledTimes(1);
    expect(result.parser).toBe('xlsx');
    expect(result.row_count).toBe(1);
  });

  it('routes .xls to parseXls', async () => {
    const fp = join(tmpDir, 'a.xls');
    mockXls.mockResolvedValue(makeStub('xls'));
    const result = await dispatchByPath(fp);
    expect(mockXls).toHaveBeenCalledWith(fp);
    expect(result.parser).toBe('xls');
  });

  it('routes .mdb and .accdb to parseMdb', async () => {
    mockMdb.mockResolvedValue(makeStub('mdb'));
    await dispatchByPath('/fake/x.mdb');
    await dispatchByPath('/fake/x.accdb');
    expect(mockMdb).toHaveBeenCalledTimes(2);
  });

  it('routes .dbf to parseDbf', async () => {
    mockDbf.mockResolvedValue(makeStub('dbf'));
    const result = await dispatchByPath('/fake/x.dbf');
    expect(mockDbf).toHaveBeenCalledWith('/fake/x.dbf');
    expect(result.parser).toBe('dbf');
  });

  it('routes .pdf to parsePdfTabular and forwards likelyScanned', async () => {
    const fp = join(tmpDir, 'a.pdf');
    writeFileSync(fp, 'fake');
    mockPdf.mockResolvedValue({
      columns: [],
      rows: [],
      warnings: ['scanned'],
      pageCount: 5,
      likelyScanned: true,
    });
    const result = await dispatchByPath(fp);
    expect(result.parser).toBe('pdf-tabular');
    expect(result.likelyScanned).toBe(true);
    expect(result.warnings).toEqual(['scanned']);
  });

  it('throws UnsupportedParserError for unknown extension', async () => {
    await expect(dispatchByPath('/fake/x.zzz')).rejects.toBeInstanceOf(UnsupportedParserError);
  });

  it('routes .fp to parseFp (wired Sprint 2)', async () => {
    mockFp.mockResolvedValue(makeStub('fp'));
    const result = await dispatchByPath('/fake/x.fp');
    expect(mockFp).toHaveBeenCalledWith('/fake/x.fp');
    expect(result.parser).toBe('fp');
  });

  it('lowercases extension so .XLS routes correctly', async () => {
    mockXls.mockResolvedValue(makeStub('xls'));
    await dispatchByPath('/fake/A.XLS');
    expect(mockXls).toHaveBeenCalled();
  });

  it('honors explicit ext arg over filename', async () => {
    mockDbf.mockResolvedValue(makeStub('dbf'));
    await dispatchByPath('/no/ext-file', '.dbf');
    expect(mockDbf).toHaveBeenCalled();
  });
});
