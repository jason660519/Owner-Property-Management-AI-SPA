// Row 145 Sprint 4a Phase 2 — merge_candidates CRUD helpers.
//
// Consumed by:
//   - tools/people-db/resolve.ts  (worker writes candidates via createCandidate)
//   - app/api/people-db/merge-candidates/*  (admin API routes confirm/reject)
//
// confirm:
//   1. read candidate (must be pending)
//   2. insert people_db_person_sources with match_reason = confirmed_name_phone
//      or confirmed_name_addr
//   3. mark candidate status='confirmed'
//   (blacklist NOT inserted — confirm is a positive decision)
//
// reject:
//   1. read candidate (must be pending)
//   2. upsert people_db_merge_blacklist so this pair never re-surfaces
//   3. mark candidate status='rejected'

import type { SupabaseClient } from '@supabase/supabase-js';

export type CandidateReason = 'name_phone' | 'name_addr';
export type CandidateStatus = 'pending' | 'confirmed' | 'rejected';

export interface CreateCandidateInput {
  person_a_id: string;
  record_b_id: string;
  match_reason: CandidateReason;
  confidence: number;
}

export interface CandidateRow {
  id: string;
  person_a_id: string;
  record_b_id: string;
  match_reason: CandidateReason;
  confidence: number;
  status: CandidateStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/**
 * Upserts a pending candidate. Runs on (person_a_id, record_b_id) so
 * re-running ER refreshes confidence but keeps any admin decision intact —
 * if the row is already confirmed/rejected, the upsert's status value is
 * ignored in Postgres because our `ON CONFLICT DO UPDATE SET ...` is
 * expressed as just onConflict target (Supabase upsert default updates
 * all columns, so we use ignoreDuplicates=true to preserve decisions).
 */
export async function createCandidate(
  db: SupabaseClient,
  input: CreateCandidateInput,
): Promise<void> {
  const { error } = await db
    .from('people_db_merge_candidates')
    .upsert(
      { ...input, status: 'pending' },
      { onConflict: 'person_a_id,record_b_id', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export class CandidateStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateStateError';
  }
}

async function readPending(
  db: SupabaseClient,
  candidateId: string,
): Promise<Pick<CandidateRow, 'person_a_id' | 'record_b_id' | 'match_reason' | 'status'>> {
  const { data, error } = await db
    .from('people_db_merge_candidates')
    .select('person_a_id, record_b_id, match_reason, status')
    .eq('id', candidateId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new CandidateStateError(`Candidate ${candidateId} not found`);
  const row = data as Pick<CandidateRow, 'person_a_id' | 'record_b_id' | 'match_reason' | 'status'>;
  if (row.status !== 'pending') {
    throw new CandidateStateError(
      `Candidate ${candidateId} is already ${row.status}; can't decide twice`,
    );
  }
  return row;
}

/**
 * Admin clicks "confirm": the suggested merge is correct. Record the
 * staging row as a source for the person and mark the candidate confirmed.
 */
export async function confirmCandidate(
  db: SupabaseClient,
  candidateId: string,
  userId: string,
): Promise<void> {
  const row = await readPending(db, candidateId);
  const confirmedReason =
    row.match_reason === 'name_phone' ? 'confirmed_name_phone' : 'confirmed_name_addr';

  const { error: insErr } = await db.from('people_db_person_sources').insert({
    person_id: row.person_a_id,
    record_id: row.record_b_id,
    match_reason: confirmedReason,
  });
  if (insErr) throw insErr;

  const { error: updErr } = await db
    .from('people_db_merge_candidates')
    .update({
      status: 'confirmed',
      decided_by: userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', candidateId);
  if (updErr) throw updErr;
}

/**
 * Admin clicks "reject": record the pair in the blacklist so ER never
 * suggests it again, then mark the candidate rejected.
 */
export async function rejectCandidate(
  db: SupabaseClient,
  candidateId: string,
  userId: string,
): Promise<void> {
  const row = await readPending(db, candidateId);

  const { error: blErr } = await db.from('people_db_merge_blacklist').upsert(
    { person_a_id: row.person_a_id, record_b_id: row.record_b_id },
    { onConflict: 'person_a_id,record_b_id', ignoreDuplicates: true },
  );
  if (blErr) throw blErr;

  const { error: updErr } = await db
    .from('people_db_merge_candidates')
    .update({
      status: 'rejected',
      decided_by: userId,
      decided_at: new Date().toISOString(),
    })
    .eq('id', candidateId);
  if (updErr) throw updErr;
}
