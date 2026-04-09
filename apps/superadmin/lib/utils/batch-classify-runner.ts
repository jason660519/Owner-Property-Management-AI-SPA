/**
 * Generic batch runner with concurrency control and abort support.
 * Pure function — no React dependency, fully testable.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BatchJobResult {
  /** Index of the item in the original array */
  itemIndex: number;
  /** Whether the execution succeeded */
  ok: boolean;
  /** Return value from execute (undefined on failure) */
  data?: unknown;
  /** Error message on failure */
  error?: string;
}

export interface BatchRunnerOptions<T> {
  items: T[];
  concurrency: number;
  /** Called for each item. Receives the abort signal for cancellation. */
  execute: (item: T, signal: AbortSignal) => Promise<unknown>;
  /** Called after each item completes (success or failure). */
  onProgress: (completed: number, total: number, result: BatchJobResult) => void;
  /** Abort signal — when aborted, no new batches start and in-flight get signalled. */
  signal: AbortSignal;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export async function runBatchClassify<T>(
  options: BatchRunnerOptions<T>,
): Promise<BatchJobResult[]> {
  const { items, concurrency, execute, onProgress, signal } = options;

  if (items.length === 0) return [];

  const allResults: BatchJobResult[] = [];
  let completedCount = 0;
  const total = items.length;

  for (let i = 0; i < items.length; i += concurrency) {
    // Check abort before starting a new batch
    if (signal.aborted) break;

    const batch = items.slice(i, i + concurrency);
    const batchStartIndex = i;

    const settled = await Promise.allSettled(
      batch.map(async (item, batchOffset) => {
        const itemIndex = batchStartIndex + batchOffset;
        try {
          const data = await execute(item, signal);
          return { itemIndex, ok: true, data } as BatchJobResult;
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          return { itemIndex, ok: false, error } as BatchJobResult;
        }
      }),
    );

    for (const s of settled) {
      // Promise.allSettled with our try/catch inside always fulfills
      const result = s.status === 'fulfilled'
        ? s.value
        : { itemIndex: -1, ok: false, error: String((s as PromiseRejectedResult).reason) };

      completedCount++;
      allResults.push(result);
      onProgress(completedCount, total, result);
    }
  }

  return allResults;
}
