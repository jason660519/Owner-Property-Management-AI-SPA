'use client';

// Table view for prompt management using TanStack React Table

import { useState, useCallback, useMemo } from 'react';
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Star, Copy, Download, Trash2, Check, FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { SavedPrompt } from './types';
import { exportPromptAsMd } from './PromptFileIO';

/** Lightweight tooltip wrapper — shows label on hover */
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-bg-tertiary px-2 py-1 text-[11px] text-text-primary shadow-lg border border-border-subtle opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </span>
  );
}

interface PromptTableProps {
  prompts: SavedPrompt[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onToggleFavorite: (id: string) => void;
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

export function PromptTable({
  prompts, selectedIds, onToggleSelection, onSelectAll, onClearSelection,
  onToggleFavorite, onEdit, onDelete, onLoad, onBulkExport,
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

  const allSelected = prompts.length > 0 && prompts.every(p => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0;

  const columns = useMemo<ColumnDef<SavedPrompt, unknown>[]>(() => [
    // Checkbox
    {
      id: 'select',
      size: 40,
      header: () => (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => allSelected ? onClearSelection() : onSelectAll()}
          className="accent-accent"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => onToggleSelection(row.original.id)}
          className="accent-accent"
        />
      ),
    },
    // Star
    {
      id: 'favorite',
      size: 40,
      header: () => <Star className="w-3.5 h-3.5 text-text-muted" />,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggleFavorite(row.original.id); }}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`w-4 h-4 ${row.original.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-text-muted hover:text-yellow-400'}`}
          />
        </button>
      ),
    },
    // Name
    {
      accessorKey: 'name',
      header: '名稱',
      size: 200,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onEdit(row.original)}
          className="text-left font-medium text-text-primary hover:text-accent transition-colors truncate max-w-[200px] block"
          title={row.original.name}
        >
          {row.original.name}
        </button>
      ),
    },
    // Tags
    {
      accessorKey: 'tags',
      header: '標籤',
      size: 180,
      cell: ({ row }) => {
        const { tags } = row.original;
        if (!tags.length) return <span className="text-text-muted text-xs">—</span>;
        const shown = tags.slice(0, 3);
        const overflow = tags.length - 3;
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map(t => (
              <Badge key={t} variant="info" size="sm">{t}</Badge>
            ))}
            {overflow > 0 && (
              <Badge variant="default" size="sm">+{overflow}</Badge>
            )}
          </div>
        );
      },
    },
    // Content preview
    {
      accessorKey: 'content',
      header: '內容預覽',
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary font-mono truncate block max-w-[300px]" title={row.original.content}>
          {truncate(row.original.content, 80)}
        </span>
      ),
    },
    // Description
    {
      accessorKey: 'description',
      header: '說明',
      size: 160,
      cell: ({ row }) => (
        <span className="text-xs text-text-secondary truncate block max-w-[160px]" title={row.original.description}>
          {row.original.description || '—'}
        </span>
      ),
    },
    // Updated at
    {
      accessorKey: 'updated_at',
      header: '更新時間',
      size: 100,
      cell: ({ row }) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {formatDate(row.original.updated_at)}
        </span>
      ),
    },
    // Actions
    {
      id: 'actions',
      size: 140,
      header: '操作',
      cell: ({ row }) => {
        const p = row.original;
        const isDeleting = deletingId === p.id;
        const isConfirming = confirmDeleteId === p.id;

        if (isConfirming) {
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="danger"
                size="xs"
                onClick={e => { e.stopPropagation(); handleDelete(p.id); }}
                isLoading={isDeleting}
              >
                確認
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); }}
              >
                取消
              </Button>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
            {onLoad && (
              <Tip label="載入至目前頁面">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onLoad(p.content, p.name); }}
                  className="p-1.5 text-text-muted hover:text-accent transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </Tip>
            )}
            <Tip label={copiedId === p.id ? '已複製！' : '複製 Prompt 內容'}>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleCopy(p); }}
                className="p-1.5 text-text-muted hover:text-accent transition-colors"
              >
                {copiedId === p.id
                  ? <Check className="w-3.5 h-3.5 text-green-400" />
                  : <Copy className="w-3.5 h-3.5" />
                }
              </button>
            </Tip>
            <Tip label="匯出為 .md 檔">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); exportPromptAsMd(p); }}
                className="p-1.5 text-text-muted hover:text-accent transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label="刪除此 Prompt">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </Tip>
          </div>
        );
      },
    },
  ], [
    allSelected, selectedIds, copiedId, confirmDeleteId, deletingId,
    onClearSelection, onSelectAll, onToggleSelection, onToggleFavorite,
    onEdit, onLoad, handleCopy, handleDelete,
  ]);

  const table = useReactTable({
    data: prompts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.id,
  });

  return (
    <div>
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-bg-secondary rounded-lg border border-border-subtle">
          <span className="text-sm text-text-secondary">
            已選取 {selectedIds.size} 筆
          </span>
          <Button
            variant="outline"
            size="xs"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => onBulkExport(Array.from(selectedIds))}
          >
            匯出選取
          </Button>
          <Button variant="ghost" size="xs" onClick={onClearSelection}>
            取消選取
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-border-default rounded-lg">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-border-default bg-bg-secondary">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-2.5 text-left text-xs font-medium text-text-muted uppercase tracking-wider"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-text-muted">
                  尚無 Prompt，點擊「新增」建立第一筆
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="group/row border-b border-border-subtle hover:bg-bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => onEdit(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-3 py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      <div className="mt-2 text-xs text-text-muted text-right">
        共 {prompts.length} 筆 Prompt
      </div>
    </div>
  );
}
