// Row 145 Sprint 4b — post-ES aggregation into person-centric view.
//
// The ES people index stores one document per staging record. When the
// admin searches with `group_by=person`, we still search ES the same way
// (keep analyzer behaviour and ranking unchanged) but then fold the flat
// hit list into per-person aggregates so a single real human surfaces as
// one row with N backing sources — mirroring the search-as-a-user
// experience of "I found 闕貴卿 (1 person, 5 sources)".
//
// Pure function so it can be unit-tested without ES / Supabase. The
// /api/people-db/search route is responsible for fetching `sourceLinks`
// from people_db_person_sources and `persons` from people_db_persons
// before calling this helper.

export interface SearchRecord {
  record_id: string;
  full_name: string;
  id_number: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  company: string | null;
  data_source: string | null;
  dataset_path: string | null;
  quality_score: number | null;
  import_batch_id: string | null;
  source_file_path: string | null;
  source_document_id: string | null;
  created_at: string | null;
}

export interface PersonSourceLink {
  record_id: string;
  person_id: string;
}

export interface PersonCanonical {
  person_id: string;
  canonical_name: string | null;
  canonical_id_no: string | null;
  canonical_phones: string[];
  canonical_address: string | null;
  source_count: number;
  quality_score: number | null;
}

export interface PersonAggregate {
  // person_id === null means the record has no ER link yet (orphan).
  // UI renders orphans as single-source entries so ER-lagging data stays
  // searchable without blowing up.
  person_id: string | null;
  canonical_name: string | null;
  canonical_id_no: string | null;
  canonical_phones: string[];
  canonical_address: string | null;
  source_count: number;
  quality_score: number | null;
  sources: SearchRecord[];
}

/**
 * Fold flat ES records into per-person rows.
 *
 * Ordering:
 *   - persons appear in the order their *first* record was encountered
 *     in `records`, preserving ES relevance ranking at the person level
 *   - orphans (records with no source link) appear after persons in
 *     their original ES order
 *
 * Duplicates:
 *   - if the same record_id appears twice in `records` (shouldn't happen
 *     with ES dedupe, but defensive), it is collapsed into one source
 */
export function aggregateByPerson(
  records: SearchRecord[],
  sourceLinks: PersonSourceLink[],
  persons: PersonCanonical[],
): PersonAggregate[] {
  const linkMap = new Map<string, string>();
  for (const link of sourceLinks) linkMap.set(link.record_id, link.person_id);

  const personMap = new Map<string, PersonCanonical>();
  for (const p of persons) personMap.set(p.person_id, p);

  const byPerson = new Map<string, PersonAggregate>();
  const orphans: PersonAggregate[] = [];
  const seenRecords = new Set<string>();

  for (const rec of records) {
    if (seenRecords.has(rec.record_id)) continue;
    seenRecords.add(rec.record_id);

    const pid = linkMap.get(rec.record_id);
    if (!pid) {
      orphans.push({
        person_id: null,
        canonical_name: rec.full_name || null,
        canonical_id_no: rec.id_number,
        canonical_phones: [],
        canonical_address: rec.address,
        source_count: 1,
        quality_score: rec.quality_score,
        sources: [rec],
      });
      continue;
    }

    const existing = byPerson.get(pid);
    if (existing) {
      existing.sources.push(rec);
      continue;
    }

    const canonical = personMap.get(pid);
    byPerson.set(pid, {
      person_id: pid,
      canonical_name: canonical?.canonical_name ?? rec.full_name ?? null,
      canonical_id_no: canonical?.canonical_id_no ?? rec.id_number ?? null,
      canonical_phones: canonical?.canonical_phones ?? [],
      canonical_address: canonical?.canonical_address ?? rec.address ?? null,
      source_count: canonical?.source_count ?? 1,
      quality_score: canonical?.quality_score ?? rec.quality_score,
      sources: [rec],
    });
  }

  return [...byPerson.values(), ...orphans];
}
