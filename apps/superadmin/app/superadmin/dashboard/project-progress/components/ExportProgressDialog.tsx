// ExportProgressDialog — modal for bulk-exporting roadmap features to Paperclip VIS.
// Lets the user pick mode (batch / incremental / dry-run), triggers the SSE stream,
// shows live progress log, and displays a final result summary.

'use client';

import { useCallback, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

type SyncMode = 'batch' | 'incremental';

interface SSEProgress {
  type: 'progress';
  current: number;
  total: number;
  message: string;
}

interface SSEDone {
  type: 'done';
  success: number;
  skipped: number;
  failed: number;
}

interface SSEError {
  type: 'error';
  message: string;
}

type SSEEvent = SSEProgress | SSEDone | SSEError;

type RunState = 'idle' | 'running' | 'done' | 'error';

interface DoneSummary {
  success: number;
  skipped: number;
  failed: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportProgressDialog({ open, onClose }: Props): React.ReactElement | null {
  const [mode, setMode] = useState<SyncMode>('incremental');
  const [dryRun, setDryRun] = useState(true);
  const [runState, setRunState] = useState<RunState>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<DoneSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const appendLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, msg]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const handleStart = useCallback(async () => {
    if (runState === 'running') return;

    setRunState('running');
    setLogs([]);
    setSummary(null);
    setErrorMsg('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const resp = await fetch('/api/admin/sync-roadmap-to-vis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, dry_run: dryRun }),
        signal: ctrl.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;
          try {
            const evt = JSON.parse(dataLine.slice(6)) as SSEEvent;
            if (evt.type === 'progress') {
              appendLog(`[${String(evt.current).padStart(3, '0')}/${evt.total}] ${evt.message}`);
            } else if (evt.type === 'done') {
              setSummary({ success: evt.success, skipped: evt.skipped, failed: evt.failed });
              setRunState('done');
            } else if (evt.type === 'error') {
              setErrorMsg(evt.message);
              setRunState('error');
            }
          } catch {
            // malformed SSE chunk — ignore
          }
        }
      }

      if (runState !== 'done') setRunState('done');
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') {
        appendLog('⚠ Cancelled by user.');
        setRunState('idle');
      } else {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setRunState('error');
      }
    }
  }, [mode, dryRun, runState, appendLog]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleClose = useCallback(() => {
    if (runState === 'running') handleCancel();
    setRunState('idle');
    setLogs([]);
    setSummary(null);
    setErrorMsg('');
    onClose();
  }, [runState, handleCancel, onClose]);

  if (!open) return null;

  const isRunning = runState === 'running';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-bg-primary border border-border-default rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default flex-none">
          <h2 className="text-lg font-semibold text-text-primary">Export to Paperclip VIS</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        {runState === 'idle' && (
          <div className="px-5 py-4 border-b border-border-default flex-none space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Mode</label>
              <div className="flex gap-3">
                {(['incremental', 'batch'] as SyncMode[]).map(m => (
                  <label key={m} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value={m}
                      checked={mode === m}
                      onChange={() => setMode(m)}
                      className="accent-accent"
                    />
                    <span className="text-sm text-text-primary capitalize">{m}</span>
                    <span className="text-xs text-text-secondary">
                      {m === 'incremental' ? '(skips already-synced)' : '(all features)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={e => setDryRun(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-sm text-text-primary">Dry run</span>
              <span className="text-xs text-text-secondary">(preview without creating issues)</span>
            </label>
          </div>
        )}

        {/* Progress log */}
        {(logs.length > 0 || isRunning) && (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 font-mono text-xs text-text-secondary bg-bg-secondary">
            {logs.map((line, i) => (
              <div key={i} className="leading-5">{line}</div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-accent mt-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Running…</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        )}

        {/* Summary */}
        {runState === 'done' && summary && (
          <div className="px-5 py-3 border-t border-border-default flex-none flex items-center gap-3 bg-bg-secondary">
            <CheckCircle2 className="w-5 h-5 text-success flex-none" />
            <span className="text-sm text-text-primary font-medium">
              Done — ✅ {summary.success} success, ⏭ {summary.skipped} skipped, ❌ {summary.failed} failed
            </span>
          </div>
        )}

        {(runState === 'error' || errorMsg) && (
          <div className="px-5 py-3 border-t border-border-default flex-none flex items-center gap-3 bg-bg-secondary">
            <AlertCircle className="w-5 h-5 text-error flex-none" />
            <span className="text-sm text-error">{errorMsg || 'Unknown error'}</span>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-default flex-none flex justify-end gap-3">
          {isRunning ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-md text-sm border border-border-default text-text-primary hover:bg-bg-secondary transition-colors"
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-md text-sm border border-border-default text-text-primary hover:bg-bg-secondary transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="px-4 py-2 rounded-md text-sm font-medium bg-accent text-white hover:opacity-90 transition-opacity"
              >
                {dryRun ? 'Preview (dry run)' : 'Start Export'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
