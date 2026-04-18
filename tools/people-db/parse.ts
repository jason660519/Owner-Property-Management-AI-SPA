#!/usr/bin/env -S npx tsx
// Row 145 Sprint 2 — Parser CLI worker.
//
// Picks rows from public.people_db_files where status='pending', runs the
// path-based parser dispatcher, and persists the outcome:
//   success                 → status='parsed', parser, row_count
//   likelyScanned (PDF)     → status='ocr_queued' (Sprint 3 enqueues for real)
//   ParserFailureError      → status='failed', error_msg, attempts++
//   UnsupportedParserError  → status='skipped_unsupported'
//
// The actual normalized rows (from ParseResult.rows) are NOT persisted here
// — Sprint 4 (Entity Resolution) owns the staging table. This worker is the
// contract between "we have a file" and "we have structured data" only.
//
// Usage:
//   npx tsx tools/people-db/parse.ts                # process all pending
//   npx tsx tools/people-db/parse.ts --limit 50     # cap iterations
//   npx tsx tools/people-db/parse.ts --dry-run      # plan, don't write
//   npx tsx tools/people-db/parse.ts --max-attempts 3   # skip rows already retried
//
// Env:
//   SUPABASE_URL                default http://localhost:54321
//   SUPABASE_SERVICE_ROLE_KEY   required (bypasses RLS)
//   PEOPLE_DB_DBF_ENCODING      default big5 (passed to dbffile)

import { parseArgs } from 'node:util';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  dispatchByPath,
  ParserFailureError,
  UnsupportedParserError,
  type ParseResult,
} from '../../apps/superadmin/lib/people-db/parsers';
import { dispatchOcr } from '../../apps/superadmin/lib/people-db/ocr/dispatch';
import {
  getOcrClient,
  parseProviderFromEnv,
} from '../../apps/superadmin/lib/people-db/ocr/client-factory';
import type { OcrClient } from '../../apps/superadmin/lib/people-db/ocr/types';
import {
  insertStagingRecords,
  parsedRowsToStaging,
} from '../../apps/superadmin/lib/people-db/staging';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'max-attempts': { type: 'string', default: '5' },
    'batch-size': { type: 'string', default: '20' },
    // Process only files with this extension (e.g. --ext .mdb). Lets us tier
    // the 89k pending queue into high-value small batches (.mdb/.dbf) before
    // expensive ones (.pdf). Leading dot, case-insensitive.
    ext: { type: 'string' },
    // Process only files whose dataset_root matches this value.
    'dataset-root': { type: 'string' },
  },
});

const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;
const dryRun = Boolean(values['dry-run']);
const maxAttempts = Number(values['max-attempts']);
const batchSize = Number(values['batch-size']);
const extFilter = values.ext ? values.ext.toLowerCase() : null;
const datasetRootFilter = values['dataset-root'] ?? null;

if (Number.isNaN(maxAttempts) || maxAttempts < 1) {
  console.error('--max-attempts must be a positive integer');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY && !dryRun) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required (or use --dry-run).');
  process.exit(1);
}

