-- Migration: People DB — add OCR tracking columns (Row 145 Sprint 3)
-- Date: 2026-04-19
-- Description:
--   The parse worker routes scanned PDFs (likelyScanned=true) to an OCR
--   queue via an OcrClient (MockOcrClient in Sprint 3; OpenClaw when the
--   service goes live). The OCR service is asynchronous: we enqueue a job,
--   record the jobId on the file row, and a webhook later updates the row
--   when the result arrives.
--
--   Columns added:
--     - ocr_job_id       — opaque id returned by the OCR provider; unique
--                          within the window of open jobs. Indexed so the
--                          callback webhook can look up the file in O(1).
--     - ocr_provider     — which backend accepted the job (mock | openclaw).
--                          Lets a single people_db_files row survive a
--                          provider migration without losing audit trail.
--     - ocr_submitted_at — wall-clock of enqueue. Used by monitoring to
--                          alarm on stale jobs (no callback after N mins).

ALTER TABLE public.people_db_files
  ADD COLUMN IF NOT EXISTS ocr_job_id       TEXT,
  ADD COLUMN IF NOT EXISTS ocr_provider     TEXT,
  ADD COLUMN IF NOT EXISTS ocr_submitted_at TIMESTAMPTZ;

-- Partial index: only rows with an active OCR job need to be looked up by
-- jobId. Keeps the index small and avoids bloat from the majority of rows
-- that never touch OCR.
CREATE INDEX IF NOT EXISTS idx_people_db_files_ocr_job_id
    ON public.people_db_files (ocr_job_id)
    WHERE ocr_job_id IS NOT NULL;

COMMENT ON COLUMN public.people_db_files.ocr_job_id IS
    'Row 145 Sprint 3: provider-assigned id for the OCR job; NULL until a scanned PDF is enqueued.';
COMMENT ON COLUMN public.people_db_files.ocr_provider IS
    'Row 145 Sprint 3: which OCR backend accepted the job (mock | openclaw).';
COMMENT ON COLUMN public.people_db_files.ocr_submitted_at IS
    'Row 145 Sprint 3: wall-clock time the OCR job was enqueued; used for stale-job alarms.';
