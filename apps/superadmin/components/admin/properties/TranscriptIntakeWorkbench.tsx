'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Play, RefreshCw, ScanSearch } from 'lucide-react';

import { buildAreaDetailDraftFromIntake, normalizeAreaDetailDraft } from '@/lib/transcript-parse/intake-area-details';
import type { TranscriptDispositionKind, TranscriptIntakeAreaDetailDraft, TranscriptIntakeAreaDetailRow } from '@/lib/transcript-parse/intake-types';
import type { ParkingTitleRight, PropertyDocumentItem, PropertyItem } from '@/lib/types/properties';
import { TranscriptAiStageTracePanel } from './TranscriptAiStageTracePanel';
import { TranscriptDocumentPreview } from './TranscriptDocumentPreview';
import { TranscriptIntakeAreaDetailEditor } from './TranscriptIntakeAreaDetailEditor';
import { TranscriptIntakeUploadPanel } from './TranscriptIntakeUploadPanel';
import { TranscriptProcessingTimer } from './TranscriptProcessingTimer';
import { TranscriptTechnicalRoutePanel } from './TranscriptTechnicalRoutePanel';

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
  onDocumentsChanged?: () => Promise<void>;
}

const TRANSCRIPT_DOCUMENT_TYPES = new Set([
  'registry_transcript_unclassified', 'building_registry_transcript', 'land_registry_transcript',
  'parking_building_registry_transcript', 'parking_land_registry_transcript', 'building_title', 'land_title',
]);

const ACTIVE_STATUSES = new Set<IntakeRunStatus>(['route_selected', 'detecting', 'parsing', 'reviewing']);

const STATUS_LABELS: Record<IntakeRunStatus, string> = {
  uploaded: '已上傳',
  route_selected: '已判斷技術路由',
  detecting: '系統初判中',
  parsing: 'AI 解析中',
  reviewing: 'AI 驗證中',
  needs_user_confirmation: '等待使用者確認',
  confirmed: '已確認儲存',
  failed: '失敗',
};

const PHASES = ['謄本上傳', '系統初判', 'AI 解析 + 驗證', '使用者確認'] as const;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getString(value: unknown, fallback = '—'): string { return typeof value === 'string' && value.trim() ? value : fallback; }

function getCount(value: unknown): string { return typeof value === 'number' && Number.isFinite(value) ? String(value) : '—'; }

function textList(value: unknown): string {
  if (!Array.isArray(value)) return '—';
  const items = value.filter((item): item is string => typeof item === 'string');
  return items.length ? items.join('、') : '—';
}

function getAggregateRoute(run: IntakeRun | null): string { return getString(asObject(run?.routeDecision).aggregateRoute); }

function getConfidence(run: IntakeRun | null): string {
  const review = asObject(run?.reviewResult);
  return typeof review.confidence === 'number' ? `${Math.round(review.confidence * 100)}%` : '—';
}

function getDispositionKind(run: IntakeRun | null): TranscriptDispositionKind {
  const review = asObject(run?.reviewResult);
  const detection = asObject(run?.detectionResult);
  const raw = typeof review.dispositionKind === 'string' ? review.dispositionKind : detection.dispositionKind;
  const allowed: TranscriptDispositionKind[] = [
    'pure_land_sale',
    'whole_building_sale',
    'townhouse_or_villa_sale',
    'unit_building_with_land_share_sale',
    'parking_only_sale',
    'mixed_or_unclear',
    'unknown',
  ];
  return allowed.includes(raw as TranscriptDispositionKind) ? raw as TranscriptDispositionKind : 'unknown';
}

function getParkingTitleRights(run: IntakeRun | null): ParkingTitleRight[] {
  const review = asObject(run?.reviewResult);
  const detection = asObject(run?.detectionResult);
  const raw = Array.isArray(review.parkingTitleRights)
    ? review.parkingTitleRights
    : Array.isArray(detection.parkingTitleRights)
      ? detection.parkingTitleRights
      : [];
  return [...new Set(raw.filter((value): value is ParkingTitleRight => (
    value === 'independent' || value === 'shared_facility'
  )))];
}

function statusStep(run: IntakeRun | null): number {
  if (!run) return 0;
  if (run.status === 'route_selected' || run.status === 'detecting') return 1;
  if (run.status === 'confirmed') return 3;
  return run.status === 'parsing' || run.status === 'reviewing' || run.status === 'needs_user_confirmation' ? 2 : 0;
}

