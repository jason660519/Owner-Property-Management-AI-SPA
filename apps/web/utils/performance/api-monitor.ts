import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Logs API latency to the perf_metrics table.
 * Can be used in route handlers or server actions.
 */
export async function logApiLatency(endpoint: string, method: string, durationMs: number) {
  try {
    const supabase = createAdminClient();
    
    const { error } = await supabase.from('perf_metrics').insert({
      metric_type: 'api_response_time',
      metric_name: endpoint,
      value: durationMs,
      unit: 'ms',
      tags: {
        endpoint,
        method,
      },
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error logging API latency:', error);
    }
  } catch (err) {
    console.error('Failed to log API latency:', err);
  }
}

/**
 * Higher-order function to measure and log execution time.
 */
export async function withLatencyLogging<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    // Fire and forget logging
    logApiLatency(endpoint, method, Math.round(duration));
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logApiLatency(endpoint, method, Math.round(duration));
    throw error;
  }
}
