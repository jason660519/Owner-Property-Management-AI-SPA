// Row 145 Sprint 2b — streaming .xlsx via ExcelJS WorkbookReader (disk-backed,
// does not load the full workbook into RAM).

import type { Cell, Row } from 'exceljs';
import ExcelJS from 'exceljs';

type SharedStrings = unknown[] | undefined;

import { ParserFailureError, type StreamingParseResult } from './types';

const DEFAULT_BATCH = 500;
const SHEET_COL = '__sheet';

export interface ParseXlsxStreamingOptions {
  batchSize?: number;
  signal?: AbortSignal;
}

function cellValueToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && 'result' in v) {
    return cellValueToString((v as { result: unknown }).result);
  }
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    const rt = (v as { richText: { text: string }[] }).richText;
    return Array.isArray(rt) ? rt.map((t) => t.text).join('') : '';
  }
  if (typeof v === 'object' && v !== null && 'text' in v) {
    return String((v as { text: string }).text);
  }
  return String(v);
}

/** Resolves shared-string indices and rich text via the workbook cache. */
function cellToDisplayString(cell: Cell, sharedStrings: SharedStrings): string {
  const raw = cell.value;
  if (typeof raw === 'object' && raw !== null && 'sharedString' in raw) {
    const idx = (raw as { sharedString: number }).sharedString;
    if (sharedStrings && sharedStrings[idx] !== undefined) {
      return cellValueToString(sharedStrings[idx]);
    }
  }
  if (typeof raw === 'number' && sharedStrings && sharedStrings[raw] !== undefined) {
    const s = sharedStrings[raw];
    return cellValueToString(s);
  }
  return cellValueToString(raw);
}

/** Builds dense string[] from streaming row cells. */
function rowValuesToStrings(row: Row, sharedStrings: SharedStrings): string[] {
  const out: string[] = [];
  row.eachCell({ includeEmpty: true }, (cell: Cell, colNumber) => {
    out[colNumber - 1] = cellToDisplayString(cell, sharedStrings);
  });
  return out;
}

function uniquifyHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, idx) => {
    const base = h.trim() || `COL${idx + 1}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}_${n + 1}`;
  });
}

/**
 * Streams all worksheets from an .xlsx path. First non-empty row per sheet is
 * treated as headers; each output row includes `__sheet` with the sheet name.
 */
export async function parseXlsxStreaming(
  filePath: string,
  options: ParseXlsxStreamingOptions = {},
): Promise<StreamingParseResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH;
  const signal = options.signal;

  let iterError: Error | null = null;
  let totalRows = 0;
  const preambleWarnings: string[] = [];
  /** Filled when the first sheet’s header row is parsed (same array as `columns` on the result). */
  const columnsOut: string[] = [];

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    sharedStrings: 'cache',
    worksheets: 'emit',
    styles: 'ignore',
    hyperlinks: 'ignore',
  });
  const getSharedStrings = (): SharedStrings =>
    (reader as unknown as { sharedStrings?: unknown[] }).sharedStrings;

  async function* rowsIter(): AsyncGenerator<Record<string, string>[]> {
    const batch: Record<string, string>[] = [];
    try {
      for await (const worksheet of reader) {
        const sheetName = (worksheet as unknown as { name: string }).name;
        const sharedStrings = getSharedStrings();
        let headers: string[] | null = null;
        let sawRow = false;
        let dataRowsForSheet = 0;
        for await (const row of worksheet) {
          if (signal?.aborted) {
            throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
          }
          sawRow = true;
          const cells = rowValuesToStrings(row, sharedStrings);
          if (headers === null) {
            headers = uniquifyHeaders(cells.length ? cells : ['']);
            if (!columnsOut.includes(SHEET_COL)) {
              columnsOut.unshift(SHEET_COL);
            }
            for (const h of headers) {
              if (!columnsOut.includes(h)) {
                columnsOut.push(h);
              }
            }
            continue;
          }
          const rec: Record<string, string> = { [SHEET_COL]: sheetName };
          headers.forEach((h, i) => {
            rec[h] = cells[i] ?? '';
          });
          batch.push(rec);
          dataRowsForSheet += 1;
          totalRows += 1;
          if (batch.length >= batchSize) {
            yield batch.splice(0, batch.length);
          }
        }
        if (!sawRow) {
          preambleWarnings.push(`sheet "${sheetName}" has no rows`);
        } else if (dataRowsForSheet === 0 && headers !== null) {
          preambleWarnings.push(`sheet "${sheetName}" is empty (header only)`);
        }
      }
    } catch (err) {
      iterError = err as Error;
      throw new ParserFailureError(
        'xlsx',
        `streaming xlsx failed after ${totalRows} rows: ${(err as Error).message}`,
        err,
      );
    }
    if (batch.length > 0) {
      yield batch;
    }
  }

  return {
    parser: 'xlsx',
    columns: columnsOut,
    rowsIter: rowsIter(),
    finalize: async () => {
      if (iterError) {
        throw new ParserFailureError(
          'xlsx',
          `streaming xlsx failed: ${iterError.message}`,
          iterError,
        );
      }
      return {
        row_count: totalRows,
        warnings: preambleWarnings,
      };
    },
  };
}
