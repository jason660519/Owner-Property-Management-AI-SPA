export interface ConcurrentSuccessRunnerOptions<TItem, TResult> {
  items: TItem[];
  maxConcurrency: number;
  targetSuccessCount: number;
  stopSignal?: AbortSignal;
  runItem: (item: TItem, index: number, signal: AbortSignal) => Promise<TResult>;
  isSuccessful: (result: TResult) => boolean;
  isCancelled?: (result: TResult) => boolean;
  onItemStart?: (item: TItem, index: number) => void;
  onItemResult?: (item: TItem, index: number, result: TResult) => void;
}

export interface ConcurrentSuccessRunnerResult<TResult> {
  results: TResult[];
  successCount: number;
  launchedCount: number;
  cancelledIndices: number[];
  stoppedBySignal: boolean;
}

export async function runConcurrentUntilTargetSuccess<TItem, TResult>(
  options: ConcurrentSuccessRunnerOptions<TItem, TResult>,
): Promise<ConcurrentSuccessRunnerResult<TResult>> {
  const {
    items,
    maxConcurrency,
    targetSuccessCount,
    stopSignal,
    runItem,
    isSuccessful,
    isCancelled,
    onItemStart,
    onItemResult,
  } = options;

  const safeMaxConcurrency = Math.max(1, maxConcurrency);
  const safeTargetSuccessCount = Math.max(1, targetSuccessCount);
  const resultsByIndex = new Map<number, TResult>();
  const cancelledIndices: number[] = [];
  const active = new Map<number, { controller: AbortController; promise: Promise<{ index: number; result: TResult }> }>();

  let nextIndex = 0;
  let successCount = 0;
  let stopScheduling = false;
  let stoppedBySignal = false;
  let resolveStopRace: (() => void) | null = null;

  const markCancelled = (index: number) => {
    if (!cancelledIndices.includes(index)) cancelledIndices.push(index);
  };

  const cancelActiveWithoutWaiting = () => {
    const inflightEntries = Array.from(active.entries());
    active.clear();
    for (const [index, { controller, promise }] of inflightEntries) {
      markCancelled(index);
      controller.abort();
      void promise.catch(() => undefined);
    }
  };

  const handleStopSignalAbort = () => {
    stoppedBySignal = true;
    stopScheduling = true;
    cancelActiveWithoutWaiting();
    resolveStopRace?.();
  };

  if (stopSignal) {
    if (stopSignal.aborted) {
      handleStopSignalAbort();
    } else {
      stopSignal.addEventListener('abort', handleStopSignalAbort, { once: true });
    }
  }

  const launchNext = () => {
    while (!stopScheduling && active.size < safeMaxConcurrency && nextIndex < items.length) {
      const index = nextIndex;
      const item = items[index];
      nextIndex += 1;

      onItemStart?.(item, index);

      const controller = new AbortController();
      const promise = runItem(item, index, controller.signal).then((result) => ({ index, result }));
      active.set(index, { controller, promise });
    }
  };

  launchNext();

  while (active.size > 0) {
    const activeRace = Array.from(active.values(), ({ promise }) =>
      promise.then((value) => ({ type: 'item' as const, value })),
    );
    const stopRace = new Promise<{ type: 'stop' }>((resolve) => {
      if (stoppedBySignal) resolve({ type: 'stop' });
      else resolveStopRace = () => resolve({ type: 'stop' });
    });
    const raced = await Promise.race([...activeRace, stopRace]);
    resolveStopRace = null;

    if (raced.type === 'stop') {
      cancelActiveWithoutWaiting();
      break;
    }

    const settled = raced.value;
    const settledItem = items[settled.index];
    active.delete(settled.index);
    const cancelled = isCancelled?.(settled.result) ?? false;

    if (cancelled) {
      markCancelled(settled.index);
    } else {
      resultsByIndex.set(settled.index, settled.result);
      onItemResult?.(settledItem, settled.index, settled.result);
    }

    if (!cancelled && isSuccessful(settled.result)) {
      successCount += 1;
      if (successCount >= safeTargetSuccessCount) {
        stopScheduling = true;
        cancelActiveWithoutWaiting();
        break;
      }
    }

    if (stoppedBySignal) {
      cancelActiveWithoutWaiting();
      break;
    }

    launchNext();
  }

  if (stopSignal) {
    stopSignal.removeEventListener('abort', handleStopSignalAbort);
  }

  const orderedResults = Array.from(resultsByIndex.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, result]) => result);

  return {
    results: orderedResults,
    successCount,
    launchedCount: nextIndex,
    cancelledIndices: cancelledIndices.sort((a, b) => a - b),
    stoppedBySignal,
  };
}
