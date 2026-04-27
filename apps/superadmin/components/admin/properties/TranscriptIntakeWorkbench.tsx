'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Play, RefreshCw, ScanSearch, AlertTriangle } from 'lucide-react';

import type { PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';

type IntakeRunStatus =
  | 'uploaded'
  | 'route_selected'
  | 'detecting'
  | 'parsing'
  | 'reviewing'
  | 'needs_user_confirmation'
  | 'confirmed'
  | 'failed';

interface IntakeRun {
  id: string;
  status: IntakeRunStatus;
  currentPhase: string | null;
  routeDecision: Record<string, unknown>;
  detectionResult: Record<string, unknown>;
  parsedResult: Record<string, unknown>;
  reviewResult: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface TranscriptIntakeWorkbenchProps {
  property: PropertyItem;
  documents: PropertyDocumentItem[];
}

const TRANSCRIPT_DOCUMENT_TYPES = new Set([
  'building_registry_transcript',
  'land_registry_transcript',
  'parking_building_registry_transcript',
  'parking_land_registry_transcript',
]);

const ACTIVE_STATUSES = new Set<IntakeRunStatus>([
  'route_selected',
  'detecting',
  'parsing',
  'reviewing',
]);

const STATUS_LABELS: Record<IntakeRunStatus, string> = {
  uploaded: '已上傳',
  route_selected: '已判斷技術路由',
  detecting: 'AI 初判中',
  parsing: '謄本解析中',
  reviewing: 'AI 審核中',
  needs_user_confirmation: '等待人工確認',
  confirmed: '已確認',
  failed: '失敗',
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function textList(value: unknown): string {
  if (!Array.isArray(value)) return '—';
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length ? items.join('、') : '—';
}

function getAggregateRoute(run: IntakeRun | null): string {
  const routeDecision = asObject(run?.routeDecision);
  return typeof routeDecision.aggregateRoute === 'string' ? routeDecision.aggregateRoute : '—';
}

function getConfidence(run: IntakeRun | null): string {
  const review = asObject(run?.reviewResult);
  return typeof review.confidence === 'number' ? `${Math.round(review.confidence * 100)}%` : '—';
}

export function TranscriptIntakeWorkbench({ property, documents }: TranscriptIntakeWorkbenchProps) {
  const transcriptDocs = useMemo(
    () => documents.filter((doc) => TRANSCRIPT_DOCUMENT_TYPES.has(doc.documentType)),
    [documents],
  );
  const [run, setRun] = useState<IntakeRun | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const loadLatestRun = useCallback(async () => {
    setIsLoadingLatest(true);
    try {
      const params = new URLSearchParams({
        propertyId: property.id,
        propertyType: property.type,
      });
      const res = await fetch(`/api/transcript-intake/runs?${params.toString()}`);
      const body = await res.json().catch(() => ({})) as { runs?: IntakeRun[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? '讀取謄本工作台任務失敗');
      setRun(body.runs?.[0] ?? null);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '讀取謄本工作台任務失敗' });
    } finally {
      setIsLoadingLatest(false);
    }
  }, [property.id, property.type]);

  const pollRun = useCallback(async (runId: string) => {
    const res = await fetch(`/api/transcript-intake/runs/${runId}`);
    const body = await res.json().catch(() => ({})) as { run?: IntakeRun; error?: string };
    if (!res.ok) throw new Error(body.error ?? '更新謄本工作台狀態失敗');
    if (body.run) setRun(body.run);
  }, []);

  useEffect(() => {
    void loadLatestRun();
  }, [loadLatestRun]);

  useEffect(() => {
    if (!run || !ACTIVE_STATUSES.has(run.status)) return;
    const timer = window.setInterval(() => {
      void pollRun(run.id).catch((error) => {
        setMessage({ type: 'error', text: error instanceof Error ? error.message : '輪詢工作台狀態失敗' });
      });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [pollRun, run]);

  async function startRun(runId: string) {
    setIsStarting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/transcript-intake/runs/${runId}/process`, { method: 'POST' });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? '啟動謄本工作台任務失敗');
      setMessage({ type: 'success', text: '已啟動謄本工作台任務' });
      await pollRun(runId);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '啟動謄本工作台任務失敗' });
    } finally {
      setIsStarting(false);
    }
  }

  async function createRun() {
    if (!transcriptDocs.length) return;
    setIsCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/transcript-intake/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          propertyType: property.type,
          documentIds: transcriptDocs.map((doc) => doc.id),
        }),
      });
      const body = await res.json().catch(() => ({})) as { run?: IntakeRun; error?: string };
      if (!res.ok || !body.run) throw new Error(body.error ?? '建立謄本工作台任務失敗');
      setRun(body.run);
      setMessage({ type: 'success', text: '已建立謄本工作台任務' });
      await startRun(body.run.id);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '建立謄本工作台任務失敗' });
    } finally {
      setIsCreating(false);
    }
  }

  async function confirmRun(runId: string) {
    setIsConfirming(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/transcript-intake/runs/${runId}`, { method: 'POST' });
      const body = await res.json().catch(() => ({})) as { run?: IntakeRun; error?: string };
      if (!res.ok || !body.run) throw new Error(body.error ?? '確認謄本工作台結果失敗');
      setRun(body.run);
      setMessage({ type: 'success', text: '已確認並儲存謄本工作台結果' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '確認謄本工作台結果失敗' });
    } finally {
      setIsConfirming(false);
    }
  }

  const detection = asObject(run?.detectionResult);
  const review = asObject(run?.reviewResult);
  const canStartExisting = run?.status === 'route_selected';
  const canConfirm = run?.status === 'needs_user_confirmation';
  const isBusy = isCreating || isStarting || isConfirming || isLoadingLatest || (run ? ACTIVE_STATUSES.has(run.status) : false);

  return (
    <section className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
      <div className="px-4 py-3 border-b border-border-default flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ScanSearch size={16} className="text-accent shrink-0" />
            <h2 className="text-sm font-semibold text-text-primary">謄本工作台</h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            已上傳 {transcriptDocs.length} 份謄本；系統會先判斷 Python/VLM，再執行初判、解析與審核。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadLatestRun()}
            disabled={isLoadingLatest}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
          >
            {isLoadingLatest ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            重新整理
          </button>
          {canStartExisting ? (
            <button
              type="button"
              onClick={() => void startRun(run.id)}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {isStarting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              啟動判讀
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void createRun()}
              disabled={!transcriptDocs.length || isBusy}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {isCreating || isStarting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              建立並判讀
            </button>
          )}
          {canConfirm ? (
            <button
              type="button"
              onClick={() => void confirmRun(run.id)}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-500/15 disabled:opacity-50"
            >
              {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              確認並儲存
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {message ? (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              message.type === 'error'
                ? 'border-red-500/25 bg-red-500/10 text-red-500'
                : 'border-green-500/25 bg-green-500/10 text-green-600'
            }`}
          >
            {message.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
            <span>{message.text}</span>
          </div>
        ) : null}

        {!transcriptDocs.length ? (
          <p className="text-xs text-text-muted">先在下方上傳建物、土地或車位謄本後，即可使用工作台。</p>
        ) : null}

        {run ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
              <p className="text-[11px] text-text-muted">狀態</p>
              <p className="mt-1 text-xs font-semibold text-text-primary">{STATUS_LABELS[run.status] ?? run.status}</p>
              <p className="mt-1 text-[11px] text-text-muted">{run.currentPhase ?? '—'}</p>
            </div>
            <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
              <p className="text-[11px] text-text-muted">技術路由</p>
              <p className="mt-1 text-xs font-semibold text-text-primary">{getAggregateRoute(run)}</p>
            </div>
            <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
              <p className="text-[11px] text-text-muted">初判型態</p>
              <p className="mt-1 text-xs font-semibold text-text-primary">
                {typeof detection.dispositionKind === 'string' ? detection.dispositionKind : '—'}
              </p>
              <p className="mt-1 text-[11px] text-text-muted">{textList(detection.parkingTitleRights)}</p>
            </div>
            <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
              <p className="text-[11px] text-text-muted">審核信心</p>
              <p className="mt-1 text-xs font-semibold text-text-primary">{getConfidence(run)}</p>
              <p className="mt-1 text-[11px] text-text-muted">
                {review.approved === true ? '通過' : run.status === 'needs_user_confirmation' ? '需確認' : '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-text-muted">尚未建立謄本工作台任務。</p>
        )}
      </div>
    </section>
  );
}