const db: SupabaseClient | null = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// OCR client: lazily instantiated the first time a scanned PDF appears.
// Sprint 3 default = mock; override with PEOPLE_DB_OCR_PROVIDER=openclaw
// once the real client ships.
const ocrProvider = parseProviderFromEnv(process.env.PEOPLE_DB_OCR_PROVIDER);
let ocrClient: OcrClient | null = null;
function requireOcrClient(): OcrClient {
  if (!ocrClient) ocrClient = getOcrClient(ocrProvider);
  return ocrClient;
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

interface Counters {
  attempted: number;
  parsed: number;
  ocrQueued: number;
  failed: number;
  skippedUnsupported: number;
  skippedExhausted: number;
}

const counters: Counters = {
  attempted: 0,
  parsed: 0,
  ocrQueued: 0,
  failed: 0,
  skippedUnsupported: 0,
  skippedExhausted: 0,
};

// ---------------------------------------------------------------------------
// Row processing
// ---------------------------------------------------------------------------

interface PendingRow {
  id: string;
  sha256: string;
  source_path: string;
  ext: string;
  attempts: number;
}

async function fetchPendingBatch(): Promise<PendingRow[]> {
  if (!db) return [];
  let query = db
    .from('people_db_files')
    .select('id, sha256, source_path, ext, attempts')
    .eq('status', 'pending')
    .lt('attempts', maxAttempts)
    .order('created_at', { ascending: true })
    .limit(batchSize);
  if (extFilter) query = query.eq('ext', extFilter);
  if (datasetRootFilter) query = query.eq('dataset_root', datasetRootFilter);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PendingRow[];
}

async function markParsing(row: PendingRow): Promise<void> {
  if (!db || dryRun) return;
  const { error } = await db
    .from('people_db_files')
    .update({ status: 'parsing', attempts: row.attempts + 1 })
    .eq('id', row.id);
  if (error) throw error;
}

async function markResult(row: PendingRow, result: ParseResult): Promise<void> {
  if (!db || dryRun) return;

  if (result.likelyScanned) {
    // Route scanned PDFs to the OCR queue. dispatchOcr enqueues with the
    // client and sets status='ocr_queued' + ocr_job_id on the row. The
    // callback webhook (Sprint 3 Task C) later flips status → 'parsed'
    // and inserts staging rows when the provider returns OCR text.
    const client = requireOcrClient();
    await dispatchOcr(db, { id: row.id, sha256: row.sha256, source_path: row.source_path }, client);
    counters.ocrQueued += 1;
    return;
  }

  // Sprint 4a Phase 1: persist parser rows to staging BEFORE flipping the
  // file status to 'parsed'. If the staging insert fails the file stays
  // in 'parsing' and the next worker run retries. Keeping these two
  // updates independent (no transaction) is fine because both are
  // idempotent — the (file_id, record_index) unique constraint plus the
  // file status gate prevent duplicate work.
  if (result.rows.length > 0) {
    await insertStagingRecords(db, parsedRowsToStaging(row.id, result.rows));
  }

  const { error } = await db
    .from('people_db_files')
    .update({
      status: 'parsed',
      parser: result.parser,
      row_count: result.row_count,
      error_msg: null,
    })
    .eq('id', row.id);
  if (error) throw error;
  counters.parsed += 1;
}

async function markFailed(row: PendingRow, message: string): Promise<void> {
  if (!db || dryRun) return;
  const { error } = await db
    .from('people_db_files')
    .update({
      status: 'failed',
      error_msg: message.slice(0, 4000), // cap to keep DB rows bounded
      last_error_at: new Date().toISOString(),
    })
    .eq('id', row.id);
  if (error) throw error;
  counters.failed += 1;
}

async function markSkippedUnsupported(row: PendingRow): Promise<void> {
  if (!db || dryRun) return;
  const { error } = await db
    .from('people_db_files')
    .update({ status: 'skipped_unsupported', error_msg: null })
    .eq('id', row.id);
  if (error) throw error;
  counters.skippedUnsupported += 1;
}

async function processRow(row: PendingRow): Promise<void> {
  counters.attempted += 1;
  console.log(
    `[${counters.attempted}] ${row.ext} ${row.source_path} (attempt ${row.attempts + 1}/${maxAttempts})`,
  );

  await markParsing(row);

  let result: ParseResult;
  try {
    result = await dispatchByPath(row.source_path, row.ext);
  } catch (err) {
    if (err instanceof UnsupportedParserError) {
      console.warn(`  ↳ unsupported ext, marking skipped`);
      await markSkippedUnsupported(row);
      return;
    }
    if (err instanceof ParserFailureError) {
      console.warn(`  ↳ parser failed: ${err.message}`);
      await markFailed(row, err.message);
      return;
    }
    // Unexpected error — still dead-letter so the batch keeps moving, but
    // log full stack for the dev to investigate.
    console.error(`  ↳ unexpected error:`, err);
    await markFailed(row, (err as Error).message ?? 'unknown error');
    return;
  }

  console.log(
    `  ↳ ${result.parser} ${result.row_count} rows${result.warnings.length ? ` (${result.warnings.length} warnings)` : ''}${result.likelyScanned ? ' [scanned → ocr_queued]' : ''}`,
  );
  await markResult(row, result);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `Parser worker starting${dryRun ? ' (dry run)' : ''}: limit=${limit === Number.POSITIVE_INFINITY ? 'all' : limit} maxAttempts=${maxAttempts} batchSize=${batchSize}`,
  );
  const started = Date.now();

  while (counters.attempted < limit) {
    const batch = await fetchPendingBatch();
    if (batch.length === 0) break;
    for (const row of batch) {
      if (counters.attempted >= limit) break;
      try {
        await processRow(row);
      } catch (err) {
        // DB error during status mutation — skip this row, do NOT bump
        // counters. The next worker run will retry.
        console.error(`  ↳ DB error for ${row.source_path}:`, err);
      }
    }
    // Safety: in dry-run we'd loop forever because we never mutate status.
    if (dryRun) break;
  }

  // Note exhausted rows for visibility (not selected by fetchPendingBatch).
  if (db && !dryRun) {
    const { count } = await db
      .from('people_db_files')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('attempts', maxAttempts);
    counters.skippedExhausted = count ?? 0;
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone in ${seconds}s`);
  console.log(JSON.stringify(counters, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
