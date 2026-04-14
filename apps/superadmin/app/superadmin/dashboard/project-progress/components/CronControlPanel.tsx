'use client';

// Cron Job Control Panel for the project-progress dashboard.
// Shows each cron job with toggle, interval config, last run info, and manual run button.

import { useState, useCallback } from 'react';
import {
  Timer, Play, Loader2, ChevronDown, ChevronUp,
  CheckCircle2, XCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { CRON_JOB_OPTIONS, type CronJobType } from '@/lib/paperclip/adapter-models';
import type { CronConfig } from '@/lib/hooks/usePaperclipCron';

interface CronControlPanelProps {
  configs: CronConfig[];
  loading: boolean;
  runningJob: CronJobType | null;
  onToggle: (jobType: CronJobType, enabled: boolean) => Promise<boolean>;
  onUpdateInterval: (jobType: CronJobType, seconds: number) => Promise<boolean>;
  onRunJob: (jobType: CronJobType) => Promise<{ ok: boolean; result?: unknown }>;
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.round(seconds / 60);
  return `${min}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const INTERVAL_PRESETS = [30, 60, 180, 300, 600, 900];

export default function CronControlPanel({
  configs, loading, runningJob, onToggle, onUpdateInterval, onRunJob,
}: CronControlPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<Record<string, { ok: boolean; ts: number }>>({});

  const handleRun = useCallback(async (jobType: CronJobType) => {
    const result = await onRunJob(jobType);
    setLastRunResult(prev => ({
      ...prev,
      [jobType]: { ok: result.ok, ts: Date.now() },
    }));
  }, [onRunJob]);

  const enabledCount = configs.filter(c => c.enabled).length;

  return (
    <div className="rounded-lg border border-border-default bg-bg-primary">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span className="text-xs font-semibold text-text-primary">
            Cron Jobs ({enabledCount}/{configs.length} active)
          </span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-text-muted" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border-light px-3 pb-3 pt-2 space-y-2">
          {loading && configs.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading...
            </div>
          )}

          {configs.length === 0 && !loading && (
            <p className="text-[10px] text-text-muted">No cron configs found. Run the migration first.</p>
          )}

          {CRON_JOB_OPTIONS.map(opt => {
            const config = configs.find(c => c.job_type === opt.id);
            if (!config) return null;
            const isRunning = runningJob === opt.id;
            const recentResult = lastRunResult[opt.id];

            return (
              <div
                key={opt.id}
                className="rounded-md border border-border-light bg-bg-secondary/40 px-2 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-text-primary">{opt.label}</span>
                      <ToggleSwitch
                        checked={config.enabled}
                        onChange={(v) => onToggle(opt.id, v)}
                      />
                    </div>
                    <p className="text-[9px] text-text-muted">{opt.description}</p>
                  </div>

                  {/* Manual run */}
                  <button
                    type="button"
                    onClick={() => handleRun(opt.id)}
                    disabled={isRunning}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-medium transition-colors',
                      isRunning
                        ? 'cursor-not-allowed border-border-default text-text-muted'
                        : 'border-sky-500/40 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40',
                    )}
                  >
                    {isRunning
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Running</>
                      : <><Play className="h-3 w-3" /> Run Now</>
                    }
                  </button>
                </div>

                {/* Config row */}
                <div className="mt-1.5 flex items-center gap-3 text-[9px] text-text-muted">
                  <span>Interval:</span>
                  <select
                    className="rounded border border-border-default bg-bg-secondary px-1.5 py-0.5 text-[9px] text-text-primary outline-none"
                    value={config.interval_seconds}
                    onChange={(e) => onUpdateInterval(opt.id, Number(e.target.value))}
                  >
                    {INTERVAL_PRESETS.map(s => (
                      <option key={s} value={s}>{formatInterval(s)}</option>
                    ))}
                  </select>
                  <span>Last run: {formatTime(config.last_run_at)}</span>
                  {recentResult && (
                    <span className="inline-flex items-center gap-0.5">
                      {recentResult.ok
                        ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                        : <XCircle className="h-2.5 w-2.5 text-red-500" />
                      }
                      {recentResult.ok ? 'OK' : 'Failed'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-bg-tertiary',
      )}
    >
      <span
        className={clsx(
          'inline-block h-3 w-3 rounded-full bg-white transition-transform',
          checked ? 'translate-x-3.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
