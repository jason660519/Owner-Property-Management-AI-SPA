'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import { ROADMAP_DATA } from '@/app/data/roadmap';
import { MarkdownViewer } from '@/components/docs/MarkdownViewer';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';
import {
  buildFallbackDevLogDocPath,
  DEV_TAB_DEFAULTS,
  DEV_TAB_PAGE_KEY,
  DEV_TAB_STORAGE_KEY,
  normalizeRowIdInput,
  resolveConfiguredDevLogDocPath,
  resolveDevLogDocPath,
  type DevTabSettings,
  type ProgressRow,
  type RowSource,
} from '../../../components/development-table/types';
import type { CustomProjectProgressRowPayload } from '../../../types';

interface ProjectFileContent {
  content: string;
  path: string;
  name: string;
  lastModified: string;
  size: number;
  docPathState?: 'configured' | 'missing' | 'invalid';
  configuredValue?: string | null;
}

function buildProgressRowFromCustom(r: CustomProjectProgressRowPayload): ProgressRow | null {
  const id = normalizeRowIdInput(r.rowId);
  if (!id) return null;

  const name = r.name.trim();
  const category = r.category.trim();
  if (!name || !category) return null;

  return {
    name,
    category,
    locatedPage: r.locatedPage?.trim() || undefined,
    percentage: typeof r.percentage === 'number' ? r.percentage : 0,
    featureSpecDocPath: r.featureSpecDocPath?.trim() || undefined,
    tddSpecDocPath: r.tddSpecDocPath?.trim() || undefined,
    docPath: r.docPath?.trim() || undefined,
    testCoverage: typeof r.testCoverage === 'number' ? r.testCoverage : undefined,
    e2eTestCoverage: typeof r.e2eTestCoverage === 'number' ? r.e2eTestCoverage : undefined,
    __rowId: id,
    __source: 'custom' as const,
  };
}

