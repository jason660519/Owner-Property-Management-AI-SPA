// filepath: development-table/phase-columns.tsx
// TanStack column definitions for Testing, Deployment, and Operations sheets

import { type ColumnDef } from '@tanstack/react-table';
import { clsx } from 'clsx';
import type { RoadmapFeature } from '@/app/data/roadmap';
import { ProgressBar } from '../ProgressBar';

// --- Common row type for phase sheets (simpler than ProgressRow) ---
export type PhaseRow = RoadmapFeature & { __rowIdx: number };

// --- Shared columns (ID, Category, Feature) ---
function commonColumns(): ColumnDef<PhaseRow, unknown>[] {
  return [
    {
      id: 'col-id',
      accessorFn: (row) => row.__rowIdx,
      header: 'ID',
      meta: { headerEn: 'ID', headerZh: '編碼' },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-text-secondary">
          {(row.original.__rowIdx + 1).toString().padStart(3, '0')}
        </span>
      ),
    },
    {
      id: 'col-category',
      accessorKey: 'category',
      header: 'Category',
      meta: { headerEn: 'Category', headerZh: '分類' },
      cell: ({ getValue }) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-tertiary text-text-primary truncate">
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'col-feature',
      accessorKey: 'name',
      header: 'Feature',
      meta: { headerEn: 'Feature', headerZh: '功能需求名稱' },
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-text-primary break-words line-clamp-2">
          {getValue() as string}
        </span>
      ),
    },
  ];
}

// --- Testing columns ---
export const TESTING_WIDTHS = [5, 10, 22, 13, 13, 15, 12, 10];

export function createTestingColumns(): ColumnDef<PhaseRow, unknown>[] {
  return [
    ...commonColumns(),
    {
      id: 'col-unit-test',
      accessorKey: 'unitTestCoverage',
      header: 'Unit Test (%)',
      meta: { headerEn: 'Unit Test (%)', headerZh: '單元測試 (%)' },
      cell: ({ getValue }) => {
        const v = (getValue() as number | undefined) ?? 0;
        return <div className="w-full"><ProgressBar percentage={v} /></div>;
      },
    },
    {
      id: 'col-e2e-test',
      accessorKey: 'e2eTestCoverage',
      header: 'E2E Test (%)',
      meta: { headerEn: 'E2E Acceptance Test (%)', headerZh: '端到端驗收 (%)' },
      cell: ({ getValue }) => {
        const v = (getValue() as number | undefined) ?? 0;
        return <div className="w-full"><ProgressBar percentage={v} /></div>;
      },
    },
    {
      id: 'col-test-progress',
      accessorKey: 'testProgress',
      header: 'Test Progress',
      meta: { headerEn: 'TDD Spec', headerZh: 'TDD 規格' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return <div className="text-xs text-text-secondary line-clamp-2">{v ?? <span className="text-text-muted italic">—</span>}</div>;
      },
    },
    {
      id: 'col-test-log',
      accessorKey: 'testLog',
      header: 'Test Log',
      meta: { headerEn: 'Test Log', headerZh: '測試日誌' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return <div className="text-xs text-text-secondary line-clamp-2">{v ?? <span className="text-text-muted italic">—</span>}</div>;
      },
    },
    {
      id: 'col-last-modified',
      header: 'Last Modified',
      meta: { headerEn: 'Last Modified', headerZh: '最後修改者' },
      cell: ({ row }) => (
        <div className="text-xs text-text-muted">
          <p className="truncate">{row.original.lastModifiedBy || '—'}</p>
          <p className="font-mono mt-0.5 text-[10px]">{row.original.lastModifiedDate || ''}</p>
        </div>
      ),
    },
  ];
}

