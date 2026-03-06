import { runConcurrentUntilTargetSuccess } from './concurrent-success-runner';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('runConcurrentUntilTargetSuccess', () => {
  it('replenishes failed tasks while respecting max concurrency and stops after target successes', async () => {
    const started: number[] = [];
    let activeCount = 0;
    let maxObservedConcurrency = 0;

    const items = [
      { ok: true, delayMs: 30 },
      { ok: false, delayMs: 5 },
      { ok: true, delayMs: 20 },
      { ok: true, delayMs: 10 },
      { ok: true, delayMs: 50 },
    ];

    const result = await runConcurrentUntilTargetSuccess({
      items,
      maxConcurrency: 2,
      targetSuccessCount: 3,
      onItemStart: (_item, index) => {
        started.push(index);
      },
      runItem: async (item, _index, signal) => {
        activeCount += 1;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, activeCount);
        return new Promise<(typeof items)[number] & { aborted?: boolean }>((resolve) => {
          const timer = setTimeout(() => {
            activeCount -= 1;
            resolve(item);
          }, item.delayMs);

          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              activeCount -= 1;
              resolve({ ...item, aborted: true });
            },
            { once: true },
          );
        });
      },
      isSuccessful: (item) => item.ok && !item.aborted,
      isCancelled: (item) => item.aborted === true,
    });

    expect(maxObservedConcurrency).toBeLessThanOrEqual(2);
    expect(started).toEqual([0, 1, 2, 3, 4]);
    expect(result.successCount).toBe(3);
    expect(result.launchedCount).toBe(5);
    expect(result.cancelledIndices).toEqual([4]);
    expect(result.results).toEqual([
      { ok: true, delayMs: 30 },
      { ok: false, delayMs: 5 },
      { ok: true, delayMs: 20 },
      { ok: true, delayMs: 10 },
    ]);
  });

  it('aborts inflight work after the success target is reached', async () => {
    const aborted: number[] = [];

    const items = [
      { ok: true, delayMs: 1 },
      { ok: true, delayMs: 50 },
      { ok: true, delayMs: 50 },
    ];

    const result = await runConcurrentUntilTargetSuccess({
      items,
      maxConcurrency: 3,
      targetSuccessCount: 1,
      runItem: async (item, index, signal) => {
        if (index === 0) {
          await delay(item.delayMs);
          return { ...item, aborted: false };
        }

        return new Promise<(typeof item) & { aborted?: boolean }>((resolve) => {
          signal.addEventListener(
            'abort',
            () => {
              aborted.push(index);
              resolve({ ...item, aborted: true });
            },
            { once: true },
          );
        });
      },
      isSuccessful: (item) => item.ok && !item.aborted,
      isCancelled: (item) => item.aborted === true,
    });

    expect(result.successCount).toBe(1);
    expect(result.launchedCount).toBe(3);
    expect(result.cancelledIndices).toEqual([1, 2]);
    expect(aborted.sort((a, b) => a - b)).toEqual([1, 2]);
  });

  it('marks inflight work as cancelled when stopped by an external abort signal', async () => {
    const stopController = new AbortController();

    const resultPromise = runConcurrentUntilTargetSuccess({
      items: [0, 1, 2],
      maxConcurrency: 2,
      targetSuccessCount: 3,
      stopSignal: stopController.signal,
      runItem: async (item, _index, signal) =>
        new Promise<{ id: number; aborted: boolean }>((resolve) => {
          signal.addEventListener(
            'abort',
            () => resolve({ id: item, aborted: true }),
            { once: true },
          );
        }),
      isSuccessful: (item) => !item.aborted,
      isCancelled: (item) => item.aborted,
    });

    stopController.abort();
    const result = await resultPromise;

    expect(result.stoppedBySignal).toBe(true);
    expect(result.successCount).toBe(0);
    expect(result.cancelledIndices).toEqual([0, 1]);
    expect(result.results).toEqual([]);
  });
});
