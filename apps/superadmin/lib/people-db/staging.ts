// Row 145 Sprint 4a Phase 1 — people_db_staging_records helpers.
//
// Sprint 2 worker calls parsedRowsToStaging + insertStagingRecords after a
// successful parse. Sprint 3 OCR callback calls ocrPagesToStaging + insert.
// Sprint 4a Phase 1 normalize worker reads staging rows with normalized IS
// NULL and writes them back via updateNormalized.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedRecord } from './normalize';

export interface StagingRow {
  file_id: string;
  record_index: number;
  raw: Record<string, unknown>;
}

/**
 * Converts parser output into staging rows. `record_index` is the row's
 * 0-based ordinal within the file so re-parsing the same file upserts in
 * place rather than duplicating.
 */
export function parsedRowsToStaging(
  fileId: string,
  rows: Record<string, unknown>[],
): StagingRow[] {
  return rows.map((raw, idx) => ({ file_id: fileId, record_index: idx, raw }));
}

/**
 * Converts OCR pages into staging rows. Uses (pageNumber - 1) as index so
 * the same (file_id, record_index) unique constraint still applies when
 * OCR re-runs on the same file.
 */
export function ocrPagesToStaging(
  fileId: string,
  pages: { pageNumber: number; text: string }[],
): StagingRow[] {
  return pages.map((p) => ({
    file_id: fileId,
    record_index: p.pageNumber - 1,
    raw: { page_text: p.text, page_number: p.pageNumber },
  }));
}

/**
 * Bulk-upserts staging rows. No-op on empty input so callers don't have to
 * guard length themselves. Conflict target matches the unique constraint
 * (file_id, record_index).
 */
export async function insertStagingRecords(
  db: SupabaseClient,
  rows: StagingRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db
    .from('people_db_staging_records')
    .upsert(rows, { onConflict: 'file_id,record_index' });
  if (error) throw error;
}

/**
 * Writes the normalize worker's output back to a single staging row.
 * normalized_at is server-side NOW() so the schema owns the timestamp.
 */
export async function updateNormalized(
  db: SupabaseClient,
  stagingId: string,
  normalized: NormalizedRecord,
): Promise<void> {
  const { error } = await db
    .from('people_db_staging_records')
    .update({
      normalized: normalized as unknown as Record<string, unknown>,
      normalized_at: new Date().toISOString(),
    })
    .eq('id', stagingId);
  if (error) throw error;
}
