#!/usr/bin/env -S npx tsx
// Row 145 Sprint 4a Phase 2 — ER resolve worker CLI.
//
// For each staging row where `normalized IS NOT NULL AND resolved_at IS NULL`:
//   1. call resolveRecord(db, { record: normalized, recordBId: staging.id })
//   2. dispatch on the returned action:
//        'auto_merge'   → insert people_db_person_sources + set staging.person_id
//        'candidate'    → createCandidate() for admin review
//        'new_person'   → insert people_db_persons + person_sources + set staging.person_id
//   3. set staging.resolved_at = NOW()
//
// Once a file has zero staging rows with resolved_at IS NULL, flip the
// file's status: 'normalized' → 'resolved'.
//
// Usage:
//   npx tsx tools/people-db/resolve.ts                # process all
//   npx tsx tools/people-db/resolve.ts --limit 500    # cap
//   npx tsx tools/people-db/resolve.ts --dry-run      # plan, no writes

import { parseArgs } from 'node:util';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  resolveRecord,
  type ResolveAction,
} from '../../apps/superadmin/lib/people-db/entity-resolution';
import type { NormalizedRecord } from '../../apps/superadmin/lib/people-db/normalize';
import { createCandidate } from '../../apps/superadmin/lib/people-db/merge-candidates';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values } = parseArgs({
  options: {
    limit: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    'batch-size': { type: 'string', default: '100' },
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
  autoMerged: number;
  candidates: number;
  newPersons: number;
  filesCompleted: number;
}

const counters: Counters = {
  autoMerged: 0,
  candidates: 0,
  newPersons: 0,
  filesCompleted: 0,
};

interface StagingRow {
  id: string;
  file_id: string;
  normalized: NormalizedRecord;
}

async function fetchBatch(): Promise<StagingRow[]> {
  if (!db) return [];
  const { data, error } = await db
    .from('people_db_staging_records')
    .select('id, file_id, normalized')
    .not('normalized', 'is', null)
    .is('resolved_at', null)
    .order('created_at', { ascending: true })
    .limit(batchSize);
  if (error) throw error;
  return (data ?? []) as StagingRow[];
}

async function insertNewPerson(
  db: SupabaseClient,
  record: NormalizedRecord,
): Promise<string> {
  const { data, error } = await db
    .from('people_db_persons')
    .insert({
      canonical_name: record.name ?? '(unknown)',
      canonical_id_no: record.id_no,
      canonical_phones: record.phones,
      canonical_address: record.address?.normalized ?? null,
      source_count: 1,
    })
    .select('person_id')
    .single();
  if (error) throw error;
  return (data as { person_id: string }).person_id;
}

async function insertPersonSource(
  db: SupabaseClient,
  personId: string,
  recordId: string,
  fileId: string,
  matchReason: 'id_exact' | 'new',
): Promise<void> {
  const { error } = await db.from('people_db_person_sources').insert({
    person_id: personId,
    record_id: recordId,
    file_id: fileId,
    match_reason: matchReason,
  });
  if (error) throw error;
}

async function markResolved(
  db: SupabaseClient,
  stagingId: string,
  personId: string | null,
): Promise<void> {
  const { error } = await db
    .from('people_db_staging_records')
    .update({
      resolved_at: new Date().toISOString(),
      person_id: personId,
    })
    .eq('id', stagingId);
  if (error) throw error;
}

async function applyAction(
  db: SupabaseClient,
  row: StagingRow,
  action: ResolveAction,
): Promise<void> {
  switch (action.action) {
    case 'auto_merge': {
      await insertPersonSource(db, action.person_id, row.id, row.file_id, 'id_exact');
      await markResolved(db, row.id, action.person_id);
      counters.autoMerged += 1;
      return;
    }
    case 'candidate': {
      await createCandidate(db, {
        person_a_id: action.person_id,
        record_b_id: row.id,
        match_reason: action.reason,
        confidence: action.confidence,
      });
      // Candidate is "resolved" in the sense that the worker is done with
      // it — admin decision flips it into people_db_person_sources later.
      await markResolved(db, row.id, null);
      counters.candidates += 1;
      return;
    }
    case 'new_person': {
      const personId = await insertNewPerson(db, row.normalized);
      await insertPersonSource(db, personId, row.id, row.file_id, 'new');
      await markResolved(db, row.id, personId);
      counters.newPersons += 1;
      return;
    }
  }
}

async function maybeFlipFileStatus(fileId: string): Promise<void> {
  if (!db) return;
  const { count, error } = await db
    .from('people_db_staging_records')
    .select('id', { count: 'exact', head: true })
    .eq('file_id', fileId)
    .is('resolved_at', null);
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  // All staging rows resolved → flip file status. Guard on 'normalized'
  // so we don't trample rows that took a different path.
  const { error: updError, count: affected } = await db
    .from('people_db_files')
    .update({ status: 'resolved' }, { count: 'exact' })
    .eq('id', fileId)
    .eq('status', 'normalized');
  if (updError) throw updError;
  if ((affected ?? 0) > 0) counters.filesCompleted += 1;
}

async function main() {
  console.log(
    `ER resolve worker starting${dryRun ? ' (dry run)' : ''}: limit=${limit === Number.POSITIVE_INFINITY ? 'all' : limit} batchSize=${batchSize}`,
  );
  const started = Date.now();
  let processed = 0;

  while (processed < limit) {
    const batch = await fetchBatch();
    if (batch.length === 0) break;

    const touched = new Set<string>();
    for (const row of batch) {
      if (processed >= limit) break;
      if (!db) break;
      const action = await resolveRecord(db, {
        record: row.normalized,
        recordBId: row.id,
      });
      if (dryRun) {
        console.log(`  ${row.id}: ${JSON.stringify(action)}`);
      } else {
        await applyAction(db, row, action);
      }
      processed += 1;
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