function formatElapsed(start: string, end: string | null): string {
  const startMs = new Date(start).getTime(), endMs = end ? new Date(end).getTime() : Date.now();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return '—';
  const seconds = Math.round((endMs - startMs) / 1000);
  if (seconds < 60) return `${seconds} 秒`;
  return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;
}

function buildEmptyDraft(run: IntakeRun | null): TranscriptIntakeAreaDetailDraft {
  return {
    version: 1,
    dispositionKind: getDispositionKind(run),
    parkingTitleRights: getParkingTitleRights(run),
    buildingAreas: [],
    landShareAreas: [],
    parkingBuildingAreas: [],
    parkingLandShareAreas: [],
  };
}

function readAiAreaDetailDraft(run: IntakeRun): TranscriptIntakeAreaDetailDraft | null {
  return normalizeAreaDetailDraft(asObject(run.parsedResult).areaDetailDraft);
}

export function TranscriptIntakeWorkbench({
  property,
  documents,
  onDocumentsChanged,
}: TranscriptIntakeWorkbenchProps) {
  const transcriptDocs = useMemo(
    () => documents.filter((doc) => TRANSCRIPT_DOCUMENT_TYPES.has(doc.documentType)),
    [documents],
  );
  const [run, setRun] = useState<IntakeRun | null>(null);
  const [draft, setDraft] = useState<TranscriptIntakeAreaDetailDraft | null>(null);
  const [selectedEvidenceRow, setSelectedEvidenceRow] = useState<TranscriptIntakeAreaDetailRow | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedRunDocumentIds, setSelectedRunDocumentIds] = useState<string[]>([]);
  const previewDocs = useMemo(
    () => transcriptDocs.filter((doc) => selectedRunDocumentIds.includes(doc.id)),
    [selectedRunDocumentIds, transcriptDocs],
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [localProcessingStartedAt, setLocalProcessingStartedAt] = useState<string | null>(null);

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

  useEffect(() => {
    if (!run || (run.status !== 'needs_user_confirmation' && run.status !== 'confirmed')) {
      setDraft(null);
      return;
    }
    setDraft((current) => {
      if (current) return current;
      const aiDraft = readAiAreaDetailDraft(run);
      if (aiDraft) return aiDraft;
      return buildAreaDetailDraftFromIntake({
        parsedResult: run.parsedResult,
        dispositionKind: getDispositionKind(run),
        parkingTitleRights: getParkingTitleRights(run),
      });
    });
  }, [run]);

  useEffect(() => {
    const ids = transcriptDocs.map((doc) => doc.id);
    setSelectedRunDocumentIds((current) => {
      const kept = current.filter((id) => ids.includes(id)); return kept.length ? kept : ids;
    });
  }, [transcriptDocs]);

  useEffect(() => {
    setSelectedDocumentId((current) => (
      current && previewDocs.some((doc) => doc.id === current) ? current : previewDocs[0]?.id ?? null
    ));
    setSelectedEvidenceRow((current) => (current?.sourceDocumentId && !previewDocs.some((doc) => doc.id === current.sourceDocumentId) ? null : current));
  }, [previewDocs]);

  async function startRun(runId: string) {
    setIsStarting(true);
    setLocalProcessingStartedAt((current) => current ?? new Date().toISOString());
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
    const documentIds = transcriptDocs.filter((doc) => selectedRunDocumentIds.includes(doc.id)).map((doc) => doc.id);
    if (!documentIds.length) return;
    setIsCreating(true);
    setLocalProcessingStartedAt(new Date().toISOString());
    setMessage(null);
    try {
      const res = await fetch('/api/transcript-intake/runs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          propertyType: property.type,
          documentIds,
        }),
      });
      const body = await res.json().catch(() => ({})) as { run?: IntakeRun; error?: string };
      if (!res.ok || !body.run) throw new Error(body.error ?? '建立謄本工作台任務失敗');
      setRun(body.run);
      setDraft(null);
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
      const areaDetailDraft = {
        ...(draft ?? buildEmptyDraft(run)),
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch(`/api/transcript-intake/runs/${runId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ areaDetailDraft }),
      });
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
  const isProcessing = isCreating || isStarting || (run ? ACTIVE_STATUSES.has(run.status) : false);
  const currentStep = statusStep(run);
  const visibleDraft = draft ?? buildEmptyDraft(run);

  return (
    <section className="rounded-lg border border-border-default bg-bg-primary overflow-hidden">
      <div className="border-b border-border-default px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ScanSearch size={16} className="text-accent shrink-0" />
              <h2 className="text-sm font-semibold text-text-primary">謄本工作台</h2>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              單一入口處理上傳、技術路由、初判、解析、驗證與確認儲存。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TranscriptProcessingTimer active={isProcessing} startedAt={run?.createdAt || localProcessingStartedAt} />
            <button
              type="button"
              onClick={() => void loadLatestRun()}
              disabled={isLoadingLatest}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-bg-primary px-3 text-xs font-medium text-text-secondary hover:bg-bg-tertiary disabled:opacity-50"
            >
              {isLoadingLatest ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              重新整理
            </button>
            {canStartExisting ? (
              <button
                type="button"
                onClick={() => void startRun(run.id)}
                disabled={isBusy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {isStarting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                啟動判讀
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void createRun()}
                disabled={!selectedRunDocumentIds.length || isBusy}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
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
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-green-500/30 bg-green-500/10 px-3 text-xs font-medium text-green-600 hover:bg-green-500/15 disabled:opacity-50"
              >
                {isConfirming ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                儲存解析結果
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {PHASES.map((label, index) => (
            <div
              key={label}
              className={`rounded-md border px-3 py-2 text-xs ${
                index <= currentStep
                  ? 'border-accent/40 bg-accent/10 text-text-primary'
                  : 'border-border-default bg-bg-secondary text-text-muted'
              }`}
            >
              <span className="font-medium">{index + 1}. {label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
        <div className="space-y-4">
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

            <TranscriptIntakeUploadPanel
              property={property}
              documents={transcriptDocs}
              selectedDocumentId={selectedDocumentId}
              selectedRunDocumentIds={selectedRunDocumentIds}
              disabled={isBusy}
              onSelectDocument={(documentId) => {
                setSelectedDocumentId(documentId);
                setSelectedEvidenceRow(null);
              }}
              onToggleRunDocument={(documentId, checked) => {
                setSelectedRunDocumentIds((current) => (
                  checked ? [...new Set([...current, documentId])] : current.filter((id) => id !== documentId)
                ));
                if (checked) {
                  setSelectedDocumentId(documentId);
                  setSelectedEvidenceRow(null);
                }
              }}
              onSelectAllRunDocuments={(checked) => {
                setSelectedRunDocumentIds(checked ? transcriptDocs.map((doc) => doc.id) : []);
                setSelectedEvidenceRow(null);
              }}
              onUploaded={onDocumentsChanged ?? loadLatestRun}
            />

          <TranscriptTechnicalRoutePanel documents={transcriptDocs} run={run} />

          <TranscriptAiStageTracePanel run={run} />

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
                <p className="mt-1 text-xs font-semibold text-text-primary">{getDispositionKind(run)}</p>
                <p className="mt-1 text-[11px] text-text-muted">{textList(detection.parkingTitleRights)}</p>
              </div>
              <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
                <p className="text-[11px] text-text-muted">審核信心</p>
                <p className="mt-1 text-xs font-semibold text-text-primary">{getConfidence(run)}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-text-muted">
                  <Clock3 size={11} />
                  {formatElapsed(run.createdAt, run.completedAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-xs text-text-muted">
              尚未建立謄本工作台任務。
            </p>
          )}

          <div className="rounded-lg border border-border-default bg-bg-primary p-4">
            <div className="mb-3 flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-text-primary">物件初步內容</h3>
              <p className="text-xs text-text-muted">
                目前判讀：{getDispositionKind(run)}；車位產權：{textList(getParkingTitleRights(run))}；建號 {getCount(detection.buildingNumberCount)} 筆、地號 {getCount(detection.landParcelCount)} 筆。
              </p>
              {Array.isArray(review.userConfirmationRequired) && review.userConfirmationRequired.length ? (
                <p className="text-xs text-yellow-500">
                  需確認：{textList(review.userConfirmationRequired)}
                </p>
              ) : null}
            </div>
            <TranscriptIntakeAreaDetailEditor
              draft={visibleDraft}
              disabled={!canConfirm}
              onChange={setDraft}
              onFocusEvidence={(row) => {
                setSelectedEvidenceRow(row);
                if (row.sourceDocumentId) setSelectedDocumentId(row.sourceDocumentId);
              }}
            />
          </div>
        </div>

        <TranscriptDocumentPreview
          documents={previewDocs}
          selectedDocumentId={selectedDocumentId}
          selectedRow={selectedEvidenceRow}
        />
      </div>
    </section>
  );
}
