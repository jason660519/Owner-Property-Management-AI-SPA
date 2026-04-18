// Row 145 Sprint 3 — OCR client interface.
//
// The parse worker routes PDFs where `likelyScanned === true` into an OCR
// queue instead of marking them `parsed`. Real OCR (OpenClaw) is not live
// yet; Sprint 3 ships a `MockOcrClient` that exercises the full enqueue →
// webhook callback → DB update pipeline so the switchover to OpenClaw
// requires only swapping the implementation, not the business logic.

export interface OcrJob {
  /** Unique id for this OCR job — returned by the OCR service on enqueue. */
  jobId: string;
  /** sha256 of the file being OCR'd (so callbacks can be correlated without
   * storing the buffer twice). */
  fileSha256: string;
  /** Wall-clock time the job was submitted — used for stale-job monitoring. */
  submittedAt: Date;
  /** Which backend provider accepted the job. */
  provider: OcrProviderId;
}

export interface OcrPage {
  pageNumber: number;
  text: string;
}

export interface OcrResult {
  jobId: string;
  pages: OcrPage[];
  provider: OcrProviderId;
}

export type OcrProviderId = 'mock' | 'openclaw';

export interface OcrClient {
  readonly provider: OcrProviderId;

  /**
   * Submits a PDF for OCR. Returns an OcrJob the caller persists alongside
   * the file row so the callback handler can later find the row to update.
   *
   * Implementations MUST NOT throw for transient failures — they should
   * retry internally. Callers treat a thrown error as a permanent failure
   * and mark the file as `failed`.
   */
  enqueue(fileSha256: string, pdfBuffer: Uint8Array): Promise<OcrJob>;
}
