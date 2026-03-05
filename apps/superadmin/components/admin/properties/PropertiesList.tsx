// filepath: apps/superadmin/components/admin/properties/PropertiesList.tsx
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// Properties table with edit/delete actions synced to Supabase
'use client';

import { useState, useTransition, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  type ColumnResizeMode,
} from '@tanstack/react-table';
import { Search, Home, ArrowUpDown, Pencil, Trash2, Loader2, AlignLeft, Eye, ChevronDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { deleteProperty } from '@/lib/actions/properties';
import type { PropertyItem, PropertiesResult, OwnerOption } from '@/lib/types/properties';
import { PROPERTY_TYPES } from '@/lib/types/properties';
import { TAIWAN_CITIES, getDistrictsByCity } from '@/lib/data/taiwan-address';
import { PropertyCreateModal } from './PropertyCreateModal';

const statusVariantMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  for_sale: 'success',
  for_rent: 'success',
  collecting_rent: 'info',
  sold: 'default',
  rented: 'default',
  pending: 'warning',
  expired: 'error',
  invalid: 'error',
};

const statusLabelMap: Record<string, string> = {
  for_sale: '出售中',
  for_rent: '出租中',
  collecting_rent: '收租中',
  sold: '賀成交（出售）',
  rented: '賀成交（出租）',
  pending: '待审',
  expired: '逾期案（下架沒換手）',
  invalid: '無效案（下架已換手）',
};

type TableHAlign = 'left' | 'center' | 'right';
type TableVAlign = 'top' | 'middle' | 'bottom';

const TABLE_H_ALIGN_CLASSES: Record<TableHAlign, string> = {
  left: '[&_th]:text-left [&_td]:text-left',
  center: '[&_th]:text-center [&_td]:text-center',
  right: '[&_th]:text-right [&_td]:text-right',
};

