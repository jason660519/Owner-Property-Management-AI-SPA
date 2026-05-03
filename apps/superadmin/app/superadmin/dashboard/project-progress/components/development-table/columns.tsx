// filepath: project-progress/components/development-table/columns.tsx
// TanStack Table column definitions for the project progress table (16 columns)

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { ExternalLink, Settings, EyeOff, Eye, X } from 'lucide-react';

import type { ProgressRow } from './types';
import {
  buildDevLogSummaryRoute,
  COLUMN_HEADERS,
  getRowKey,
  resolveConfiguredDevLogDocPath,
  resolveDevLogDocPath,
  resolveE2EFolder,
  resolveUnitTestFolder,
} from './types';
import { buildProjectFileHref } from './path-utils';

const PROJECT_FILE_ALLOWED_PREFIXES = ['apps/superadmin/', 'project-process/'] as const;

// -- Column meta for bilingual headers --
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    headerEn?: string;
    headerZh?: string;
  }
}

const col = createColumnHelper<ProgressRow>();

// -- Shared link renderer for doc paths --
function DocLink({ path, label }: { path: string | undefined; label: string }) {
  if (!path?.trim()) {
    return <span className="text-text-muted italic text-xs">&mdash;</span>;
  }
  const sp = path.trim();
  const isDocsScope = sp === '/docs' || sp.startsWith('/docs/');
  const projectPath = sp.replace(/^\//, '');
  const href = isDocsScope
    ? `/superadmin/docs?path=${encodeURIComponent(sp.slice(6))}`
    : buildProjectFileHref(projectPath, PROJECT_FILE_ALLOWED_PREFIXES);

  if (!href) {
    return <span className="text-text-muted italic text-xs">&mdash;</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full"
      title={sp}
    >
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

// -- Folder link renderer --
function FolderLink({ path }: { path: string }) {
  const href = buildProjectFileHref(path, PROJECT_FILE_ALLOWED_PREFIXES);
  if (!href) {
    return <span className="text-text-muted italic text-xs">&mdash;</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full"
      title={path}
    >
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{path}</span>
    </a>
  );
}

// -- Progress bar renderer --
function ProgressBar({ pct, color }: { pct: number; color: 'emerald' | 'blue' }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const barClass = color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500';
  const label = color === 'emerald' ? 'TDD' : 'E2E';
  return (
    <div className="w-full min-w-0 flex flex-col gap-0.5">
      <div
        className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden"
        title={`${label} ${pct}%`}
      >
        <div
          className={`h-full rounded-full ${barClass} transition-all duration-500 ease-out min-w-0`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-[10px] text-text-muted">{pct}%</span>
    </div>
  );
}

// -- Helper to attach column meta from COLUMN_HEADERS --
function meta(idx: number) {
  const h = COLUMN_HEADERS[idx];
  if (!h) return { headerEn: `Col ${idx}`, headerZh: `Col ${idx}` };
  return { headerEn: h.en, headerZh: h.zh };
}

// -- Factory --
export interface CreateDevColumnsDeps {
  onOpenPromptConfig: (row: ProgressRow) => void;
  hiddenRowKeysSet: Set<string>;
  onToggleHideRow: (rowKey: string) => void;
  onDeleteCustomRow: (rowId: string) => void;
}

export function createDevColumns(deps: CreateDevColumnsDeps): ColumnDef<ProgressRow, unknown>[] {
  const {
    onOpenPromptConfig,
    hiddenRowKeysSet,
    onToggleHideRow,
    onDeleteCustomRow,
  } = deps;

  return [
    // 1. ID
    col.accessor('__rowId', {
      id: 'col-id',
      meta: meta(0),
      cell: ({ row }) => {
        const r = row.original;
        const rowKey = getRowKey(r.__source, r.__rowId);
        const isHidden = hiddenRowKeysSet.has(rowKey);
        return (
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-text-secondary bg-bg-primary border border-border-default px-1.5 py-0.5 rounded h-fit">
              {r.__rowId}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleHideRow(rowKey); }}
              className="inline-flex items-center justify-center rounded border border-border-default bg-bg-secondary/60 p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary"
              title={isHidden ? '顯示 Row' : '隱藏 Row'}
              aria-label={isHidden ? '顯示 Row' : '隱藏 Row'}
            >
              {isHidden
                ? <EyeOff className="w-3.5 h-3.5" />
                : <Eye className="w-3.5 h-3.5" />}
            </button>
            {r.__source === 'custom' && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDeleteCustomRow(r.__rowId); }}
                className="inline-flex items-center justify-center rounded border border-border-default bg-bg-secondary/60 p-1 text-text-muted hover:text-text-primary hover:bg-bg-secondary"
                title="刪除自訂 Row"
                aria-label="刪除自訂 Row"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    }),

    // 2. Category (Role/General)
    col.accessor('category', {
      id: 'col-category',
      meta: meta(1),
      cell: ({ getValue }) => (
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate max-w-full"
          title={getValue()}
        >
          {getValue()}
        </span>
      ),
    }),

    // 3. Located Page
    col.accessor('locatedPage', {
      id: 'col-located-page',
      meta: meta(2),
      cell: ({ getValue }) => (
        <span className="text-sm text-text-primary truncate max-w-full block" title={getValue() ?? ''}>
          {getValue()?.trim() ?? '\u2014'}
        </span>
      ),
    }),

    // 4. Feature
    col.accessor('name', {
      id: 'col-feature',
      meta: meta(3),
      cell: ({ getValue }) => (
        <span className="text-sm text-text-primary truncate max-w-full block" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),

    // 5. Dev Spec (.md)
    col.accessor('featureSpecDocPath', {
      id: 'col-dev-spec',
      meta: meta(4),
      cell: ({ row }) => (
        <DocLink
          path={row.original.featureSpecDocPath}
          label={`${row.original.__rowId}-Dev-Spec.md`}
        />
      ),
    }),

    // 6. TDD Spec (.md)
    col.accessor('tddSpecDocPath', {
      id: 'col-tdd-spec',
      meta: meta(5),
      cell: ({ row }) => (
        <DocLink
          path={row.original.tddSpecDocPath}
          label={`${row.original.__rowId}-TDD-Spec.md`}
        />
      ),
    }),

    // 7. TDD Progress Report (.md)
    col.accessor('docPath', {
      id: 'col-tdd-report',
      meta: meta(6),
      cell: ({ row }) => (
        <DocLink
          path={row.original.docPath}
          label={`${row.original.__rowId}-TDD-Report.md`}
        />
      ),
    }),

    // 8. Unit & Integration Test Folder
    col.accessor(
      (r) => resolveUnitTestFolder(r, r.__rowId),
      {
        id: 'col-unit-test-folder',
        meta: meta(7),
        cell: ({ getValue }) => <FolderLink path={getValue() as string} />,
      },
    ),

    // 9. E2E Acceptance Test Folder
    col.accessor(
      (r) => resolveE2EFolder(r.__rowId),
      {
        id: 'col-e2e-folder',
        meta: meta(8),
        cell: ({ getValue }) => <FolderLink path={getValue() as string} />,
      },
    ),

    // 10. TDD Progress (emerald bar)
    col.accessor('percentage', {
      id: 'col-tdd-progress',
      meta: meta(9),
      cell: ({ getValue }) => <ProgressBar pct={getValue()} color="emerald" />,
    }),

    // 11. E2E Test Progress (blue bar)
    col.accessor(
      (r) => r.e2eTestCoverage ?? r.testCoverage ?? 0,
      {
        id: 'col-e2e-progress',
        meta: meta(10),
        cell: ({ getValue }) => <ProgressBar pct={getValue() as number} color="blue" />,
      },
    ),

    // 12. Prompt & IDE Setting
    col.display({
      id: 'col-prompt',
      meta: meta(11),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenPromptConfig(row.original); }}
          className="inline-flex items-center gap-1 rounded-md border border-border-default bg-bg-secondary/60 px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="truncate">設定 Prompt / 執行</span>
        </button>
      ),
    }),

    // 13. Development log summary
    col.display({
      id: 'col-dev-log-summary',
      meta: meta(12),
      cell: ({ row }) => {
        const r = row.original;
        const summaryHref = buildDevLogSummaryRoute(r.__rowId);
        const rawConfiguredDocPath = r.devLogDocPath?.trim() ?? '';
        const configuredDocPath = resolveConfiguredDevLogDocPath(r);
        const rawDocPath = resolveDevLogDocPath(r, r.__rowId);

        return (
          <div className="flex min-w-0 flex-col gap-1">
            <a
              href={summaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline truncate max-w-full"
              title={`查看 Feature ID ${r.__rowId} 的開發日誌匯總`}
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">查看匯總</span>
            </a>

            {configuredDocPath ? (
              <span
                className="text-[10px] text-text-muted truncate max-w-full"
                title={`/${configuredDocPath}`}
              >
                已設定 md
              </span>
            ) : rawConfiguredDocPath ? (
              <span
                className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-full"
                title={`原始設定值：/${rawConfiguredDocPath.replace(/^\/+/, '')}`}
              >
                路徑格式有誤
              </span>
            ) : (
              <span
                className="text-[10px] text-text-muted truncate max-w-full"
                title={`建議路徑：/${rawDocPath}`}
              >
                尚未建立 .md
              </span>
            )}
          </div>
        );
      },
    }),

    // 14. Notes (placeholder)
    col.display({
      id: 'col-notes',
      meta: meta(13),
      cell: () => (
        <span className="text-sm text-text-muted truncate max-w-full block">&mdash;</span>
      ),
    }),
  ] as ColumnDef<ProgressRow, unknown>[];
}
