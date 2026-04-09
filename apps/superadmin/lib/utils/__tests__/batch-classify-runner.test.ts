import {
  runBatchClassify,
  type BatchJobResult,
  type BatchRunnerOptions,
} from '../batch-classify-runner';

// Helper: create a deferred promise for fine-grained control
function createDeferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Helper: delay
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('runBatchClassify', () => {
  // -----------------------------------------------------------------------
  // Basic execution
  // -----------------------------------------------------------------------

  it('should complete all items and call onProgress for each', async () => {
    const items = ['a', 'b', 'c'];
    const progressCalls: BatchJobResult[] = [];

    const results = await runBatchClassify({
      items,
      concurrency: 2,
      execute: async (item) => ({ ok: true, count: 1 }),
      onProgress: (_completed, _total, result) => {
        progressCalls.push(result);
      },
      signal: new AbortController().signal,
    });

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(progressCalls).toHaveLength(3);
  });

  it('should return empty array for empty items', async () => {
    const results = await runBatchClassify({
      items: [],
      concurrency: 5,
      execute: async () => ({ ok: true, count: 0 }),
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(results).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Concurrency control
  // -----------------------------------------------------------------------

  it('should never exceed concurrency limit', async () => {
    let activeCount = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);

    await runBatchClassify({
      items,
      concurrency: 3,
      execute: async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await delay(10);
        activeCount--;
        return { ok: true, count: 1 };
      },
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('should work when concurrency > items count', async () => {
    const items = ['x', 'y'];

    const results = await runBatchClassify({
      items,
      concurrency: 10,
      execute: async () => ({ ok: true, count: 1 }),
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(results).toHaveLength(2);
  });

  // -----------------------------------------------------------------------
  // Progress reporting
  // -----------------------------------------------------------------------

  it('should report incremental progress with correct completed/total', async () => {
    const items = [1, 2, 3, 4, 5];
    const progressLog: Array<{ completed: number; total: number }> = [];

    await runBatchClassify({
      items,
      concurrency: 1, // sequential for predictable order
      execute: async () => ({ ok: true, count: 1 }),
      onProgress: (completed, total) => {
        progressLog.push({ completed, total });
      },
      signal: new AbortController().signal,
    });

    expect(progressLog).toEqual([
      { completed: 1, total: 5 },
      { completed: 2, total: 5 },
      { completed: 3, total: 5 },
      { completed: 4, total: 5 },
      { completed: 5, total: 5 },
    ]);
  });

  // -----------------------------------------------------------------------
  // Error handling (individual failures)
  // -----------------------------------------------------------------------

  it('should not abort other items when one fails', async () => {
    const items = [1, 2, 3, 4, 5];

    const results = await runBatchClassify({
      items,
      concurrency: 2,
      execute: async (item) => {
        if (item === 3) throw new Error('boom');
        return { ok: true, count: 1 };
      },
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(results).toHaveLength(5);
    const failures = results.filter((r) => !r.ok);
    expect(failures).toHaveLength(1);
    expect(failures[0].error).toBe('boom');
    expect(failures[0].itemIndex).toBe(2); // index of item 3

    const successes = results.filter((r) => r.ok);
    expect(successes).toHaveLength(4);
  });

  it('should report failed results via onProgress', async () => {
    const items = ['ok', 'fail'];
    const progressResults: BatchJobResult[] = [];

    await runBatchClassify({
      items,
      concurrency: 1,
      execute: async (item) => {
        if (item === 'fail') throw new Error('network error');
        return { ok: true, count: 1 };
      },
      onProgress: (_c, _t, result) => progressResults.push(result),
      signal: new AbortController().signal,
    });

    expect(progressResults[0].ok).toBe(true);
    expect(progressResults[1].ok).toBe(false);
    expect(progressResults[1].error).toBe('network error');
  });

  // -----------------------------------------------------------------------
  // Abort: stop sending new batches
  // -----------------------------------------------------------------------

  it('should stop launching new batches after abort', async () => {
    const controller = new AbortController();
    const items = Array.from({ length: 10 }, (_, i) => i);
    let executedCount = 0;

    await runBatchClassify({
      items,
      concurrency: 1,
      execute: async (item) => {
        executedCount++;
        if (item === 2) controller.abort();
        await delay(5);
        return { ok: true, count: 1 };
      },
      onProgress: jest.fn(),
      signal: controller.signal,
    });

    // Item 2 executes and aborts, so at most items 0,1,2 execute
    // (current batch completes but no new batches start)
    expect(executedCount).toBeLessThanOrEqual(3);
  });

  // -----------------------------------------------------------------------
  // Abort: signal propagation to in-flight requests
  // -----------------------------------------------------------------------

  it('should pass abort signal to execute function', async () => {
    const controller = new AbortController();
    const items = [1, 2, 3];
    const signals: AbortSignal[] = [];

    const deferreds = items.map(() => createDeferred());

    const runPromise = runBatchClassify({
      items,
      concurrency: 3,
      execute: async (_item, signal) => {
        signals.push(signal);
        // Wait for deferred - simulates a long-running request
        await deferreds[signals.length - 1].promise;
        return { ok: true, count: 1 };
      },
      onProgress: jest.fn(),
      signal: controller.signal,
    });

    // Wait for all executions to start
    await delay(10);
    expect(signals).toHaveLength(3);

    // Abort
    controller.abort();

    // Resolve deferreds to let the runner finish
    deferreds.forEach((d) => d.resolve());
    await runPromise;

    // All signals should be aborted
    expect(signals.every((s) => s.aborted)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Result shape
  // -----------------------------------------------------------------------

  it('should include itemIndex in each result', async () => {
    const items = ['a', 'b', 'c'];

    const results = await runBatchClassify({
      items,
      concurrency: 1,
      execute: async () => ({ ok: true, count: 5 }),
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(results.map((r) => r.itemIndex)).toEqual([0, 1, 2]);
  });

  it('should preserve execute return data in result', async () => {
    const items = [10, 20];

    const results = await runBatchClassify({
      items,
      concurrency: 2,
      execute: async (item) => ({ ok: true, count: item }),
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(results[0].data).toEqual({ ok: true, count: 10 });
    expect(results[1].data).toEqual({ ok: true, count: 20 });
  });

  // -----------------------------------------------------------------------
  // Edge case: concurrency of 1 (sequential)
  // -----------------------------------------------------------------------

  it('should execute sequentially with concurrency=1', async () => {
    const order: number[] = [];
    const items = [1, 2, 3];

    await runBatchClassify({
      items,
      concurrency: 1,
      execute: async (item) => {
        order.push(item);
        await delay(5);
        return { ok: true, count: 1 };
      },
      onProgress: jest.fn(),
      signal: new AbortController().signal,
    });

    expect(order).toEqual([1, 2, 3]);
  });
});
