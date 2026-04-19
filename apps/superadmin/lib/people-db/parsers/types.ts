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
 * Streaming parser output for very large sources (multi‑GB DBF, huge XLSX).
 *
 * Use **`ParseResult`** when the full dataset fits comfortably in memory
 * (typical CSV, small spreadsheets, PDF tables). The worker materializes
 * `rows` before persisting.
 *
 * Use **`StreamingParseResult`** when holding all rows in a JS array would
 * OOM: consume `rowsIter` in batches, persist each batch (e.g. Postgres
 * `COPY`), then call `finalize()` once the async iterator is exhausted to
 * obtain authoritative `row_count` and any deferred warnings.
 *
 * Cancellation: pass `AbortSignal` via parser options where supported; the
 * iterator should stop yielding and `finalize()` may reject if aborted.
 */
export interface StreamingParseResult {
  parser: ParserName;
  /**
   * Column order when known up front (DBF). For streaming XLSX, may be empty
   * until the first data row is produced — infer keys from each batch row.
   */
  columns: string[];
  /**
   * Yields batches of normalized string records (default batch size is parser-specific).
   * Do not collect all batches into one array — persist per batch.
   */
  rowsIter: AsyncIterable<Record<string, string>[]>;
  /**
   * Call after `rowsIter` is fully consumed. Resolves totals and warnings
   * that are only known after a full pass (e.g. empty-file warnings).
   */
  finalize: () => Promise<{
    row_count: number;
    warnings: string[];
    likelyScanned?: boolean;
  }>;
}

/** Narrowing helper for `dispatchByPath` union results. */
export function isStreamingParseResult(
  r: ParseResult | StreamingParseResult,
): r is StreamingParseResult {
  return typeof (r as StreamingParseResult).finalize === 'function' && 'rowsIter' in r;
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
