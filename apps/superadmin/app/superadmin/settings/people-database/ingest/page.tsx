'use client';

// Row 145 Sprint 6 — Ingestion monitoring dashboard.
//
// Three panels:
//   1. Stage count cards — one per people_db_files.status value.
//   2. Failed files list — one row per failed file with a retry button
//      that POSTs /api/people-db/ingest/retry/[fileId].
//   3. Runs timeline — recent rows from people_db_ingest_runs, newest
//      first, failed/interrupted highlighted.
//
// useState + fetch pattern (superadmin app has no TanStack Query);
// Workspace split from default export so tests can mount it directly.

import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageStatus =
  | 'pending'
  | 'parsing'
  | 'parsed'
  | 'ocr_queued'
  | 'normalized'
  | 'resolved'
  | 'indexed'
  | 'failed'
  | 'skipped_unsupported'
  | 'skipped_duplicate'
  | 'missing';

type StageCounts = Partial<Record<StageStatus, number>>;

interface StageCountsResponse {
  counts: StageCounts;
  total: number;
}

interface FailedFile {
  id: string;
  source_path: string;
  ext: string;
  status: string;
  attempts: number;
  error_msg: string | null;
  updated_at?: string;
}

interface FilesResponse {
  items: FailedFile[];
  total: number;
}

type RunStatus = 'running' | 'succeeded' | 'failed' | 'interrupted';

interface IngestRun {
  id: string;
  stage: 'scan' | 'parse' | 'normalize' | 'resolve' | 'reindex' | 'all';
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  processed: number;
  failed: number;
  notes: string | null;
}

interface RunsResponse {
  items: IngestRun[];
}

type Notice = { type: 'success' | 'error'; text: string };

// ---------------------------------------------------------------------------
// Visible status subset for the cards — skipped/missing are less useful
// at a glance and would crowd the layout; accessible via the file list.
// ---------------------------------------------------------------------------

const CARD_STATUSES: ReadonlyArray<{ key: StageStatus; label: string }> = [
  { key: 'pending', label: '待處理' },
  { key: 'parsing', label: '解析中' },
  { key: 'parsed', label: '已解析' },
  { key: 'ocr_queued', label: 'OCR 佇列' },
  { key: 'normalized', label: '已正規化' },
  { key: 'resolved', label: '已解析實體' },
  { key: 'indexed', label: '已索引' },
  { key: 'failed', label: '失敗' },
];

function statusBadgeVariant(
  status: RunStatus,
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'error';
    case 'interrupted':
      return 'warning';
    case 'running':
      return 'info';
    default:
      return 'default';
  }
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-TW');
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export function IngestDashboardWorkspace() {
  const [counts, setCounts] = useState<StageCounts>({});
  const [failedFiles, setFailedFiles] = useState<FailedFile[]>([]);
  const [runs, setRuns] = useState<IngestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [countsRes, filesRes, runsRes] = await Promise.all([
        fetch('/api/people-db/ingest/stage-counts'),
        fetch('/api/people-db/ingest/files?status=failed&page_size=100'),
        fetch('/api/people-db/ingest/runs?limit=20'),
      ]);

      if (!countsRes.ok) throw new Error(`stage-counts HTTP ${countsRes.status}`);
      if (!filesRes.ok) throw new Error(`files HTTP ${filesRes.status}`);
      if (!runsRes.ok) throw new Error(`runs HTTP ${runsRes.status}`);

      const countsBody = (await countsRes.json()) as StageCountsResponse;
      const filesBody = (await filesRes.json()) as FilesResponse;
      const runsBody = (await runsRes.json()) as RunsResponse;

      setCounts(countsBody.counts ?? {});
      setFailedFiles(filesBody.items ?? []);
      setRuns(runsBody.items ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function retryFile(fileId: string): Promise<void> {
    setRetryingId(fileId);
    try {
      const res = await fetch(
        `/api/people-db/ingest/retry/${encodeURIComponent(fileId)}`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFailedFiles((prev) => prev.filter((f) => f.id !== fileId));
      setNotice({ type: 'success', text: '已重新排入待處理佇列' });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? `重試失敗：${err.message}` : '重試失敗',
      });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Ingestion 監控
          </h1>
          <p className="text-text-secondary mt-1">
            追蹤檔案入庫 pipeline 每個階段的進度，並重試失敗檔案。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          重新整理
        </Button>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary"
        >
          {notice.text}
        </div>
      )}

      {loadError && (
        <Card>
          <CardContent className="py-4 flex items-center gap-2 text-text-secondary">
            <AlertCircle className="h-4 w-4" />
            <span>載入失敗：{loadError}</span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={loadAll}>
              重試
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stage count cards */}
      <section aria-labelledby="stage-counts-heading">
        <h2 id="stage-counts-heading" className="text-sm font-medium text-text-secondary mb-2">
          各階段檔案數
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {CARD_STATUSES.map((s) => (
            <div key={s.key} data-testid={`stage-count-${s.key}`}>
              <Card>
                <CardContent className="py-4">
                  <div className="text-xs text-text-secondary">{s.label}</div>
                  <div
                    className={`text-2xl font-semibold ${
                      s.key === 'failed' && (counts[s.key] ?? 0) > 0
                        ? 'text-red-600'
                        : 'text-text-primary'
                    }`}
                  >
                    {counts[s.key] ?? 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Failed files */}
      <section aria-labelledby="failed-files-heading">
        <h2 id="failed-files-heading" className="text-sm font-medium text-text-secondary mb-2">
          失敗檔案 ({failedFiles.length})
        </h2>
        {failedFiles.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-text-secondary">
              目前沒有失敗檔案
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2" data-testid="failed-files-list">
            {failedFiles.map((f) => (
              <Card key={f.id}>
                <CardContent className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {f.source_path}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5">
                      <Badge variant="default">{f.ext}</Badge>
                      <span className="ml-2">嘗試次數：{f.attempts}</span>
                    </div>
                    {f.error_msg && (
                      <div className="text-xs text-text-secondary mt-1 break-all">
                        {f.error_msg}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={retryingId === f.id}
                    onClick={() => retryFile(f.id)}
                    data-testid={`retry-btn-${f.id}`}
                  >
                    {retryingId === f.id ? '重試中…' : '重試'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Runs timeline */}
      <section aria-labelledby="runs-heading">
        <h2 id="runs-heading" className="text-sm font-medium text-text-secondary mb-2">
          最近執行記錄
        </h2>
        {runs.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-text-secondary">
              尚無執行紀錄
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Runs ({runs.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2" data-testid="runs-timeline">
                {runs.map((r) => (
                  <li
                    key={r.id}
                    data-testid={`run-row-${r.id}`}
                    className="flex flex-wrap items-center gap-2 border-t border-border-default pt-2 first:border-t-0 first:pt-0"
                  >
                    <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                    <span className="text-sm text-text-primary">{r.stage}</span>
                    <span className="text-xs text-text-secondary">
                      {formatTimestamp(r.started_at)}
                      {r.finished_at ? ` → ${formatTimestamp(r.finished_at)}` : ' → running'}
                    </span>
                    {r.notes && (
                      <span className="text-xs text-text-secondary">· {r.notes}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — wraps workspace in DashboardLayout.
// ---------------------------------------------------------------------------

export default function IngestDashboardPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="尋人資料庫 — Ingestion 監控"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '尋人資料庫', href: '/superadmin/settings/people-database' },
        { label: 'Ingestion 監控' },
      ]}
    >
      <IngestDashboardWorkspace />
    </DashboardLayout>
  );
}
