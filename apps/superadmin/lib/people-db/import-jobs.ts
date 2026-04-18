// Shared utilities for the async People DB import queue. The API endpoints
// and any future cron worker both import from here so the threshold + storage
// layout + processing loop stay consistent.
//
// Layout:
//   - Files stage in the `people-imports` Supabase Storage bucket under
//     `YYYY/MM/DD/<job-id>/<safe-filename>`. The date prefix makes manual
//     cleanup easy and avoids a flat directory with thousands of entries.
//   - people_import_jobs rows own the lifecycle; the worker transitions
//     pending -> processing -> done/failed while bulk-indexing to ES.

import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { esBulkIndex } from './es-gateway';
import { dispatchParse, UnsupportedFormatError, extOf } from './parse-dispatch';
import { mapRowsToDocuments } from './import-mapper';

/** Files at or above this size are routed through the async queue. */
export const ASYNC_THRESHOLD_BYTES = 5 * 1024 * 1024;
/** Upper bound still enforced even in async mode; above this we reject. */
export const MAX_ASYNC_FILE_BYTES = 200 * 1024 * 1024;
export const BULK_CHUNK_SIZE = 500;
export const STORAGE_BUCKET = 'people-imports';

export interface ImportJobRow {
  id: string;
  created_by: string | null;
  file_name: string;
  file_size_bytes: number;
  file_ext: string;
  storage_path: string;
  column_mapping: Record<string, number>;
  dataset_root: string | null;
  dataset_subpath: string | null;
  dataset_path: string | null;
  data_source: string | null;
  batch_label: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  total_rows: number;
  indexed_rows: number;
  failed_rows: number;
  warnings: string[];
  failures: Array<{ index: number; reason: string }>;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  batch_id: string | null;
}

export function buildStoragePath(jobId: string, fileName: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  // Strip directory components + any parent-dir traversals, then collapse
  // anything outside a safe charset.
  let base = fileName.split(/[\\/]/).pop() ?? fileName;
  // Defence-in-depth: even after basename extraction, reject leading dots so a
  // file literally named ".." can never slip through.
  base = base.replace(/^\.+/, '_');
  if (!base || base === '_') base = 'file';
  // Allow ASCII word chars, dot, hyphen, plus a wide CJK range (Han, Hangul,
  // Hiragana, Katakana, and CJK extensions). Anything else -> underscore.
  // \w already covers [A-Za-z0-9_].
  const safe = base.replace(
    /[^\w.\-\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\uf900-\ufaff]/g,
    '_',
  );
  return `${y}/${m}/${d}/${jobId}/${safe}`;
}

interface EnqueueParams {
  userId: string | null;
  file: File;
  columnMapping: Record<string, number>;
  datasetRoot: string | null;
  datasetSubpath: string | null;
  datasetPath: string | null;
  dataSource: string | null;
  batchLabel: string | null;
}

export async function enqueueImportJob(params: EnqueueParams): Promise<ImportJobRow> {
  const ext = extOf(params.file.name);
  const jobId = randomUUID();
  const storagePath = buildStoragePath(jobId, params.file.name);

  const admin = createAdminClient();

  // 1. Upload file to storage. `upsert: false` — each job id is unique so we
  //    never expect a collision; if we do hit one, it's a bug worth surfacing.
  const arrayBuffer = await params.file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: params.file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) {
    throw new Error(`storage upload failed: ${uploadError.message}`);
  }

  // 2. Insert job row with the id we picked so the upload + row share an id.
  const { data, error: insertError } = await admin
    .from('people_import_jobs')
    .insert({
      id: jobId,
      created_by: params.userId,
      file_name: params.file.name,
      file_size_bytes: params.file.size,
      file_ext: ext,
      storage_path: storagePath,
      column_mapping: params.columnMapping,
      dataset_root: params.datasetRoot,
      dataset_subpath: params.datasetSubpath,
      dataset_path: params.datasetPath,
      data_source: params.dataSource,
      batch_label: params.batchLabel,
      status: 'pending',
    })
    .select('*')
    .single();

  if (insertError || !data) {
    // Best-effort cleanup so we don't orphan the upload.
    await admin.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new Error(`job insert failed: ${insertError?.message ?? 'unknown error'}`);
  }

  return data as unknown as ImportJobRow;
}

/**
 * Processes a single job end-to-end: download -> parse -> bulk index -> update
 * status. Throws on unrecoverable errors so the caller can mark the row failed.
 */
