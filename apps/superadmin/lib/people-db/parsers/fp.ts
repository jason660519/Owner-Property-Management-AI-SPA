// Row 145 Sprint 2 — dispatcher-facing FinePrint .fp parser.
//
// Wraps the lower-level `fp-parse` module in the uniform `ParseResult` shape
// expected by `parsers/index.ts` and the batch worker. Auto-manages a temp
// scratch directory so callers don't have to.
//
// Rows emitted here are already *extracted people*, not raw transcript tokens:
// one row per 所有權人 / 設定權利人 / 設定義務人 in the document. The
// import-mapper picks up `full_name` / `address` / `note` / `title_position`
// directly without a user column-mapping step.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FpConverterError, parseFpFile, type PeopleRow } from './fp-parse';
import { ParserFailureError, type ParseResult } from './types';

const FP_COLUMNS = ['full_name', 'address', 'title_position', 'note', 'source_section'];

function rowToRecord(row: PeopleRow): Record<string, string> {
  return {
    full_name: row.full_name,
    address: row.address ?? '',
    title_position: row.title_position,
    note: row.note ?? '',
    source_section: row.source_section,
  };
}

/**
 * Parses a .fp land-registry transcript into one ParseResult whose rows are
 * already shaped like people records. Shells out to convert_fp.py; errors
 * from the Python side bubble as ParserFailureError so the batch worker
 * dead-letters cleanly.
 */
export async function parseFp(filePath: string): Promise<ParseResult> {
  const scratch = await mkdtemp(join(tmpdir(), 'people-db-fp-'));
  try {
    const { rows, warnings } = await parseFpFile(filePath, scratch);
    return {
      rows: rows.map(rowToRecord),
      row_count: rows.length,
      parser: 'fp',
      warnings,
      columns: FP_COLUMNS,
    };
  } catch (err) {
    if (err instanceof FpConverterError) {
      throw new ParserFailureError(
        'fp',
        `convert_fp.py failed: ${err.message}${err.stderr ? ` | stderr=${err.stderr.trim()}` : ''}`,
        err,
      );
    }
    throw new ParserFailureError('fp', (err as Error).message, err);
  } finally {
    // Best-effort cleanup. If this throws (unlikely, it's a tmp dir), we
    // swallow so it doesn't mask the real parser outcome.
    await rm(scratch, { recursive: true, force: true }).catch(() => {});
  }
}
