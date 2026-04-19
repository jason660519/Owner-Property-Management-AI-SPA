/**
 * @jest-environment node
 */
// Sprint 2b — contract tests for StreamingParseResult vs in-memory ParseResult.

import type { ParseResult, StreamingParseResult } from '../types';
import { isStreamingParseResult } from '../types';

function makeInMemory(): ParseResult {
  return {
    parser: 'csv',
    row_count: 1,
    rows: [{ a: '1' }],
    warnings: [],
    columns: ['a'],
  };
}

async function* asyncBatchIterator(
  batches: Record<string, string>[][],
  signal?: AbortSignal,
): AsyncGenerator<Record<string, string>[]> {
  for (const b of batches) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    yield b;
  }
}

function makeStreaming(): StreamingParseResult {
  let consumed = false;
  return {
    parser: 'dbf',
    columns: ['x'],
    rowsIter: (async function* () {
      yield [{ x: 'a' }];
      yield [{ x: 'b' }];
    })(),
    finalize: async () => {
      consumed = true;
      return { row_count: 2, warnings: ['ok'] };
    },
  };
}

describe('StreamingParseResult contract', () => {
  it('distinguishes in-memory ParseResult via type guard', () => {
    const mem = makeInMemory();
    expect(isStreamingParseResult(mem)).toBe(false);
    const stream = makeStreaming();
    expect(isStreamingParseResult(stream)).toBe(true);
  });

  it('supports async iterator consumption (batched rows)', async () => {
    const s = makeStreaming();
    const out: Record<string, string>[][] = [];
    for await (const batch of s.rowsIter) {
      out.push(batch);
    }
    expect(out).toHaveLength(2);
    const fin = await s.finalize();
    expect(fin.row_count).toBe(2);
    expect(fin.warnings).toEqual(['ok']);
  });

  it('flushes logical batches without flattening to a single array', async () => {
    const batches: Record<string, string>[][] = [
      [{ n: '0' }, { n: '1' }],
      [{ n: '2' }],
    ];
    const s: StreamingParseResult = {
      parser: 'dbf',
      columns: ['n'],
      rowsIter: asyncBatchIterator(batches),
      finalize: async () => ({
        row_count: 3,
        warnings: [],
      }),
    };
    let total = 0;
    const flushed: number[] = [];
    for await (const batch of s.rowsIter) {
      flushed.push(batch.length);
      total += batch.length;
    }
    expect(flushed).toEqual([2, 1]);
    expect(total).toBe(3);
    await expect(s.finalize()).resolves.toMatchObject({ row_count: 3 });
  });

  it('propagates cancellation via AbortSignal', async () => {
    const controller = new AbortController();
    const s: StreamingParseResult = {
      parser: 'dbf',
      columns: ['k'],
      rowsIter: (async function* () {
        yield [{ k: '1' }];
        controller.abort();
        if (controller.signal.aborted) {
          throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
        }
        yield [{ k: '2' }];
      })(),
      finalize: async () => ({ row_count: 1, warnings: [] }),
    };
    const received: string[] = [];
    await expect(async () => {
      for await (const batch of s.rowsIter) {
        for (const row of batch) {
          received.push(row.k);
        }
      }
    }).rejects.toMatchObject({ name: 'AbortError' });
    expect(received).toEqual(['1']);
  });
});