// --- Deployment columns ---
const DEPLOY_BADGE: Record<string, { label: string; cls: string }> = {
  not_deployed: { label: '未部署', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  staging: { label: 'Staging', cls: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  production: { label: 'Production', cls: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300' },
  rollback: { label: 'Rollback', cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' },
};

export const DEPLOYMENT_WIDTHS = [5, 10, 20, 12, 10, 10, 12, 11, 10];

export function createDeploymentColumns(): ColumnDef<PhaseRow, unknown>[] {
  return [
    ...commonColumns(),
    {
      id: 'col-deploy-status',
      accessorKey: 'deployStatus',
      header: 'Deploy Status',
      meta: { headerEn: 'Deploy Status', headerZh: '部署狀態' },
      cell: ({ getValue }) => {
        const status = (getValue() as string) ?? 'not_deployed';
        const badge = DEPLOY_BADGE[status] ?? DEPLOY_BADGE.not_deployed;
        return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium', badge.cls)}>{badge.label}</span>;
      },
    },
    {
      id: 'col-deploy-env',
      accessorKey: 'deployEnv',
      header: 'Deploy Env',
      meta: { headerEn: 'Deploy Env', headerZh: '部署環境' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return <span className="text-xs text-text-secondary">{v ?? <span className="text-text-muted italic">—</span>}</span>;
      },
    },
    {
      id: 'col-version',
      accessorKey: 'version',
      header: 'Version',
      meta: { headerEn: 'Version', headerZh: '版本' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return <span className="text-xs font-mono text-text-secondary">{v ?? <span className="text-text-muted italic">—</span>}</span>;
      },
    },
    {
      id: 'col-deploy-date',
      accessorKey: 'deployDate',
      header: 'Deploy Date',
      meta: { headerEn: 'Deploy Date', headerZh: '部署日期' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return <span className="text-xs font-mono text-text-secondary">{v ?? <span className="text-text-muted italic">—</span>}</span>;
      },
    },
    {
      id: 'col-cicd',
      header: 'CI/CD URL',
      meta: { headerEn: 'CI/CD URL', headerZh: 'CI/CD 連結' },
      cell: () => <span className="text-xs text-text-muted italic">—</span>,
    },
    {
      id: 'col-last-modified',
      header: 'Last Modified',
      meta: { headerEn: 'Last Modified', headerZh: '最後修改者' },
      cell: ({ row }) => (
        <div className="text-xs text-text-muted">
          <p className="truncate">{row.original.lastModifiedBy || '—'}</p>
          <p className="font-mono mt-0.5 text-[10px]">{row.original.lastModifiedDate || ''}</p>
        </div>
      ),
    },
  ];
}

// --- Operations columns ---
export const OPERATIONS_WIDTHS = [5, 10, 20, 12, 12, 13, 15, 13];

export function createOperationsColumns(): ColumnDef<PhaseRow, unknown>[] {
  return [
    ...commonColumns(),
    {
      id: 'col-uptime',
      accessorKey: 'uptimePercent',
      header: 'Uptime (%)',
      meta: { headerEn: 'Uptime (%)', headerZh: '正常運行率 (%)' },
      cell: ({ getValue }) => {
        const v = getValue() as number | undefined;
        if (v == null) return <span className="text-text-muted italic text-xs">—</span>;
        return <div className="w-full"><ProgressBar percentage={Math.min(100, Math.max(0, v))} /></div>;
      },
    },
    {
      id: 'col-error-rate',
      accessorKey: 'errorRate',
      header: 'Error Rate (%)',
      meta: { headerEn: 'Error Rate (%)', headerZh: '錯誤率 (%)' },
      cell: ({ getValue }) => {
        const v = getValue() as number | undefined;
        if (v == null) return <span className="text-text-muted italic text-xs">—</span>;
        return <div className="w-full"><ProgressBar percentage={Math.min(100, Math.max(0, v))} /></div>;
      },
    },
    {
      // Cell renders plain number, "ms" lives in the header — follows the
      // create-tanstack-table skill rule "numbers in cell, units in header".
      id: 'col-avg-response',
      accessorKey: 'avgResponseTime',
      header: 'Avg Response (ms)',
      meta: { headerEn: 'Avg Response (ms)', headerZh: '平均回應 (ms)' },
      cell: ({ getValue }) => {
        const v = getValue() as number | undefined;
        return <span className="text-xs font-mono text-text-secondary">{v != null ? v.toLocaleString() : '—'}</span>;
      },
    },
    {
      id: 'col-last-incident',
      accessorKey: 'lastIncident',
      header: 'Last Incident',
      meta: { headerEn: 'Last Incident', headerZh: '最近事件' },
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        return <span className="text-xs text-text-secondary">{v ?? <span className="text-text-muted italic">—</span>}</span>;
      },
    },
    {
      id: 'col-last-modified',
      header: 'Last Modified',
      meta: { headerEn: 'Last Modified', headerZh: '最後修改者' },
      cell: ({ row }) => (
        <div className="text-xs text-text-muted">
          <p className="truncate">{row.original.lastModifiedBy || '—'}</p>
          <p className="font-mono mt-0.5 text-[10px]">{row.original.lastModifiedDate || ''}</p>
        </div>
      ),
    },
  ];
}
