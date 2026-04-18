// Row 145 Sprint 2 — path-based parser dispatcher.
//
// `parse-dispatch.ts` (the older sibling) handles user-uploaded `File`
// objects coming through the web admin UI. This module handles batch
// processing where the worker walks $PEOPLE_DB_SOURCE_ROOT and feeds
// absolute filesystem paths to the right parser.
//
// All parsers return the unified `ParseResult` shape so `tools/people-db/
// parse.ts` can persist results without per-format branching.

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { parseCsv } from '../csv-parse';
import { parsePdfTabular } from '../pdf-parse';
import { parseXlsx } from '../xlsx-parse';

import { parseDbf } from './dbf';
import { parseFp } from './fp';
import { parseMdb } from './mdb';
import { parseXls } from './xls';
import { ParserFailureError, UnsupportedParserError, type ParseResult } from './types';

export { ParserFailureError, UnsupportedParserError } from './types';
export type { ParseResult, ParserName } from './types';

const TEXT_EXTS = new Set(['.csv', '.txt']);

/**
 * Routes a file to its parser based on extension and returns a normalized
 * ParseResult. Throws UnsupportedParserError for extensions with no parser
 * (so the worker can mark `skipped_unsupported` rather than `failed`) and
 * ParserFailureError for parser-level errors (so the worker dead-letters).
 *
 * Caller is expected to have validated that the path exists and is readable;
 * we do not stat() here to avoid a redundant syscall — the worker already
 * did that during the inventory pass.
 */
export async function dispatchByPath(
  filePath: string,
  ext?: string,
): Promise<ParseResult> {
  const lowerExt = (ext ?? extname(filePath)).toLowerCase();

  if (TEXT_EXTS.has(lowerExt)) {
    // CSV / TXT — read as UTF-8. Big5 / GB18030 sources should be converted
    // to UTF-8 upstream (the inventory CLI does not transcode); a future
    // sprint can add encoding detection if real datasets need it.
    const text = await readFile(filePath, 'utf8');
    const parsed = parseCsv(text);
    return {
      rows: parsed.rows,
      row_count: parsed.rows.length,
      parser: 'csv',
      warnings: [],
      columns: parsed.columns,
    };
  }

  if (lowerExt === '.xlsx') {
    const buffer = await readFile(filePath);
    const parsed = await parseXlsx(buffer);
    return {
      rows: parsed.rows,
      row_count: parsed.rows.length,
      parser: 'xlsx',
      warnings: [],
      columns: parsed.columns,
    };
  }

  if (lowerExt === '.xls') {
    return parseXls(filePath);
  }

  if (lowerExt === '.mdb' || lowerExt === '.accdb') {
    return parseMdb(filePath);
  }

  if (lowerExt === '.dbf') {
    return parseDbf(filePath);
  }

  if (lowerExt === '.pdf') {
    const buffer = await readFile(filePath);
    const parsed = await parsePdfTabular(buffer);
    return {
      rows: parsed.rows,
      row_count: parsed.rows.length,
      parser: 'pdf-tabular',
      warnings: parsed.warnings,
      columns: parsed.columns,
      likelyScanned: parsed.likelyScanned,
    };
  }

  if (lowerExt === '.fp') {
    // FinePrint .fp land-registry transcript. Shells out to
    // tools/fp-converter/convert_fp.py --format json and extracts people rows
    // (所有權人 / 設定權利人 / 設定義務人) directly — no user column mapping.
    return parseFp(filePath);
  }

  throw new UnsupportedParserError(lowerExt);
}
