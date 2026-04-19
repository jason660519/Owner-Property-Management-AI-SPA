// Row 145 Sprint 2b — streaming DBF parser. Uses `dbffile` record paging so only
// one batch of rows lives in JS heap at a time (unlike `parseDbf`, which holds
// the full `rows[]`). Binary layout is delegated to dbffile for FoxPro / memo
// compatibility; the streaming contract is `StreamingParseResult`.

import { access, open } from 'node:fs/promises';
import { extname } from 'node:path';

import { DBFFile } from 'dbffile';

import { coerceDbfRecord } from './dbf';
import { ParserFailureError, type StreamingParseResult } from './types';

const DEFAULT_ENCODING = process.env.PEOPLE_DB_DBF_ENCODING ?? 'big5';
const DEFAULT_BATCH = 500;

export interface ParseDbfStreamingOptions {
  /** Max rows per yielded batch (default 500). */
  batchSize?: number;
  /** When aborted, the iterator stops and finalize may reflect partial progress. */
  signal?: AbortSignal;
}

async function resolveMemoWarning(filePath: string): Promise<string | null> {
  const buf = Buffer.alloc(1);
  const fh = await open(filePath, 'r');
  try {
    await fh.read(buf, 0, 1, 0);
  } finally {
    await fh.close();
  }
  const version = buf.readUInt8(0);
  const expectsDbt = version === 0x83 || version === 0x8b;
  if (!expectsDbt) return null;
  const root = filePath.slice(0, -extname(filePath).length);
  for (const ext of ['.dbt', '.DBT']) {
    const memoPath = `${root}${ext}`;
    try {
      await access(memoPath);
      return null;
    } catch {
      /* try next */
    }
  }
  return 'memo field present but .dbt memo file not found; memo values will be empty';
}

/**
 * Streams DBF rows in batches. Does not load the entire file into a `rows[]`
 * array — suitable for multi‑GB DBFs when combined with COPY-based staging.
 */
export async function parseDbfStreaming(
  filePath: string,
  options: ParseDbfStreamingOptions = {},
): Promise<StreamingParseResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH;
  const signal = options.signal;

  let dbf: DBFFile;
  try {
    dbf = await DBFFile.open(filePath, {
      encoding: DEFAULT_ENCODING,
      readMode: 'loose',
    });
  } catch (err) {
    throw new ParserFailureError('dbf', `failed to open dbf: ${(err as Error).message}`, err);
  }

  const columns = dbf.fields.map((f) => f.name);
  const preambleWarnings: string[] = [];
  const memoWarn = await resolveMemoWarning(filePath);
  if (memoWarn) preambleWarnings.push(memoWarn);

  let rowsSeen = 0;
  let iterError: Error | null = null;

  async function* rowsIter(): AsyncGenerator<Record<string, string>[]> {
    try {
      while (true) {
        if (signal?.aborted) {
          throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        }
        const batch = await dbf.readRecords(batchSize);
        if (batch.length === 0) break;
        const strings = batch.map((rec) => coerceDbfRecord(rec as Record<string, unknown>, columns));
        rowsSeen += strings.length;
        yield strings;
      }
    } catch (err) {
      iterError = err as Error;
      throw err;
    }
  }

  return {
    parser: 'dbf',
    columns,
    rowsIter: rowsIter(),
    finalize: async () => {
      if (iterError) {
        throw new ParserFailureError(
          'dbf',
          `read failed after ${rowsSeen} rows: ${iterError.message}`,
          iterError,
        );
      }
      const warnings = [...preambleWarnings];
      if (rowsSeen === 0) {
        warnings.push('dbf has 0 records');
      }
      return {
        row_count: rowsSeen,
        warnings,
      };
    },
  };
}
