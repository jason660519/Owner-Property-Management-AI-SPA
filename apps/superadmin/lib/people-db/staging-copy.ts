// Row 145 Sprint 2b — bulk insert into people_db_staging_records via Postgres COPY
// (bypasses PostgREST for large parses).

import { pipeline } from 'node:stream/promises';
import { Readable, type Writable } from 'node:stream';

import { Pool, type PoolClient } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

import type { StagingRow } from './staging';

function getConnectionString(): string {
  return (
    process.env.PEOPLE_DB_PG_URL ??
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  );
}

/** One CSV line for COPY (file_id uuid, integer, jsonb as quoted JSON text).
 *
 * Strips `\\u0000` (NUL) escape sequences because Postgres JSONB rejects them
 * with SQLSTATE 22P05 "unsupported Unicode escape sequence". NULs commonly
 * appear in DBF source files where fixed-width fields are padded with 0x00.
 */
function copyCsvLine(fileId: string, recordIndex: number, raw: Record<string, unknown>): string {
  // JSON.stringify encodes literal NUL as the 6-char escape \u0000; strip those.
  const json = JSON.stringify(raw).replace(/\\u0000/g, '');
  return `${fileId},${recordIndex},"${json.replace(/"/g, '""')}"\n`;
}

/**
 * Deletes existing staging rows for `fileId`, then COPY-inserts the given rows.
 * Uses a single transaction per call.
 */
export async function copyStagingRowsForFile(
  pool: Pool,
  fileId: string,
  rows: StagingRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.people_db_staging_records WHERE file_id = $1', [fileId]);
    await pipeRowsToCopy(client, fileId, rows);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function pipeRowsToCopy(client: PoolClient, fileId: string, rows: StagingRow[]): Promise<void> {
  const sql = `COPY public.people_db_staging_records (file_id, record_index, raw) FROM STDIN WITH (FORMAT csv, ENCODING 'UTF8')`;
  const copyStream = client.query(copyFrom(sql)) as unknown as Writable;
  const readable = Readable.from(
    (async function* () {
      for (const row of rows) {
        yield Buffer.from(copyCsvLine(fileId, row.record_index, row.raw), 'utf8');
      }
    })(),
  );
  await pipeline(readable, copyStream);
}

/**
 * Streaming variant: DELETE staging for `fileId`, then COPY from async row batches.
 * `record_index` is assigned sequentially starting at `startIndex` (default 0).
 */
export async function copyStagingFromStreamingBatches(
  pool: Pool,
  fileId: string,
  batches: AsyncIterable<Record<string, string>[]>,
  startIndex = 0,
): Promise<number> {
  const client = await pool.connect();
  let recordIndex = startIndex;
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.people_db_staging_records WHERE file_id = $1', [fileId]);
    const sql = `COPY public.people_db_staging_records (file_id, record_index, raw) FROM STDIN WITH (FORMAT csv, ENCODING 'UTF8')`;
    const copyStream = client.query(copyFrom(sql)) as unknown as Writable;
    const readable = Readable.from(
      (async function* () {
        for await (const batch of batches) {
          for (const row of batch) {
            yield Buffer.from(copyCsvLine(fileId, recordIndex, row as Record<string, unknown>), 'utf8');
            recordIndex += 1;
          }
        }
      })(),
    );
    await pipeline(readable, copyStream);
    await client.query('COMMIT');
    return recordIndex;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function createStagingPool(): Pool {
  return new Pool({
    connectionString: getConnectionString(),
    max: 2,
  });
}

export { getConnectionString };
