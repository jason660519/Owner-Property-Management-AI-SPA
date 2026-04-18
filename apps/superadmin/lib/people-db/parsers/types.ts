// Row 145 Sprint 2 — shared types for the path-based parser dispatcher.
//
// The Sprint 2 parsers operate on local files under $PEOPLE_DB_SOURCE_ROOT
// rather than on user-uploaded `File` objects, so they speak a different
// shape than `parse-dispatch.ts`:
//   - they take an absolute filesystem path
//   - they may shell out to system tools (mdb-tools)
//   - they emit a uniform `ParseResult` the worker can persist
//
// Keep this module dependency-free so individual parsers can be unit-tested
// without dragging in jszip / xlsx / etc.

export type ParserName =
  | 'csv'
  | 'xlsx'
  | 'xls'
  | 'mdb'
  | 'dbf'
  | 'pdf-tabular'
  | 'fp'
  | 'unsupported';

/**
 * The normalized output every Sprint 2 parser produces. Workers consume this
 * to persist `parser`, `row_count`, and downstream rows to staging.
 *
 * `rows` is a flat list of stringified records; type coercion (date parsing,
 * number normalization) happens later in the import-mapper layer so parsers
 * stay format-specific and the mapper stays domain-specific.
 *
 * `warnings` collects non-fatal parser observations (skipped sheet, empty
 * table, etc.). The worker should persist these alongside the row but not
 * mark the file as `failed`.
 *
 * `likelyScanned` is set by PDF parsers when no extractable text was found
 * on any page — the worker uses this to enqueue OCR (Sprint 3) instead of
 * marking parsed.
 */
export interface ParseResult {
  rows: Record<string, string>[];
  row_count: number;
  parser: ParserName;
  warnings: string[];
  columns?: string[];
  likelyScanned?: boolean;
}

/**
 * Thrown when a file's extension has no registered parser. The worker maps
 * this to `status='skipped_unsupported'` (not `failed`) so the row can be
 * resurrected later via the inventory `reclassifyIfStale` flow.
 */
export class UnsupportedParserError extends Error {
  ext: string;
  constructor(ext: string) {
    super(`No parser registered for extension: ${ext || '(none)'}`);
    this.ext = ext;
    this.name = 'UnsupportedParserError';
  }
}

/**
 * Thrown when a parser ran but produced no usable structure (corrupt file,
 * empty workbook, mdbtools spawn failure, etc.). The worker maps this to
 * `status='failed'` and writes `error_msg`.
 */
export class ParserFailureError extends Error {
  parser: ParserName;
  cause?: unknown;
  constructor(parser: ParserName, message: string, cause?: unknown) {
    super(`[${parser}] ${message}`);
    this.parser = parser;
    this.cause = cause;
    this.name = 'ParserFailureError';
  }
}
