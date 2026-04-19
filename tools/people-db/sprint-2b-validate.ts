#!/usr/bin/env -S npx tsx
// Row 145 Sprint 2b — standalone validation harness.
//
// Bypasses parse.ts because of an unrelated tsx + Node 25.2.1 CJS module-load
// crash ("Cannot assign to read only property 'toString' of object '#<BufferList>'")
// that triggers when the parsers dispatcher index + @supabase/supabase-js are
// imported together. Imports individual parsers directly (not via the
// dispatcher barrel) so tsx sees a smaller module graph, and uses a direct pg
// Pool for both COPY and people_db_files row updates (no supabase-js).
//
// Usage:
//   npx tsx tools/people-db/sprint-2b-validate.ts <ext> <source_path>
// Example:
//   npx tsx tools/people-db/sprint-2b-validate.ts .xlsx "/Volumes/.../桃 男 全.xlsx"

import { Pool } from 'pg';

import { parseDbfStreaming } from '../../apps/superadmin/lib/people-db/parsers/dbf-stream';
import { parseXlsxStreaming } from '../../apps/superadmin/lib/people-db/parsers/xlsx-stream';
import {
  isStreamingParseResult,
  type StreamingParseResult,
} from '../../apps/superadmin/lib/people-db/parsers/types';
import {
  copyStagingFromStreamingBatches,
  createStagingPool,
} from '../../apps/superadmin/lib/people-db/staging-copy';

const ext = process.argv[2];
const sourcePath = process.argv[3];

if (!ext || !sourcePath) {
  console.error('Usage: sprint-2b-validate.ts <ext> <source_path>');
  process.exit(1);
}

function fmtMb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function logRss(label: string): void {
  const m = process.memoryUsage();
  console.log(
    `  [RSS] ${label}: rss=${fmtMb(m.rss)}MB heapUsed=${fmtMb(m.heapUsed)}MB external=${fmtMb(m.external)}MB`,
  );
}

async function dispatchStreaming(
  ext: string,
  sourcePath: string,
): Promise<StreamingParseResult> {
  const lower = ext.toLowerCase();
  if (lower === '.xlsx') return parseXlsxStreaming(sourcePath);
  if (lower === '.dbf') return parseDbfStreaming(sourcePath);
  throw new Error(`Sprint 2b validate only supports .xlsx/.dbf, got ${ext}`);
}

async function main(): Promise<void> {
  const pool: Pool = createStagingPool();
  let peakRssMb = 0;

  // Sample RSS every 5s during processing and remember peak
  const rssInterval = setInterval(() => {
    const m = process.memoryUsage();
    peakRssMb = Math.max(peakRssMb, m.rss / 1024 / 1024);
    logRss('mid-run');
  }, 5000);

  try {
    console.log(`[1/5] Lookup file_id for ${sourcePath}`);
    const fileRes = await pool.query<{ id: string; size_bytes: number }>(
      'SELECT id, size_bytes FROM public.people_db_files WHERE source_path = $1 LIMIT 1',
      [sourcePath],
    );
    if (fileRes.rowCount === 0) throw new Error('file row not found');
    const { id: fileId, size_bytes } = fileRes.rows[0];
    console.log(`  file_id=${fileId} size=${fmtMb(size_bytes)}MB`);
    logRss('after-lookup');

    console.log(`[2/5] dispatch ${ext}`);
    const t0 = Date.now();
    const result = await dispatchStreaming(ext, sourcePath);
    console.log(
      `  parser=${result.parser} streaming=${isStreamingParseResult(result)} columns=${result.columns.length}`,
    );
    logRss('after-dispatch');

    console.log(`[3/5] COPY streaming batches into staging`);
    const tCopy0 = Date.now();
    const copied = await copyStagingFromStreamingBatches(
      pool,
      fileId,
      result.rowsIter,
    );
    const finals = await result.finalize();
    const tCopy1 = Date.now();
    console.log(
      `  copied=${copied} finalize.row_count=${finals.row_count} warnings=${finals.warnings.length}`,
    );
    console.log(`  copy_seconds=${((tCopy1 - tCopy0) / 1000).toFixed(1)}`);
    logRss('after-copy');

    console.log(`[4/5] Verify staging row count`);
    const stagingRes = await pool.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.people_db_staging_records WHERE file_id = $1',
      [fileId],
    );
    console.log(`  staging count = ${stagingRes.rows[0].count}`);

    console.log(`[5/5] Update people_db_files status`);
    await pool.query(
      "UPDATE public.people_db_files SET status='parsed', parser=$2, row_count=$3, error_msg=NULL WHERE id=$1",
      [fileId, result.parser, finals.row_count],
    );
    console.log('  status=parsed');
    logRss('after-status-update');

    const tTotal = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nDONE in ${tTotal}s peak_rss=${peakRssMb.toFixed(1)}MB`);
  } finally {
    clearInterval(rssInterval);
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
