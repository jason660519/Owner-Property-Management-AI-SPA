#!/usr/bin/env -S npx tsx
// Row 145 Sprint 4a Phase 1 — normalize worker CLI.
//
// Finds staging rows where `normalized IS NULL`, runs normalizeRecord on
// their `raw` JSONB, and writes the normalized JSONB back. After a file's
// staging rows are all normalized, flips the file's status:
//   'parsed' → 'normalized'
//
// Safe to rerun: every operation is idempotent (update by id, status flip
// is guarded by `.eq('status', 'parsed')` so we never downgrade a file
// that ER has already moved to 'resolved').
//
// Usage:
//   npx tsx tools/people-db/normalize.ts                # process all
//   npx tsx tools/people-db/normalize.ts --limit 500    # cap
//   npx tsx tools/people-db/normalize.ts --dry-run      # no writes

import { parseArgs } from 'node:util';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  normalizeRecord,
  DEFAULT_COLUMN_MAP,
} from '../../apps/superadmin/lib/people-db/normalize';
import { updateNormalized } from '../../apps/superadmin/lib/people-db/staging';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'batch-size': { type: 'string', default: '200' },
  },
});

const limit = values.limit ? Number(values.limit) : Number.POSITIVE_INFINITY;
const dryRun = Boolean(values['dry-run']);
const batchSize = Number(values['batch-size']);

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY && !dryRun) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required (or use --dry-run).');
  process.exit(1);
}

const db: SupabaseClient | null = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// ---------------------------------------------------------------------------

interface Counters {
  normalized: number;
  filesCompleted: number;
}

const counters: Counters = { normalized: 0, filesCompleted: 0 };

interface StagingRow {
  id: string;
  file_id: string;
  raw: Record<string, unknown>;
}

async function fetchBatch(): Promise<StagingRow[]> {
  if (!db) return [];
  const { data, error } = await db
    .from('people_db_staging_records')
    .select('id, file_id, raw')
    .is('normalized', null)
    .order('created_at', { ascending: true })
    .limit(batchSize);
  if (error) throw error;
  return (data ?? []) as StagingRow[];
}

async function maybeFlipFileStatus(fileId: string): Promise<void> {
  if (!db) return;
  const { count, error } = await db
    .from('people_db_staging_records')
    .select('id', { count: 'exact', head: true })
    .eq('file_id', fileId)
    .is('normalized', null);
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  // All staging rows normalized → flip file status. Guard on current
  // status='parsed' so we never overwrite a row that ER already moved
  // to 'resolved' in a concurrent run.
  const { error: updError, count: affected } = await db
    .from('people_db_files')
    .update({ status: 'normalized' }, { count: 'exact' })
    .eq('id', fileId)
    .eq('status', 'parsed');
  if (updError) throw updError;
  if ((affected ?? 0) > 0) counters.filesCompleted += 1;
}

async function main() {
  console.log(
    `Normalize worker starting${dryRun ? ' (dry run)' : ''}: limit=${limit === Number.POSITIVE_INFINITY ? 'all' : limit} batchSize=${batchSize}`,
  );
  const started = Date.now();

  while (counters.normalized < limit) {
    const batch = await fetchBatch();
    if (batch.length === 0) break;

    const touched = new Set<string>();
    for (const row of batch) {
      if (counters.normalized >= limit) break;

      // raw may contain non-string values (numbers, bools); coerce to the
      // string shape normalizeRecord expects. null/undefined become ''.
      const rawAsStrings: Record<string, string> = {};
      for (const [k, v] of Object.entries(row.raw)) {
        rawAsStrings[k] = v == null ? '' : String(v);
      }
      const norm = normalizeRecord(rawAsStrings, DEFAULT_COLUMN_MAP);

      if (!dryRun && db) {
        await updateNormalized(db, row.id, norm);
      }
      counters.normalized += 1;
      touched.add(row.file_id);
    }

    if (dryRun) break;
    for (const fileId of touched) {
      await maybeFlipFileStatus(fileId);
    }
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\nDone in ${seconds}s`);
  console.log(JSON.stringify(counters, null, 2));
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