export async function processImportJob(jobId: string): Promise<ImportJobRow> {
  const admin = createAdminClient();

  // Claim the job via RPC that wraps SELECT ... FOR UPDATE SKIP LOCKED so two
  // concurrent workers genuinely cannot both transition the same row. The RPC
  // returns 0 rows if the job is already claimed or doesn't exist.
  const { data: claimedRows, error: claimError } = await admin.rpc(
    'claim_people_import_job',
    { p_job_id: jobId },
  );

  if (claimError) throw new Error(`claim failed: ${claimError.message}`);
  const claimedRow = Array.isArray(claimedRows) ? claimedRows[0] : claimedRows;
  if (!claimedRow) {
    // Already claimed by another worker, or terminal — return current state.
    const current = await fetchJob(jobId);
    if (!current) throw new Error('job not found');
    return current;
  }

  // The RPC returns the core columns we need; refetch the full row for the
  // caller so we surface consistent state (status is now 'processing').
  const refreshed = await fetchJob(jobId);
  if (!refreshed) throw new Error('job disappeared after claim');
  const job = refreshed;

  try {
    // 1. Download staged file.
    const { data: blob, error: downloadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(job.storage_path);
    if (downloadError || !blob) {
      throw new Error(`download failed: ${downloadError?.message ?? 'missing blob'}`);
    }

    const arrayBuffer = await blob.arrayBuffer();
    // Reconstruct a File so dispatchParse can route by extension.
    const fileLike = new File([arrayBuffer], job.file_name);

    // 2. Parse.
    const parsed = await dispatchParse(fileLike);
    if (parsed.likelyScanned) {
      await markFailed(jobId, 'PDF 看起來是掃描影像（純圖片），需先走 OCR 流程。');
      return (await fetchJob(jobId))!;
    }

    // 3. Map rows -> ES documents.
    const batchId = randomUUID();
    const docs = mapRowsToDocuments({
      columns: parsed.columns,
      rows: parsed.rows,
      columnMapping: job.column_mapping,
      datasetPath: job.dataset_path ?? 'uncategorized',
      datasetRoot: job.dataset_root,
      datasetSubpath: job.dataset_subpath,
      dataSource: job.data_source,
      batchId,
      batchLabel: job.batch_label,
    });

    if (docs.length === 0) {
      await markFailed(jobId, 'No valid rows — full_name column is empty for every row.');
      return (await fetchJob(jobId))!;
    }

    // 4. Bulk index in chunks.
    let totalIndexed = 0;
    let totalFailed = 0;
    const failures: Array<{ index: number; reason: string }> = [];
    for (let start = 0; start < docs.length; start += BULK_CHUNK_SIZE) {
      const chunk = docs.slice(start, start + BULK_CHUNK_SIZE);
      const result = await esBulkIndex(chunk);
      totalIndexed += result.indexed;
      totalFailed += result.failed;
      for (const f of result.failures) {
        failures.push({ index: start + f.index, reason: f.reason });
      }
    }

    // 5. Mark done with stats.
    const completedAt = new Date().toISOString();
    await admin
      .from('people_import_jobs')
      .update({
        status: 'done',
        completed_at: completedAt,
        total_rows: parsed.rows.length,
        indexed_rows: totalIndexed,
        failed_rows: totalFailed,
        warnings: parsed.warnings,
        failures: failures.slice(0, 100),
        batch_id: batchId,
      })
      .eq('id', jobId);

    return (await fetchJob(jobId))!;
  } catch (err) {
    const msg =
      err instanceof UnsupportedFormatError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown failure';
    await markFailed(jobId, msg);
    return (await fetchJob(jobId))!;
  }
}

async function markFailed(jobId: string, message: string): Promise<void> {
  const admin = createAdminClient();
  // Look up the staged file path so we can remove it along with marking the
  // row failed. This prevents the bucket from accumulating orphaned uploads
  // once the user has acknowledged the failure; they'd have to re-upload to
  // retry anyway (Sprint 5b may add a true retry that preserves the file).
  const { data: row } = await admin
    .from('people_import_jobs')
    .select('storage_path')
    .eq('id', jobId)
    .maybeSingle();
  const storagePath = (row as { storage_path?: string } | null)?.storage_path ?? null;

  await admin
    .from('people_import_jobs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: message,
    })
    .eq('id', jobId);

  if (storagePath) {
    await admin.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);
  }
}

async function fetchJob(jobId: string): Promise<ImportJobRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('people_import_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  return (data as unknown as ImportJobRow) ?? null;
}
