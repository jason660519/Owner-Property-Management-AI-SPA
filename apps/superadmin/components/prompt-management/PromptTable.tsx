'use client';

// Prompt management table — powered by EnhancedTable for consistent toolbar UX

import { useState, useCallback, useMemo, useRef } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Copy, Download, Trash2, Check, FileText, ShieldCheck, Pencil,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import EnhancedTable from '@/components/ui/EnhancedTable';
import type { SavedPrompt } from './types';
import { SYSTEM_TAG } from './types';
import { exportPromptAsMd } from './PromptFileIO';

/** Lightweight tooltip wrapper — uses fixed positioning to escape overflow:hidden */
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span ref={ref} className="inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {pos && (
        <span
          className="pointer-events-none fixed whitespace-nowrap rounded bg-bg-tertiary px-2 py-1 text-[11px] text-text-primary shadow-lg border border-border-subtle z-[9999]"
          style={{ left: pos.x, top: pos.y - 4, transform: 'translate(-50%, -100%)' }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

interface PromptTableProps {
  prompts: SavedPrompt[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onEdit: (prompt: SavedPrompt) => void;
  onDelete: (id: string) => Promise<string | null>;
  onLoad?: (content: string, name: string) => void;
  onBulkExport: (ids: string[]) => void;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return dateStr; }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

// Column widths as percentages (must sum ~100)
const INITIAL_WIDTHS = [25, 20, 25, 13, 17];

export function PromptTable({
  prompts, onEdit, onDelete, onLoad, onBulkExport,
}: PromptTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCopy = useCallback(async (prompt: SavedPrompt) => {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
  }, [onDelete]);

  const columns = useMemo<ColumnDef<SavedPrompt, unknown>[]>(() => [
    // Name
    { accessorKey: 'name', header: '名稱',
      cell: ({ row }) => {
        const isSystem = row.original.tags.includes(SYSTEM_TAG);
        return (
          <button type="button" onClick={() => onEdit(row.original)}
            className="text-left font-medium text-text-primary hover:text-accent transition-colors truncate max-w-[200px] flex items-center gap-1.5"
            title={row.original.name}>
            {isSystem && <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />}
            <span className="truncate">{row.original.name}</span>
          </button>
        );
      } },
    // Tags
    { accessorKey: 'tags', header: '標籤', enableSorting: false,
      cell: ({ row }) => {
        const { tags } = row.original;
        if (!tags.length) return <span className="text-text-muted text-xs">—</span>;
        const shown = tags.slice(0, 3);
        const rest = tags.length - 3;
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map(t => <Badge key={t} variant="info" size="sm">{t}</Badge>)}
            {rest > 0 && <Badge variant="default" size="sm">+{rest}</Badge>}
          </div>
        );
      } },
    // Content preview
    { accessorKey: 'content', header: '內容預覽', enableSorting: false,
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary font-mono truncate block max-w-[300px]" title={row.original.content}>
          {truncate(row.original.content, 80)}
        </span>
      ) },
    // Updated at
    { accessorKey: 'updated_at', header: '更新時間',
      cell: ({ row }) => (
        <span className="text-xs text-text-muted whitespace-nowrap">{formatDate(row.original.updated_at)}</span>
      ) },
    // Actions
    { id: 'actions', header: '操作', enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const isSystem = p.tags.includes(SYSTEM_TAG);
        if (confirmDeleteId === p.id) {
          return (
            <div className="flex items-center gap-1">
              <Button variant="danger" size="xs" onClick={e => { e.stopPropagation(); handleDelete(p.id); }} isLoading={deletingId === p.id}>確認</Button>
              <Button variant="ghost" size="xs" onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}>取消</Button>
            </div>
          );
        }
        const ic = 'p-1.5 text-text-muted hover:text-accent transition-colors';
        return (
          <div className="flex items-center gap-0.5">
            <Tip label="編輯"><button type="button" onClick={e => { e.stopPropagation(); onEdit(p); }} className={ic}><Pencil className="w-3.5 h-3.5" /></button></Tip>
            {onLoad && <Tip label="載入至目前頁面"><button type="button" onClick={e => { e.stopPropagation(); onLoad(p.content, p.name); }} className={ic}><FileText className="w-3.5 h-3.5" /></button></Tip>}
            <Tip label={copiedId === p.id ? '已複製！' : '複製 Prompt 內容'}>
              <button type="button" onClick={e => { e.stopPropagation(); handleCopy(p); }} className={ic}>
                {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </Tip>
            <Tip label="匯出為 .md 檔"><button type="button" onClick={e => { e.stopPropagation(); exportPromptAsMd(p); }} className={ic}><Download className="w-3.5 h-3.5" /></button></Tip>
            {isSystem ? (
              <Tip label="系統預設不可刪除"><span className="p-1.5 text-text-muted/30 cursor-not-allowed"><Trash2 className="w-3.5 h-3.5" /></span></Tip>
            ) : (
              <Tip label="刪除此 Prompt"><button type="button" onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id); }} className="p-1.5 text-text-muted hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></Tip>
            )}
          </div>
        );
      } },
  ], [
    copiedId, confirmDeleteId, deletingId,
    onEdit, onLoad, handleCopy, handleDelete,
  ]);

  const getSearchValue = useCallback((row: SavedPrompt) =>
    [row.name, row.description, row.tags.join(' ')].join(' '),
  []);

  const getCategoryValue = useCallback((row: SavedPrompt) =>
    row.tags[0] ?? '未分類',
  []);

  const renderBatchActions = useCallback(
    (selectedRows: SavedPrompt[], clearSelection: () => void) => (
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">
          已選取 {selectedRows.length} 筆
        </span>
        <Button
          variant="outline"
          size="xs"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={() => onBulkExport(selectedRows.map(r => r.id))}
        >
          匯出選取
        </Button>
        <Button variant="ghost" size="xs" onClick={clearSelection}>
          取消選取
        </Button>
      </div>
    ),
    [onBulkExport],
  );

  return (
    <EnhancedTable<SavedPrompt>
      tableId="prompt_management"
      columns={columns}
      data={prompts}
      initialWidths={INITIAL_WIDTHS}
      enableRowSelection
      getSearchValue={getSearchValue}
      getCategoryValue={getCategoryValue}
      renderBatchActions={renderBatchActions}
      pageSizes={[20, 50, 100]}
      minWidth={900}
    />
  );
}
