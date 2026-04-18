// Row 145 Sprint 3 — MockOcrClient unit tests.
// Locks the Sprint 3 contract so swapping in the real OpenClaw client
// doesn't silently drift: jobId shape, provider tag, callback hookup,
// idempotency semantics (Sprint 3 intentionally does NOT dedupe).

import { MockOcrClient } from '../mock-client';
import type { OcrResult } from '../types';

describe('MockOcrClient.enqueue', () => {
  it('returns a job whose jobId has the mock- prefix and provider tag', async () => {
    const client = new MockOcrClient();
    const job = await client.enqueue('abc123', new Uint8Array([1, 2, 3]));
    expect(job.jobId).toMatch(/^mock-[0-9a-f-]+$/);
    expect(job.fileSha256).toBe('abc123');
    expect(job.provider).toBe('mock');
    expect(job.submittedAt).toBeInstanceOf(Date);
  });

  it('issues distinct jobIds for identical inputs (no dedup in Sprint 3)', async () => {
    const client = new MockOcrClient();
    const buffer = new Uint8Array([1, 2, 3]);
    const job1 = await client.enqueue('abc123', buffer);
    const job2 = await client.enqueue('abc123', buffer);
    expect(job1.jobId).not.toBe(job2.jobId);
  });

  it('retains enqueued jobs so callers/tests can inspect the queue', async () => {
    const client = new MockOcrClient();
    const job = await client.enqueue('sha-xyz', new Uint8Array([9, 9]));
    const record = client.getJob(job.jobId);
    expect(record).toBeDefined();
    expect(record?.fileSha256).toBe('sha-xyz');
    expect(record?.bufferLength).toBe(2);
  });
});

describe('MockOcrClient.simulateCallback', () => {
  it('invokes the registered onResult handler with the payload', async () => {
    const client = new MockOcrClient();
    const job = await client.enqueue('abc123', new Uint8Array([1]));

    const received: OcrResult[] = [];
    client.onResult(async (result) => {
      received.push(result);
    });

    await client.simulateCallback(job.jobId, [
      { pageNumber: 1, text: '闕貴卿 南港路一段212號2樓' },
      { pageNumber: 2, text: '江輝吉 重陽路504巷1弄9號' },
    ]);

    expect(received).toHaveLength(1);
    expect(received[0].jobId).toBe(job.jobId);
    expect(received[0].provider).toBe('mock');
    expect(received[0].pages).toHaveLength(2);
    expect(received[0].pages[0].text).toContain('闕貴卿');
  });

  it('throws when the jobId does not exist (prevents phantom callbacks)', async () => {
    const client = new MockOcrClient();
    await expect(
      client.simulateCallback('mock-does-not-exist', [{ pageNumber: 1, text: 'x' }]),
    ).rejects.toThrow(/unknown jobId/i);
  });
});
