// Row 145 Sprint 3 — OCR dispatch helper.
//
// Submits a PDF to an OcrClient and writes the tracking columns
// (ocr_job_id / ocr_provider / ocr_submitted_at) back onto the
// people_db_files row. Pure orchestration — the worker decides *when*
// to call this (PDF with likelyScanned=true), this module decides
// *how* the DB row reflects the enqueue.

import { readFile } from 'node:fs/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OcrClient, OcrJob } from './types';

export interface DispatchTarget {
  id: string;
  sha256: string;
  source_path: string;
}

/**
 * Reads the PDF buffer, enqueues it with the given OCR client, and
 * updates the people_db_files row to `status='ocr_queued'` with the
 * returned jobId. Returns the job so callers can log / assert.
 *
 * Throws on fs read failure or DB write failure; the caller (worker)
 * catches and dead-letters. enqueue() errors from the client are
 * considered permanent (client handles its own transient retries).
 */
export async function dispatchOcr(
  db: SupabaseClient,
  target: DispatchTarget,
  client: OcrClient,
): Promise<OcrJob> {
  const buffer = await readFile(target.source_path);
  const job = await client.enqueue(
    target.sha256,
    new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
  );

  const { error } = await db
    .from('people_db_files')
    .update({
      status: 'ocr_queued',
      ocr_job_id: job.jobId,
      ocr_provider: job.provider,
      ocr_submitted_at: job.submittedAt.toISOString(),
      error_msg: null,
    })
    .eq('id', target.id);
  if (error) throw error;

  return job;
}
