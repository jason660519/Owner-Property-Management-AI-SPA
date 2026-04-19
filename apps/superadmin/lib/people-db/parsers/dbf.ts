// Row 145 Sprint 2 — DBF (dBase III / Visual FoxPro) parser via `dbffile`.
//
// Taiwan land-registry / household data is frequently distributed as DBF
// because that was the FoxPro export format used by the original government
// systems. dBase III is byte-stable and well-documented; dbffile@1.x handles
// it plus VFP extensions (memo files, autoincrement) cleanly.
//
// Notes:
//   - We coerce every field to string so the output shape matches the other
//     parsers. The import-mapper layer owns type semantics.
//   - DBF files commonly ship in legacy CP950/Big5 encoding for Chinese; we
//     pass `encoding: 'big5'` by default and let the env override it for
//     datasets known to be UTF-8 or CP1252.
//   - `readRecords` is paged; we drain it in batches so a 500K-row DBF does
//     not OOM the worker.

import { DBFFile } from 'dbffile';

import { ParserFailureError, type ParseResult } from './types';

const DEFAULT_ENCODING = process.env.PEOPLE_DB_DBF_ENCODING ?? 'big5';
const PAGE_SIZE = 5000;

/**
 * Reads every record in the given .dbf file. Throws ParserFailureError on
 * structural problems (truncated header, unknown field type) so the worker
 * can dead-letter the row.
 */
export async function parseDbf(filePath: string): Promise<ParseResult> {
  let dbf: DBFFile;
  try {
    dbf = await DBFFile.open(filePath, { encoding: DEFAULT_ENCODING });
  } catch (err) {
    throw new ParserFailureError('dbf', `failed to open dbf: ${(err as Error).message}`, err);
  }

  const columns = dbf.fields.map((f) => f.name);
  const rows: Record<string, string>[] = [];
  const warnings: string[] = [];

  try {
    while (true) {
      const batch = await dbf.readRecords(PAGE_SIZE);
      if (batch.length === 0) break;
      for (const record of batch) {
        rows.push(coerceDbfRecord(record, columns));
      }
      if (batch.length < PAGE_SIZE) break;
    }
  } catch (err) {
    // Partial read: surface as failure with whatever rows we managed to
    // collect so the dev-log can show the cutoff.
    throw new ParserFailureError(
      'dbf',
      `read failed after ${rows.length} rows: ${(err as Error).message}`,
      err,
    );
  }

  // Empty DBF is technically valid (header without records) — flag it as a
  // warning rather than failure so the file gets marked parsed and skipped
  // by downstream stages.
  if (rows.length === 0) {
    warnings.push('dbf has 0 records');
  }

  return {
    rows,
    row_count: rows.length,
    parser: 'dbf',
    warnings,
    columns,
  };
}

/**
 * Coerces a dbffile record (mixed Date / number / boolean / string) to a flat
 * Record<string, string>. Trims trailing spaces (DBF pads CHAR fields with
 * 0x20) and converts Date to ISO so downstream serialization is stable.
 * Exported for `dbf-stream.ts` batch coercion (same shape as in-memory parse).
 */
export function coerceDbfRecord(
  record: Record<string, unknown>,
  columns: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of columns) {
    const v = record[col];
    if (v === null || v === undefined) {
      out[col] = '';
    } else if (v instanceof Date) {
      out[col] = v.toISOString();
    } else if (typeof v === 'boolean') {
      out[col] = v ? 'T' : 'F';
    } else if (typeof v === 'string') {
      out[col] = v.replace(/\s+$/u, '');
    } else {
      out[col] = String(v);
    }
  }
  return out;
}
