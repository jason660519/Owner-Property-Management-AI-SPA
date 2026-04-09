import { useEffect, useRef, useState } from 'react';

type UseOperationTimerOptions = {
  precisionDecimals?: number;
  tickMs?: number;
};

export function useOperationTimer(isRunning: boolean, options?: UseOperationTimerOptions) {
  const precisionDecimals = options?.precisionDecimals ?? 1;
  const tickMs = options?.tickMs ?? 100;

  const startedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastDurationSeconds, setLastDurationSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;

    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    let timeoutId: number | null = null;

    const tick = () => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsedSeconds(Number(seconds.toFixed(precisionDecimals)));
    };

    timeoutId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, tickMs);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      const endAt = Date.now();
      const seconds = startedAtRef.current ? (endAt - startedAtRef.current) / 1000 : 0;
      window.setTimeout(() => {
        setLastDurationSeconds(Number(seconds.toFixed(precisionDecimals)));
      }, 0);
      startedAtRef.current = null;
    };
  }, [isRunning, precisionDecimals, tickMs]);

  const reset = () => {
    startedAtRef.current = null;
    setElapsedSeconds(0);
    setLastDurationSeconds(null);
  };

  return { elapsedSeconds, lastDurationSeconds, reset };
}
