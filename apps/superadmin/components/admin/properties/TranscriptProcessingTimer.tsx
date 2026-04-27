'use client';

import { useEffect, useState } from 'react';
import { Clock3, Loader2 } from 'lucide-react';

interface TranscriptProcessingTimerProps {
  active: boolean;
  startedAt: string | null;
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

export function TranscriptProcessingTimer({ active, startedAt }: TranscriptProcessingTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;
  const startMs = startedAt ? new Date(startedAt).getTime() : now;
  const elapsedSeconds = Math.max(0, Math.floor((now - startMs) / 1000));

  return (
    <div className="inline-flex h-8 items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 text-xs font-medium text-accent">
      <Loader2 size={13} className="animate-spin" />
      <span>系統正在解析</span>
      <span className="inline-flex items-center gap-1 text-text-secondary">
        <Clock3 size={12} />
        已花費 {formatSeconds(elapsedSeconds)}
      </span>
    </div>
  );
}
