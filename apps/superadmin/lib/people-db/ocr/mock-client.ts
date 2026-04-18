// Row 145 Sprint 3 — MockOcrClient.
//
// In-memory OcrClient implementation that satisfies the Sprint 3 contract
// without a live OpenClaw service. Supports:
//   - enqueue(sha256, pdfBuffer) returning a unique mock- jobId
//   - onResult(handler) to register a result sink (the callback webhook
//     wires this up in production; tests wire it directly)
//   - simulateCallback(jobId, pages) to fire the handler synchronously
//
// NOT persisted across process restarts — tests instantiate a fresh client
// per suite. The real OpenClaw client will be backed by the service.

import { randomUUID } from 'node:crypto';
import type { OcrClient, OcrJob, OcrPage, OcrResult } from './types';

interface QueueEntry {
  fileSha256: string;
  bufferLength: number;
  submittedAt: Date;
}

type OcrResultHandler = (result: OcrResult) => Promise<void> | void;

export class MockOcrClient implements OcrClient {
  readonly provider = 'mock' as const;
  private readonly queue = new Map<string, QueueEntry>();
  private handler: OcrResultHandler | null = null;

  async enqueue(fileSha256: string, pdfBuffer: Uint8Array): Promise<OcrJob> {
    const jobId = `mock-${randomUUID()}`;
    const submittedAt = new Date();
    this.queue.set(jobId, {
      fileSha256,
      bufferLength: pdfBuffer.byteLength,
      submittedAt,
    });
    return { jobId, fileSha256, submittedAt, provider: this.provider };
  }

  /** Register a handler invoked when a result comes back (prod: webhook; tests: simulateCallback). */
  onResult(handler: OcrResultHandler): void {
    this.handler = handler;
  }

  /** Test helper: fires the registered handler as if OpenClaw returned a result. */
  async simulateCallback(jobId: string, pages: OcrPage[]): Promise<void> {
    if (!this.queue.has(jobId)) {
      throw new Error(`simulateCallback: unknown jobId "${jobId}"`);
    }
    if (!this.handler) return;
    await this.handler({ jobId, pages, provider: this.provider });
  }

  /** Test helper: inspect the queue (byteLength only — buffer itself is not retained). */
  getJob(jobId: string): QueueEntry | undefined {
    return this.queue.get(jobId);
  }

  /** Test helper: number of jobs currently enqueued. */
  size(): number {
    return this.queue.size;
  }
}