type LoadState = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export default function TaskDevLogPage() {
  const router = useRouter();
  const params = useParams<{ rowId?: string | string[] }>();
  const rawRowId = Array.isArray(params.rowId) ? params.rowId[0] : params.rowId;
  const normalizedRowId = useMemo(() => normalizeRowIdInput(rawRowId ?? ''), [rawRowId]);
  const { settings: tablePrefs } = useTablePreferences<DevTabSettings>({
    pageKey: DEV_TAB_PAGE_KEY,
    storageKey: DEV_TAB_STORAGE_KEY,
    defaults: DEV_TAB_DEFAULTS,
  });

  const rowInfo = useMemo(() => {
    const features = ROADMAP_DATA.features;
    const numeric = /^\d+$/.test(normalizedRowId) ? parseInt(normalizedRowId, 10) : Number.NaN;
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= features.length) {
      const feature = features[numeric - 1];
      if (!feature) return null;

      return {
        row: {
          ...feature,
          __rowId: normalizedRowId,
          __source: 'roadmap' as const,
        } satisfies ProgressRow,
        source: 'roadmap' as RowSource,
      };
    }

    const custom = tablePrefs.customRows
      .map(buildProgressRowFromCustom)
      .find((row) => row?.__rowId === normalizedRowId);

    if (custom) {
      return { row: custom, source: 'custom' as RowSource };
    }

    return null;
  }, [normalizedRowId, tablePrefs.customRows]);

  const configuredDocPath = useMemo(
    () => (rowInfo ? resolveConfiguredDevLogDocPath(rowInfo.row) : null),
    [rowInfo],
  );
  const rawConfiguredDocPath = rowInfo?.row.devLogDocPath?.trim() ?? '';
  const resolvedDocPath = useMemo(
    () => (rowInfo ? resolveDevLogDocPath(rowInfo.row, rowInfo.row.__rowId) : ''),
    [rowInfo],
  );
  const fallbackDocPath = useMemo(
    () => (rowInfo ? buildFallbackDevLogDocPath(rowInfo.row.__rowId) : ''),
    [rowInfo],
  );
  const activeRowId = rowInfo?.row.__rowId ?? '';

  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [fileContent, setFileContent] = useState<ProjectFileContent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRowId || !resolvedDocPath) {
      setFileContent(null);
      setLoadState('idle');
      setLoadError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadMarkdown() {
      setLoadState('loading');
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/project-progress/dev-log?rowId=${encodeURIComponent(activeRowId)}`,
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (response.ok && typeof data.content === 'string') {
          setFileContent(data as ProjectFileContent);
          setLoadState('ready');
          return;
        }

        if (response.status === 404) {
          setFileContent(null);
          setLoadState('missing');
          return;
        }

        const message = typeof data?.error === 'string' ? data.error : '無法載入開發日誌';
        setFileContent(null);
        setLoadError(message);
        setLoadState('error');
      } catch (error) {
        if (controller.signal.aborted || cancelled) return;
        setFileContent(null);
        setLoadError(error instanceof Error ? error.message : '無法載入開發日誌');
        setLoadState('error');
      }
    }

    void loadMarkdown();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeRowId, resolvedDocPath]);

  if (!rowInfo) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/superadmin/dashboard/project-progress#development')}
            className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary/60 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            回到 Project Progress
          </button>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary p-4">
          <p className="text-sm font-medium text-text-primary">找不到 Row ID「{rawRowId ?? ''}」</p>
          <p className="mt-1 text-xs text-text-muted">
            請確認該 Row ID 是否存在於 Development Tab 的 roadmap 或自訂 rows。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/superadmin/dashboard/project-progress#development')}
            className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary/60 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            回到 Project Progress
          </button>
          <div className="min-w-0">
            <p className="text-xs text-text-muted">Row {rowInfo.row.__rowId}</p>
            <p className="text-sm font-semibold text-text-primary truncate">{rowInfo.row.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className="rounded-md border border-border-default bg-bg-secondary px-2 py-1">
            {rowInfo.row.category}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
          <p className="text-[10px] text-text-muted">當前路徑</p>
          <p className="mt-1 break-all font-mono text-xs text-text-primary">/{resolvedDocPath}</p>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
          <p className="text-[10px] text-text-muted">來源</p>
          <p className="mt-1 text-xs text-text-primary">
            {configuredDocPath ? 'roadmap.devLogDocPath' : 'fallback 建議路徑'}
          </p>
        </div>
        <div className="rounded-md border border-border-default bg-bg-secondary px-3 py-2">
          <p className="text-[10px] text-text-muted">最後更新</p>
          <p className="mt-1 text-xs text-text-primary">
            {rowInfo.row.lastModifiedDate || '尚未記錄'}
          </p>
        </div>
      </div>

      {rawConfiguredDocPath && !configuredDocPath && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-text-primary">`devLogDocPath` 設定格式無效</p>
          <p className="mt-1 text-xs text-text-muted">
            目前設定值為 `/{rawConfiguredDocPath.replace(/^\/+/, '')}`，系統已改用 fallback 路徑
            `/{fallbackDocPath}`。
          </p>
        </div>
      )}

      {!rawConfiguredDocPath && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm font-medium text-text-primary">尚未設定 `devLogDocPath`</p>
          <p className="mt-1 text-xs text-text-muted">
            目前以 fallback 路徑顯示，建議將 `roadmap.ts` 對應列的 `devLogDocPath` 指向
            `/{fallbackDocPath}`。
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border-default bg-bg-primary shadow-sm">
        <div className="border-b border-border-light px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Development Log Summary
              </p>
              <p className="text-xs text-text-muted">每個任務 ID 的獨立開發日誌頁面</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loadState === 'loading' || loadState === 'idle' ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
            </div>
          ) : null}

          {loadState === 'ready' && fileContent ? (
            <div className="mx-auto max-w-4xl">
              <MarkdownViewer
                content={fileContent.content}
                fileName={fileContent.name}
                lastModified={fileContent.lastModified}
              />
            </div>
          ) : null}

          {loadState === 'missing' ? (
            <div className="rounded-md border border-dashed border-border-default bg-bg-secondary px-4 py-8 text-center">
              <p className="text-sm font-medium text-text-primary">尚未建立這個任務的開發日誌 md</p>
              <p className="mt-2 text-xs text-text-muted">
                建議先建立 `/{resolvedDocPath}`，之後這個頁面就會自動載入內容。
              </p>
            </div>
          ) : null}

          {loadState === 'error' && loadError ? (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-8">
              <p className="text-sm font-medium text-text-primary">載入失敗</p>
              <p className="mt-2 text-xs text-red-500">{loadError}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
