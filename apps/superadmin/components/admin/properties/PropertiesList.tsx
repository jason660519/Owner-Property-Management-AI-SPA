// filepath: apps/superadmin/components/admin/properties/PropertiesList.tsx
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// Properties table with edit/delete actions synced to Supabase
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { Search, Home, ArrowUpDown, Building2, Key, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { deleteProperty } from '@/lib/actions/properties';
import type { PropertyItem, PropertiesResult } from '@/lib/types/properties';
import { PropertyEditModal } from './PropertyEditModal';

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  available: 'success',
  vacant: 'success',
  occupied: 'info',
  rented: 'info',
  sold: 'default',
  pending: 'warning',
  maintenance: 'warning',
  archived: 'error',
  unavailable: 'error',
};

const statusLabelMap: Record<string, string> = {
  available: '可售',
  vacant: '空置',
  occupied: '已租',
  rented: '已租',
  sold: '已售',
  pending: '待審',
  maintenance: '維修中',
  archived: '已封存',
  unavailable: '下架',
};

function formatPrice(price: number | null): string {
  if (price == null) return '-';
  if (price >= 10000) {
    return `NT$ ${(price / 10000).toLocaleString()}萬`;
  }
  return `NT$ ${price.toLocaleString()}`;
}

function formatRent(rent: number | null): string {
  if (rent == null) return '-';
  return `NT$ ${rent.toLocaleString()}/月`;
}

export function PropertiesList({ data: result }: { data: PropertiesResult }) {
  const router = useRouter();
  const { properties, totalSales, totalRentals } = result;
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rental'>('all');

  // Edit modal state
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  const handleDelete = (property: PropertyItem) => {
    if (!confirm(`確定要刪除「${property.title}」嗎？此操作無法復原。`)) return;

    setDeletingId(property.id);
    startDeleteTransition(async () => {
      const result = await deleteProperty(property.id, property.type);
      if (result.success) {
        router.refresh();
      } else {
        alert(`刪除失敗：${result.message}`);
      }
      setDeletingId(null);
    });
  };

  const filteredData =
    typeFilter === 'all'
      ? properties
      : properties.filter((p) => p.type === typeFilter);

  const columns: ColumnDef<PropertyItem>[] = [
    {
      accessorKey: 'title',
      header: '物件名稱',
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <div
              className={`p-2 rounded-lg ${
                row.type === 'sale'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-blue-500/10 text-blue-500'
              }`}
            >
              {row.type === 'sale' ? <Building2 size={16} /> : <Key size={16} />}
            </div>
            <div>
              <p className="font-medium text-text-primary text-sm">{info.getValue() as string}</p>
              <p className="text-xs text-text-muted mt-0.5">{row.address}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: '類型',
      cell: (info) => (
        <Badge variant={info.getValue() === 'sale' ? 'success' : 'info'}>
          {info.getValue() === 'sale' ? '出售' : '出租'}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: (info) => {
        const status = info.getValue() as string;
        return (
          <Badge variant={statusVariantMap[status] || 'default'}>
            {statusLabelMap[status] || status}
          </Badge>
        );
      },
    },
    {
      id: 'priceOrRent',
      header: '價格',
      accessorFn: (row) => row.price ?? row.monthlyRent ?? 0,
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className="text-sm font-medium text-text-primary whitespace-nowrap">
            {row.type === 'sale' ? formatPrice(row.price) : formatRent(row.monthlyRent)}
          </span>
        );
      },
    },
    {
      accessorKey: 'propertyType',
      header: '物件類型',
      cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '-'}</span>
      ),
    },
    {
      id: 'specs',
      header: '格局',
      cell: (info) => {
        const row = info.row.original;
        const parts: string[] = [];
        if (row.area) parts.push(`${row.area}坪`);
        if (row.bedrooms) parts.push(`${row.bedrooms}房`);
        if (row.bathrooms) parts.push(`${row.bathrooms}衛`);
        return (
          <span className="text-sm text-text-secondary">{parts.join(' / ') || '-'}</span>
        );
      },
    },
    {
      accessorKey: 'ownerName',
      header: '所有者',
      cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '建立日期',
      cell: (info) => (
        <span className="text-xs text-text-muted whitespace-nowrap">
          {new Date(info.getValue() as string).toLocaleDateString('zh-TW')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        const isDeleting = deletingId === row.id;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingProperty(row)}
              title="編輯"
              className="p-1.5 rounded-md hover:bg-accent/10 text-text-secondary hover:text-accent transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleDelete(row)}
              disabled={isDeleting}
              title="刪除"
              className="p-1.5 rounded-md hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      {/* Summary + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-bg-secondary border border-border-default p-2 rounded-lg w-full sm:max-w-sm">
          <Search size={18} className="text-text-secondary flex-shrink-0" />
          <input
            placeholder="搜尋物件名稱、地址..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="outline-none text-sm w-full bg-transparent text-text-primary placeholder-text-muted"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === 'all'
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:border-accent/50'
            }`}
          >
            全部 ({properties.length})
          </button>
          <button
            onClick={() => setTypeFilter('sale')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === 'sale'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:border-green-500/50'
            }`}
          >
            出售 ({totalSales})
          </button>
          <button
            onClick={() => setTypeFilter('rental')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              typeFilter === 'rental'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-bg-secondary text-text-secondary border-border-default hover:border-blue-500/50'
            }`}
          >
            出租 ({totalRentals})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg-tertiary border-b border-border-default">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 font-medium text-text-secondary whitespace-nowrap transition-colors ${
                          canSort ? 'cursor-pointer select-none hover:text-text-primary' : ''
                        }`}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <ArrowUpDown size={12} className="text-text-muted" />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border-default">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-6 py-12 text-center text-text-muted"
                  >
                    <Home size={32} className="mx-auto mb-3 opacity-30" />
                    <p>找不到符合條件的物件</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-bg-tertiary/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-text-primary">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border-default flex items-center justify-between text-sm text-text-secondary">
          <div>
            顯示 {table.getRowModel().rows.length} 筆（共{' '}
            {filteredData.length} 筆）
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-border-default rounded hover:bg-bg-tertiary disabled:opacity-50 text-text-primary transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              上一頁
            </button>
            <span className="px-3 py-1 text-text-muted">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              className="px-3 py-1 border border-border-default rounded hover:bg-bg-tertiary disabled:opacity-50 text-text-primary transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              下一頁
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProperty && (
        <PropertyEditModal
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
