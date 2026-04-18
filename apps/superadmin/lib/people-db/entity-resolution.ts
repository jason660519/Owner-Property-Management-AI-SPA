// Row 145 Sprint 4a Phase 2 — Entity Resolution core logic.
//
// Two layers:
//   1. decideAction() — pure function: given a normalized record + pre-fetched
//      match candidates + blacklist, emit one of { auto_merge, candidate,
//      new_person }. Unit-tested in isolation.
//   2. resolveRecord() — orchestrator: performs the DB lookups (id-exact
//      match, name+phone match, name+addr match, blacklist) and then calls
//      decideAction. Kept thin so it's integration-tested by the worker.
//
// Match policy (dev-spec decision #1, conservative):
//   - id_no exact    → auto_merge (no admin review)
//   - no id_no + name+phone match not in blacklist → candidate (confidence 0.85)
//   - no id_no + no name+phone + name+addr match not in blacklist → candidate (0.7)
//   - everything else → new_person
//
// Key rule: when a record HAS an id_no but no exact match, we do NOT fall
// through to fuzzy matching — two different people may share a surname and
// phone; the id_no is authoritative and overrides fuzzy signals.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedRecord } from './normalize';

const CONFIDENCE_NAME_PHONE = 0.85;
const CONFIDENCE_NAME_ADDR = 0.7;

export type ResolveAction =
  | { action: 'auto_merge'; person_id: string; reason: 'id_exact' }
  | {
      action: 'candidate';
      person_id: string;
      reason: 'name_phone' | 'name_addr';
      confidence: number;
    }
  | { action: 'new_person' };

export interface DecideInput {
  record: NormalizedRecord;
  recordBId: string; // staging row id; used to build blacklist keys
  idExactMatch: string | null;
  namePhoneMatches: string[];
  nameAddrMatches: string[];
  blacklistKeys: Set<string>; // `${person_id}:${record_b_id}` entries
}

function blacklistKey(personId: string, recordBId: string): string {
  return `${personId}:${recordBId}`;
}

function firstNonBlacklisted(
  candidates: string[],
  recordBId: string,
  blacklist: Set<string>,
): string | null {
  for (const id of candidates) {
    if (!blacklist.has(blacklistKey(id, recordBId))) return id;
  }
  return null;
}

/**
 * Pure decision function. All DB lookups happen upstream so this module
 * is fully jest-testable with plain inputs.
 */
export function decideAction(input: DecideInput): ResolveAction {
  const { record, recordBId, idExactMatch, namePhoneMatches, nameAddrMatches, blacklistKeys } =
    input;

  // id_no path wins unconditionally. If the record has an id_no, the
  // presence or absence of an exact match is the only signal we trust.
  if (record.id_no) {
    if (idExactMatch) {
      return { action: 'auto_merge', person_id: idExactMatch, reason: 'id_exact' };
    }
    return { action: 'new_person' };
  }

  // No id_no → fuzzy. Without a name there's nothing to pivot on, so skip
  // fuzzy and emit new_person. (The ER worker wouldn't have populated the
  // match arrays anyway, but we defend against a buggy upstream.)
  if (!record.name) {
    return { action: 'new_person' };
  }

  const phoneMatch = firstNonBlacklisted(namePhoneMatches, recordBId, blacklistKeys);
  if (phoneMatch) {
    return {
      action: 'candidate',
      person_id: phoneMatch,
      reason: 'name_phone',
      confidence: CONFIDENCE_NAME_PHONE,
    };
  }

  const addrMatch = firstNonBlacklisted(nameAddrMatches, recordBId, blacklistKeys);
  if (addrMatch) {
    return {
      action: 'candidate',
      person_id: addrMatch,
      reason: 'name_addr',
      confidence: CONFIDENCE_NAME_ADDR,
    };
  }

  return { action: 'new_person' };
}

// ---------------------------------------------------------------------------
// Orchestrator — DB lookups + decideAction. Kept thin on purpose.
// ---------------------------------------------------------------------------

export interface ResolveInput {
  record: NormalizedRecord;
  recordBId: string; // staging row id
}

async function findIdExactMatch(
  db: SupabaseClient,
  idNo: string,
): Promise<string | null> {
  const { data, error } = await db
    .from('people_db_persons')
    .select('person_id')
    .eq('canonical_id_no', idNo)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as { person_id: string }).person_id : null;
}

async function findNamePhoneMatches(
  db: SupabaseClient,
  name: string,
  phones: string[],
): Promise<string[]> {
  if (phones.length === 0) return [];
  const { data, error } = await db
    .from('people_db_persons')
    .select('person_id')
    .eq('canonical_name', name)
    .overlaps('canonical_phones', phones);
  if (error) throw error;
  return (data ?? []).map((r) => (r as { person_id: string }).person_id);
}

async function findNameAddrMatches(
  db: SupabaseClient,
  name: string,
  addressSignature: string,
): Promise<string[]> {
  const { data, error } = await db
    .from('people_db_persons')
    .select('person_id, canonical_address')
    .eq('canonical_name', name);
  if (error) throw error;
  const rows = (data ?? []) as Array<{ person_id: string; canonical_address: string | null }>;
  // Compare on county+district+road prefix so "臺北市南港區南港路一段 212 號"
  // and "台北市南港區南港路一段 99 號" still count as a (weak) match.
  return rows
    .filter((r) => {
      if (!r.canonical_address) return false;
      return r.canonical_address.startsWith(addressSignature);
    })
    .map((r) => r.person_id);
}

async function loadBlacklist(
  db: SupabaseClient,
  recordBId: string,
): Promise<Set<string>> {
  const { data, error } = await db
    .from('people_db_merge_blacklist')
    .select('person_a_id, record_b_id')
    .eq('record_b_id', recordBId);
  if (error) throw error;
  const set = new Set<string>();
  for (const r of (data ?? []) as Array<{ person_a_id: string; record_b_id: string }>) {
    set.add(`${r.person_a_id}:${r.record_b_id}`);
  }
  return set;
}

/**
 * Address "signature" used for name+addr fuzzy matching. We join the parts
 * ER cares about (county + district + road) so two records with different
 * street numbers still compare equal. Full-width variants have already
 * been normalized by Row 144's normalizeAddress.
 */
function addressSignature(record: NormalizedRecord): string | null {
  const a = record.address;
  if (!a || !a.county || !a.district || !a.road) return null;
  return `${a.county}${a.district}${a.road}`;
}

/**
 * Orchestrator: does the DB lookups then delegates to decideAction.
 * Returns the action. Writing the action (insert person / insert candidate)
 * is the worker's job so this module stays side-effect free for testing.
 */
export async function resolveRecord(
  db: SupabaseClient,
  input: ResolveInput,
): Promise<ResolveAction> {
  const { record, recordBId } = input;

  // id path is cheap, try first.
  const idExactMatch = record.id_no ? await findIdExactMatch(db, record.id_no) : null;

  let namePhoneMatches: string[] = [];
  let nameAddrMatches: string[] = [];
  if (!record.id_no && record.name) {
    if (record.phones.length > 0) {
      namePhoneMatches = await findNamePhoneMatches(db, record.name, record.phones);
    }
    const addrSig = addressSignature(record);
    if (addrSig) {
      nameAddrMatches = await findNameAddrMatches(db, record.name, addrSig);
    }
  }

  const blacklistKeys = await loadBlacklist(db, recordBId);

  return decideAction({
    record,
    recordBId,
    idExactMatch,
    namePhoneMatches,
    nameAddrMatches,
    blacklistKeys,
  });
}