const TABLE_V_ALIGN_CLASSES: Record<TableVAlign, string> = {
  top: '[&_th]:align-top [&_td]:align-top',
  middle: '[&_th]:align-middle [&_td]:align-middle',
  bottom: '[&_th]:align-bottom [&_td]:align-bottom',
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

const FREEZE_ROW_STORAGE_KEY = 'properties_list_freeze_row_v1';
const FROZEN_COL_STORAGE_KEY = 'properties_list_frozen_col_count_v1';
/** Pixel widths: 物件編號, 狀態, 物件名稱, 主照片小圖示, 縣市, 區, 路/街, 門牌, 樓層, 單位, 物件類型, 價格, 總面積(坪), 格局, 車位數, 創建人, 所有權人, 操作, 建立日期, 下架日期 */
const COLUMN_WIDTHS_PX = [72, 90, 200, 72, 88, 88, 130, 72, 52, 52, 92, 100, 72, 110, 64, 100, 100, 92, 92, 92];
const PROPERTIES_COLUMN_COUNT = COLUMN_WIDTHS_PX.length;

export function PropertiesList({ data: result, owners = [] }: { data: PropertiesResult; owners?: OwnerOption[] }) {
  const router = useRouter();
  const { properties, totalSales, totalRentals } = result;
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rental'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string[]>([]);
  const [propertyTypeDropdownOpen, setPropertyTypeDropdownOpen] = useState(false);
  const propertyTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const propertyTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const propertyTypeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [propertyTypeDropdownPos, setPropertyTypeDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPendingDelete, startDeleteTransition] = useTransition();

  // Table layout / view controls
  const [tableAlignH, setTableAlignH] = useState<TableHAlign>('left');
  const [tableAlignV, setTableAlignV] = useState<TableVAlign>('top');
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [freezeRowCount, setFreezeRowCount] = useState<0 | 1>(() => {
    if (typeof window === 'undefined') return 0;
    const v = localStorage.getItem(FREEZE_ROW_STORAGE_KEY);
    return v === '1' ? 1 : 0;
  });
  const [frozenDataColCount, setFrozenDataColCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const v = localStorage.getItem(FROZEN_COL_STORAGE_KEY);
    const n = parseInt(v ?? '0', 10);
    return Number.isNaN(n) || n < 0 || n > PROPERTIES_COLUMN_COUNT ? 0 : n;
  });
  const alignDropdownRef = useRef<HTMLDivElement | null>(null);
  const viewDropdownRef = useRef<HTMLDivElement | null>(null);

  const recalcPropertyTypeDropdownPos = useCallback(() => {
    if (propertyTypeBtnRef.current) {
      const rect = propertyTypeBtnRef.current.getBoundingClientRect();
      setPropertyTypeDropdownPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, []);

  // Close property type filter dropdown on click outside or Escape; reposition on scroll/resize
  useEffect(() => {
    if (!propertyTypeDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton = propertyTypeDropdownRef.current?.contains(target);
      const insideMenu = propertyTypeMenuRef.current?.contains(target);
      if (!insideButton && !insideMenu) setPropertyTypeDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPropertyTypeDropdownOpen(false); };
    const handleScrollOrResize = () => recalcPropertyTypeDropdownPos();
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [propertyTypeDropdownOpen, recalcPropertyTypeDropdownPos]);

  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < PROPERTIES_COLUMN_COUNT; i++) {
      offsets.push(acc);
      acc += COLUMN_WIDTHS_PX[i] ?? 90;
    }
    return offsets;
  }, []);

  // Close alignment dropdown on click outside or Escape
  useEffect(() => {
    if (!alignDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(e.target as Node)) setAlignDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAlignDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [alignDropdownOpen]);

  // Close view dropdown on click outside or Escape
  useEffect(() => {
    if (!viewDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target as Node)) setViewDropdownOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewDropdownOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [viewDropdownOpen]);

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

  const filteredData = useMemo(() => {
    let list = typeFilter === 'all' ? properties : properties.filter((p) => p.type === typeFilter);
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (cityFilter) list = list.filter((p) => (p.addressCity ?? '') === cityFilter);
    if (districtFilter) list = list.filter((p) => (p.addressDistrict ?? '') === districtFilter);
    if (propertyTypeFilter.length > 0) {
      list = list.filter((p) => p.propertyType != null && propertyTypeFilter.includes(p.propertyType));
    }
    return list;
  }, [properties, typeFilter, statusFilter, cityFilter, districtFilter, propertyTypeFilter]);

  const districtOptions = useMemo(() => getDistrictsByCity(cityFilter), [cityFilter]);

  // Reset to first page when type, status, or location filters change so the table always shows results
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [typeFilter, statusFilter, cityFilter, districtFilter, propertyTypeFilter]);

  const columns: ColumnDef<PropertyItem>[] = [
    {
      id: 'rowNumber',
      size: COLUMN_WIDTHS_PX[0],
      header: '物件編號',
      enableSorting: false,
      enableResizing: false,
      cell: (info) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        const rowIdx = pageIndex * pageSize + info.row.index + 1;
        return (
          <span className="text-xs text-text-muted font-mono">{rowIdx}</span>
        );
      },
    },
    {
      accessorKey: 'status',
      size: COLUMN_WIDTHS_PX[1],
      header: () => (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <span>狀態</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full max-w-[100px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent"
            title="篩選狀態"
          >
            <option value="">全部</option>
            {Object.entries(statusLabelMap).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      ),
      enableSorting: true,
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
      accessorKey: 'title',
      size: COLUMN_WIDTHS_PX[2],
      header: '物件名稱',
      cell: (info) => (
        <span className="font-medium text-text-primary text-sm block min-w-0 max-w-full break-words">
          {(info.getValue() as string) || '—'}
        </span>
      ),
    },
    {
      id: 'mainPhoto',
      accessorKey: 'mainPhotoUrl',
      size: COLUMN_WIDTHS_PX[3],
      header: '主照片小圖示',
      enableSorting: false,
      cell: (info) => {
        const url = info.getValue() as string | null | undefined;
        if (!url) {
          return (
            <span className="inline-flex items-center justify-center w-10 h-10 rounded bg-bg-tertiary text-text-muted text-xs" title="無主圖">
              —
            </span>
          );
        }
        return (
          <img
            src={url}
            alt="主圖"
            className="w-10 h-10 rounded object-cover border border-border-default bg-bg-tertiary"
            title="主照片"
          />
        );
      },
    },
    {
      accessorKey: 'addressCity',
      size: COLUMN_WIDTHS_PX[4],
      header: () => (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <span>縣市</span>
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setDistrictFilter('');
            }}
            className="w-full max-w-[100px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent"
            title="篩選縣市"
          >
            <option value="">全部</option>
            {TAIWAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      ),
      enableSorting: true,
      cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ),
    },
    {
      accessorKey: 'addressDistrict',
      size: COLUMN_WIDTHS_PX[5],
      header: () => (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <span>區</span>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="w-full max-w-[100px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent"
            title="篩選區"
            disabled={!cityFilter}
          >
            <option value="">全部</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      ),
      enableSorting: true,
      cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ),
    },
    { accessorKey: 'addressStreet', size: COLUMN_WIDTHS_PX[6], header: '路／街', cell: (info) => (
        <span className="text-sm text-text-secondary block min-w-0 max-w-full break-words" title={(info.getValue() as string) || ''}>
          {(info.getValue() as string) || '—'}
        </span>
      ) },
    { accessorKey: 'addressNumber', size: COLUMN_WIDTHS_PX[7], header: '門牌', cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ) },
    { accessorKey: 'addressFloor', size: COLUMN_WIDTHS_PX[8], header: '樓層', cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ) },
    { accessorKey: 'addressUnit', size: COLUMN_WIDTHS_PX[9], header: '單位', cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ) },
    {
      accessorKey: 'propertyType',
      size: COLUMN_WIDTHS_PX[10],
      header: () => (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <span>物件類型</span>
          <div ref={propertyTypeDropdownRef} className="relative">
            <button
              ref={propertyTypeBtnRef}
              type="button"
              onClick={() => {
                setPropertyTypeDropdownOpen((o) => {
                  if (!o) recalcPropertyTypeDropdownPos();
                  return !o;
                });
              }}
              className="w-full max-w-[120px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent text-left flex items-center justify-between gap-1"
              title="篩選物件類型（可複選）"
            >
              <span className="truncate">
                {propertyTypeFilter.length === 0
                  ? '全部'
                  : propertyTypeFilter.length <= 2
                    ? propertyTypeFilter.join('、')
                    : `已選 ${propertyTypeFilter.length} 項`}
              </span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${propertyTypeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      ),
      enableSorting: true,
      cell: (info) => {
        const val = info.getValue() as string | null;
        if (!val) return <span className="text-sm text-text-secondary">-</span>;
        return (
          <span className="inline-block bg-accent/10 text-accent text-xs px-1.5 py-0.5 rounded">
            {val}
          </span>
        );
      },
    },
    {
      id: 'priceOrRent',
      size: COLUMN_WIDTHS_PX[11],
      header: '價格',
      accessorFn: (row) => row.price ?? row.monthlyRent ?? 0,
      cell: (info) => {
        const row = info.row.original;
        return (
          <span className="text-sm font-medium text-text-primary">
            {row.type === 'sale' ? formatPrice(row.price) : formatRent(row.monthlyRent)}
          </span>
        );
      },
    },
    {
      accessorKey: 'area',
      size: COLUMN_WIDTHS_PX[12],
      header: '總面積(坪)',
      cell: (info) => {
        // details.area 存的是平方公尺 (m²)，換算為坪顯示：1 m² = 0.3025 坪
        const areaSqm = info.getValue() as number | null;
        if (areaSqm == null || areaSqm <= 0) return <span className="text-sm text-text-secondary">-</span>;
        const ping = Number((areaSqm * 0.3025).toFixed(2));
        return (
          <span className="text-sm text-text-secondary">
            {ping} 坪
          </span>
        );
      },
    },
    {
      id: 'specs',
      size: COLUMN_WIDTHS_PX[13],
      header: '格局',
      cell: (info) => {
        const row = info.row.original;
        const parts: string[] = [];
        if (row.bedrooms) parts.push(`${row.bedrooms}房`);
        if (row.livingRooms) parts.push(`${row.livingRooms}廳`);
        if (row.bathrooms) parts.push(`${row.bathrooms}衛`);
        return (
          <span className="text-sm text-text-secondary">{parts.join(' / ') || '-'}</span>
        );
      },
    },
    {
      accessorKey: 'parkingSpaces',
      size: COLUMN_WIDTHS_PX[14],
      header: '車位數',
      cell: (info) => {
        const value = info.getValue() as number | null;
        return (
          <span className="text-sm text-text-secondary">
            {value != null && value > 0 ? `車位 ${value}` : '-'}
          </span>
        );
      },
    },
    {
      id: 'creatorName',
      accessorKey: 'creatorName',
      size: COLUMN_WIDTHS_PX[15],
      header: '創建人',
      cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ),
    },
    {
      accessorKey: 'ownerName',
      size: COLUMN_WIDTHS_PX[16],
      header: '所有權人',
      cell: (info) => (
        <span className="text-sm text-text-secondary">{(info.getValue() as string) || '—'}</span>
      ),
    },
    {
      id: 'actions',
      size: COLUMN_WIDTHS_PX[17],
      header: '操作',
      enableSorting: false,
      enableResizing: false,
      cell: (info) => {
        const row = info.row.original;
        const isDeleting = deletingId === row.id;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.open(`/superadmin/properties/${row.id}/edit`, '_blank')}
              title="編輯（在新分頁開啟）"
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
    {
      accessorKey: 'createdAt',
      size: COLUMN_WIDTHS_PX[18],
      header: '建立日期',
      cell: (info) => (
        <span className="text-xs text-text-muted">
          {new Date(info.getValue() as string).toLocaleDateString('zh-TW')}
        </span>
      ),
    },
    {
      accessorKey: 'delistedAt',
      size: COLUMN_WIDTHS_PX[19],
      header: '下架日期',
      cell: (info) => {
        const val = info.getValue() as string | null | undefined;
        if (!val) return <span className="text-xs text-text-muted">-</span>;
        return (
          <span className="text-xs text-text-muted">
            {new Date(val).toLocaleDateString('zh-TW')}
          </span>
        );
      },
    },
  ];

  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  const table = useReactTable({
    data: filteredData,
    columns,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Summary + Filters */}
      <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 text-sm rounded-md border transition-colors bg-accent text-white border-accent hover:bg-accent-hover"
          >
            新增物件
          </button>
          <button
            type="button"
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
            type="button"
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
            type="button"
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

      {/* Layout / View controls */}
      <div className="shrink-0 flex items-center justify-end gap-2">
        {/* Alignment dropdown */}
        <div className="relative" ref={alignDropdownRef}>
          <button
            type="button"
            onClick={() => setAlignDropdownOpen((open) => !open)}
            aria-expanded={alignDropdownOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            title="表格文字排版"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            排版
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${alignDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {alignDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg p-3">
              <p className="text-[10px] text-text-muted mb-2">套用至整個表格（所有 col）</p>
              <p className="text-xs font-medium text-text-secondary mb-1">水平</p>
              <div className="flex gap-1 mb-3">
                {(['left', 'center', 'right'] as TableHAlign[]).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setTableAlignH(h)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                      tableAlignH === h
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                        : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                    }`}
                  >
                    {h === 'left' ? '靠左' : h === 'center' ? '左右置中' : '靠右'}
                  </button>
                ))}
              </div>
              <p className="text-xs font-medium text-text-secondary mb-1">垂直</p>
              <div className="flex gap-1">
                {(['top', 'middle', 'bottom'] as TableVAlign[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTableAlignV(v)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs border transition-colors ${
                      tableAlignV === v
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
                        : 'bg-bg-secondary border-border-default text-text-secondary hover:bg-bg-secondary/80'
                    }`}
                  >
                    {v === 'top' ? '靠上' : v === 'middle' ? '上下置中' : '靠下'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* View dropdown */}
        <div className="relative" ref={viewDropdownRef}>
          <button
            type="button"
            onClick={() => setViewDropdownOpen((open) => !open)}
            aria-expanded={viewDropdownOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap bg-bg-primary border-border-default text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            title="檢視選項"
          >
            <Eye className="w-3.5 h-3.5" />
            View
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${viewDropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {viewDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] bg-bg-primary border border-border-default rounded-lg shadow-lg py-2" role="menu">
              <div className="px-3 py-1.5 text-[10px] font-medium text-text-muted uppercase tracking-wide">凍結窗格</div>
              <div className="border-t border-border-light mt-1 pt-1">
                <div className="px-3 py-1 text-[10px] text-text-muted">列</div>
                {([0, 1] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setFreezeRowCount(n);
                      if (typeof window !== 'undefined') localStorage.setItem(FREEZE_ROW_STORAGE_KEY, String(n));
                      setViewDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      freezeRowCount === n
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                        : 'text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    {n === 0 ? '不凍結列' : '凍結第 1 row'}
                  </button>
                ))}
              </div>
              <div className="border-t border-border-light mt-1 pt-1">
                <div className="px-3 py-1 text-[10px] text-text-muted">col（亦可拖曳凍結線）</div>
                <div className="max-h-[240px] overflow-y-auto">
                  {[
                    { n: 0, label: '不凍結col' },
                    ...Array.from({ length: PROPERTIES_COLUMN_COUNT }, (_, i) => ({
                      n: i + 1,
                      label: i === 0 ? '凍結第 1 col' : `凍結第 1 ~ ${i + 1} col`,
                    })),
                  ].map(({ n, label }) => (
                    <button
                      key={n}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setFrozenDataColCount(n);
                        if (typeof window !== 'undefined') localStorage.setItem(FROZEN_COL_STORAGE_KEY, String(n));
                        setViewDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        frozenDataColCount === n
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium'
                          : 'text-text-primary hover:bg-bg-secondary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table: single scroll container (flex-1 min-h-0) so thead sticky works correctly */}
      <div
        className={`flex-1 min-h-0 flex flex-col bg-bg-secondary border border-border-default rounded-lg overflow-hidden [&_th]:whitespace-normal [&_td]:whitespace-normal [&_th]:break-words [&_td]:break-words [&_th]:min-w-0 [&_td]:min-w-0 [&_th]:overflow-hidden [&_td]:overflow-hidden ${TABLE_H_ALIGN_CLASSES[tableAlignH]} ${TABLE_V_ALIGN_CLASSES[tableAlignV]}`}
      >
        <div className="overflow-auto flex-1 min-h-0">
          <table
            className="w-full text-left text-sm table-fixed"
            style={{
              width: table.getCenterTotalSize(),
              minWidth: frozenColLeftOffsets[PROPERTIES_COLUMN_COUNT - 1] + (COLUMN_WIDTHS_PX[PROPERTIES_COLUMN_COUNT - 1] ?? 0),
            }}
          >
            <colgroup>
              {table.getAllColumns().map((col) => (
                <col key={col.id} style={{ width: col.getSize() }} />
              ))}
            </colgroup>
            <thead
              className={`bg-bg-tertiary ${
                freezeRowCount > 0
                  ? 'sticky top-0 z-10 border-b-4 border-gray-300 dark:border-gray-600'
                  : 'border-b border-border-default'
              }`}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, colIdx) => {
                    const canSort = header.column.getCanSort();
                    const isFrozen = colIdx < frozenDataColCount;
                    const isFreezeBoundary = frozenDataColCount > 0 && colIdx === frozenDataColCount - 1;
                    return (
                      <th
                        key={header.id}
                        className={`px-4 py-3 font-medium text-text-secondary whitespace-nowrap transition-colors relative group ${
                          canSort ? 'cursor-pointer select-none hover:text-text-primary' : ''
                        } ${isFreezeBoundary ? 'border-r-4 border-gray-300 dark:border-gray-600' : ''} ${
                          isFrozen ? 'sticky bg-bg-tertiary' : ''
                        }`}
                        style={{
                          width: header.getSize(),
                          ...(isFrozen ? { left: frozenColLeftOffsets[colIdx], zIndex: 2 } : {}),
                        }}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <ArrowUpDown size={12} className="text-text-muted" />}
                        </div>
                        {/* Resize handle */}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 top-0 h-full w-[3px] cursor-col-resize select-none touch-none transition-colors ${
                              header.column.getIsResizing()
                                ? 'bg-accent'
                                : 'bg-border-default hover:bg-accent/60'
                            }`}
                          />
                        )}
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
                    {row.getVisibleCells().map((cell, colIdx) => {
                      const isFrozen = colIdx < frozenDataColCount;
                      const isFreezeBoundary = frozenDataColCount > 0 && colIdx === frozenDataColCount - 1;
                      return (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 text-text-primary ${isFreezeBoundary ? 'border-r-4 border-gray-300 dark:border-gray-600' : ''} ${
                            isFrozen ? 'sticky bg-bg-secondary' : ''
                          }`}
                          style={isFrozen ? { left: frozenColLeftOffsets[colIdx], zIndex: 1 } : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="shrink-0 p-4 border-t border-border-default flex items-center justify-between text-sm text-text-secondary">
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

      {/* Create Modal */}
      {showCreateModal && (
        <PropertyCreateModal
          owners={owners}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {/* Property Type Filter Dropdown (portal to avoid overflow clipping) */}
      {propertyTypeDropdownOpen && propertyTypeDropdownPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={propertyTypeMenuRef}
          className="fixed z-[9999] min-w-[140px] bg-bg-primary border border-border-default rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{ top: propertyTypeDropdownPos.top, left: propertyTypeDropdownPos.left }}
        >
          <button
            type="button"
            onClick={() => setPropertyTypeFilter([])}
            className={`w-full text-left px-2.5 py-1.5 text-xs border-b border-border-default transition-colors ${
              propertyTypeFilter.length === 0
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-text-primary hover:bg-bg-secondary'
            }`}
          >
            全部（清除篩選）
          </button>
          {PROPERTY_TYPES.map((t) => {
            const isChecked = propertyTypeFilter.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setPropertyTypeFilter((prev) =>
                    isChecked ? prev.filter((v) => v !== t) : [...prev, t]
                  );
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors ${
                  isChecked
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text-primary hover:bg-bg-secondary'
                }`}
              >
                <span className={`flex items-center justify-center w-3.5 h-3.5 rounded-sm border ${
                  isChecked
                    ? 'bg-accent border-accent text-white'
                    : 'border-border-default'
                }`}>
                  {isChecked && <Check className="w-2.5 h-2.5" />}
                </span>
                {t}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
