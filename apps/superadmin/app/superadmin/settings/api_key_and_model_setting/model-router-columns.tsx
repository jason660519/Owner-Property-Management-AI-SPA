'use client';

import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';

export type ModelRouterRow = {
  id: string;
  scenario: string;
  owner: string;
  primaryModel: string;
  fallbackChain: string;
  triggerRule: string;
  status: 'planned' | 'testing' | 'ready';
  notes: string;
};

const col = createColumnHelper<ModelRouterRow>();

export const MODEL_ROUTER_ROWS: ModelRouterRow[] = [
  {
    id: 'MR-001',
    scenario: '謄本解析 AI 助手',
    owner: 'OCR / VLM',
    primaryModel: 'gemini-2.5-pro',
    fallbackChain: 'claude-3-7-sonnet -> gpt-4.1',
    triggerRule: 'OCR 信心值 < 0.80 或 JSON schema 驗證失敗',
    status: 'testing',
    notes: '第一輪失敗時自動補跑 fallback，保留三次結果供比對。',
  },
  {
    id: 'MR-002',
    scenario: '合約條款摘要',
    owner: 'Contract Assistant',
    primaryModel: 'claude-3-7-sonnet',
    fallbackChain: 'gpt-4.1 -> gemini-2.0-flash',
    triggerRule: '回覆逾時 > 20s 或 token 超限',
    status: 'ready',
    notes: '高精度優先，fallback 時降低 max_tokens 控制成本。',
  },
  {
    id: 'MR-003',
    scenario: '房源文案生成',
    owner: 'Listing Content',
    primaryModel: 'gpt-4.1-mini',
    fallbackChain: 'claude-3-5-haiku',
    triggerRule: '429/5xx 連續兩次或內容違反字數規範',
    status: 'ready',
    notes: '採低成本模型為主，並加上語氣模板重試。',
  },
  {
    id: 'MR-004',
    scenario: '客服 FAQ 助手',
    owner: 'Web Assistant',
    primaryModel: 'claude-3-5-haiku',
    fallbackChain: 'gpt-4.1-mini',
    triggerRule: '首 token latency > 3s 或安全檢查未過',
    status: 'testing',
    notes: 'fallback 前先嘗試同模型降溫度重試一次。',
  },
  {
    id: 'MR-005',
    scenario: '批次資料標註（夜間）',
    owner: 'Ops Batch',
    primaryModel: 'gemini-2.0-flash',
    fallbackChain: 'gpt-4.1-mini -> claude-3-5-haiku',
    triggerRule: '工作佇列積壓 > 500 或每分鐘錯誤率 > 5%',
    status: 'planned',
    notes: '批次模式偏吞吐量，fallback 依速度排序。',
  },
];

const STATUS_BADGE: Record<ModelRouterRow['status'], { label: string; className: string }> = {
  planned: {
    label: 'Planned',
    className: 'border-slate-300 bg-slate-100 text-slate-700',
  },
  testing: {
    label: 'Testing',
    className: 'border-amber-300 bg-amber-100 text-amber-800',
  },
  ready: {
    label: 'Ready',
    className: 'border-emerald-300 bg-emerald-100 text-emerald-800',
  },
};

export const MODEL_ROUTER_TABLE_INITIAL_WIDTHS = [8, 14, 12, 14, 16, 18, 8, 10];
export const MODEL_ROUTER_TABLE_MIN_WIDTH_PX = 1600;

export function createModelRouterColumns(): ColumnDef<ModelRouterRow, unknown>[] {
  return [
    col.accessor('id', {
      id: 'col-id',
      header: 'ID',
      meta: { headerEn: 'ID', headerZh: '編號' },
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold text-text-secondary">{getValue()}</span>
      ),
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('scenario', {
      id: 'col-scenario',
      header: 'Scenario',
      meta: { headerEn: 'Scenario', headerZh: '場景 / 模組' },
      cell: ({ getValue }) => (
        <p className="text-xs font-medium text-text-primary">{getValue()}</p>
      ),
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('owner', {
      id: 'col-owner',
      header: 'Owner',
      meta: { headerEn: 'Owner', headerZh: '負責模組' },
      cell: ({ getValue }) => <p className="text-xs text-text-secondary">{getValue()}</p>,
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('primaryModel', {
      id: 'col-primary',
      header: 'Primary Model',
      meta: { headerEn: 'Primary Model', headerZh: '主模型' },
      cell: ({ getValue }) => (
        <p className="font-mono text-[11px] text-text-primary break-all">{getValue()}</p>
      ),
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('fallbackChain', {
      id: 'col-fallback',
      header: 'Fallback Chain',
      meta: { headerEn: 'Fallback Chain', headerZh: 'Fallback 鏈' },
      cell: ({ getValue }) => (
        <p className="font-mono text-[11px] text-text-secondary break-all">{getValue()}</p>
      ),
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('triggerRule', {
      id: 'col-trigger',
      header: 'Trigger Rule',
      meta: { headerEn: 'Trigger Rule', headerZh: '切換條件' },
      cell: ({ getValue }) => <p className="text-xs text-text-secondary">{getValue()}</p>,
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('status', {
      id: 'col-status',
      header: 'Status',
      meta: { headerEn: 'Status', headerZh: '狀態' },
      cell: ({ getValue }) => {
        const badge = STATUS_BADGE[getValue()];
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    }) as ColumnDef<ModelRouterRow, unknown>,
    col.accessor('notes', {
      id: 'col-notes',
      header: 'Notes',
      meta: { headerEn: 'Notes', headerZh: '備註' },
      cell: ({ getValue }) => <p className="text-xs text-text-muted">{getValue()}</p>,
    }) as ColumnDef<ModelRouterRow, unknown>,
  ];
}
