// filepath: apps/superadmin/components/admin/properties/PropertiesList.tsx
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-04-06 | modifier: Claude Opus 4.6
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
  type ColumnSizingState,
} from '@tanstack/react-table';
import { Search, Home, ArrowUpDown, Pencil, Trash2, Loader2, AlignLeft, Eye, ChevronDown, Check, MapPin, Map } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { deleteProperty } from '@/lib/actions/properties';
import type { PropertyItem, PropertiesResult } from '@/lib/types/properties';
import { formatStructuredAddress } from '@/lib/types/properties';
import { PROPERTY_TYPES } from '@/lib/types/properties';
import { TAIWAN_CITIES, getDistrictsByCity } from '@/lib/data/taiwan-address';
import { PropertyCreateModal } from './PropertyCreateModal';
import { PropertyMapView } from './PropertyMapView';
import { useTablePreferences } from '@/lib/hooks/useTablePreferences';

function normalizeTaiwanAddressText(input: string): string {
  const s = input
    .trim()
    .replaceAll('臺', '台')
    .replaceAll(/\s+/g, '');

  // Convert Chinese numerals before common address markers into Arabic digits:
  // e.g. 忠孝東路三段 -> 忠孝東路3段, 216巷 -> 216巷 (unchanged), 十六巷 -> 16巷
  const digitMap: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const chineseToInt = (token: string): number | null => {
    // Supports 0-999 (good enough for 台灣地址的段/巷/弄/號常見範圍)
    let total = 0;
    let current = 0;
    let hasAny = false;

    const flush = (unit: number) => {
      hasAny = true;
      total += (current === 0 ? 1 : current) * unit;
      current = 0;
    };

    for (const ch of token) {
      if (ch in digitMap) {
        current = digitMap[ch]!;
        hasAny = true;
        continue;
      }
      if (ch === '十') { flush(10); continue; }
      if (ch === '百') { flush(100); continue; }
      // unknown char inside token
      return null;
    }
    total += current;
    return hasAny ? total : null;
  };

  return s.replaceAll(/([零〇一二三四五六七八九十百]+)(段|巷|弄|號)/g, (m, cn, marker) => {
    const n = chineseToInt(String(cn));
    if (n == null) return m;
    return `${n}${marker}`;
  });
}

function normalizeCityDistrict(input: string | null | undefined): string {
  return (input ?? '').trim().replaceAll('臺', '台');
}

function streetMatchesFilter(street: string | null | undefined, filter: string): boolean {
  if (!filter) return true;
  const streetVal = (street ?? '').trim();
  if (!streetVal) return false;

  // Fast path: exact/prefix match without normalization
  if (streetVal.startsWith(filter)) return true;

  const nStreet = normalizeTaiwanAddressText(streetVal);
  const nFilter = normalizeTaiwanAddressText(filter);
  return nStreet.startsWith(nFilter);
}

function deriveStreetBaseOptions(street: string): string[] {
  const s = street.trim();
  if (!s) return [];
  // Keep original as-is plus common selectable prefixes:
  // - base road/street name (e.g. 忠孝東路四段216巷 -> 忠孝東路)
  // - up to 段 (忠孝東路四段216巷 -> 忠孝東路四段)
  // - up to 巷 (忠孝東路四段216巷27弄 -> 忠孝東路四段216巷)
  const out = new Set<string>();
  out.add(s);

  // Base up to the first road-like marker (prefer longer markers first)
  const roadMarkers = ['大道', '路', '街'] as const;
  for (const mk of roadMarkers) {
    const idx = s.indexOf(mk);
    if (idx >= 0) {
      out.add(s.slice(0, idx + mk.length));
      break;
    }
  }

  // Also allow selecting up to 段 if present (忠孝東路四段216巷 -> 忠孝東路四段)
  const segIdx = s.indexOf('段');
  if (segIdx >= 0) out.add(s.slice(0, segIdx + 1));

  const laneIdx = s.indexOf('巷');
  if (laneIdx >= 0) out.add(s.slice(0, laneIdx + 1));

  // Remove overly-short / nonsense results
  return Array.from(out).filter((v) => v.length >= 2);
}

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
  if (price >= 100000000) {
    const yi = Math.floor(price / 100000000);
    const wan = Math.floor((price % 100000000) / 10000);
    if (wan === 0) {
      return `NT$ ${yi.toLocaleString()}億`;
    } else {
      return `NT$ ${yi.toLocaleString()}億${wan.toLocaleString()}萬`;
    }
  }
  if (price >= 10000) {
    return `NT$ ${(price / 10000).toLocaleString()}萬`;
  }
  return `NT$ ${price.toLocaleString()}`;
}

function formatRent(rent: number | null): string {
  if (rent == null) return '-';
  return `NT$ ${rent.toLocaleString()}/月`;
}

const PROPERTIES_TABLE_PAGE_KEY = 'properties_list';
const PROPERTIES_TABLE_STORAGE_KEY = 'properties_list_settings_v2';
const FREEZE_ROW_STORAGE_KEY = 'properties_list_freeze_row_v1';

interface PropertiesTableSettings extends Record<string, unknown> {
  columnSizing: ColumnSizingState;
  freezeRowCount: 0 | 1;
  frozenDataColCount: number;
  tableAlignH: TableHAlign;
  tableAlignV: TableVAlign;
  pageSize: number;
}

const PROPERTIES_TABLE_DEFAULTS: PropertiesTableSettings = {
  columnSizing: {},
  freezeRowCount: 0,
  frozenDataColCount: 0,
  tableAlignH: 'left',
  tableAlignV: 'top',
  pageSize: 20,
};
/** Pixel widths: 物件編號, 狀態, 物件名稱, 主照片小圖示, 縣市, 區, 路/街, 門牌, 樓層, 單位, 物件類型, 價格, 總面積(坪), 格局, 車位數, 創建人, 操作, 建立日期, 下架日期, 內容狀態（表頭最右為：內容狀態、建立日期、下架日期） */
const COLUMN_WIDTHS_PX = [72, 90, 200, 72, 88, 88, 130, 72, 52, 52, 92, 100, 72, 110, 64, 100, 92, 92, 132, 92, 168];
const PROPERTIES_COLUMN_COUNT = COLUMN_WIDTHS_PX.length;

// One-time migration: merge old v1 localStorage keys into the new unified v2 key
if (typeof window !== 'undefined' && !localStorage.getItem(PROPERTIES_TABLE_STORAGE_KEY)) {
  try {
    const partial: Partial<PropertiesTableSettings> = {};
    const oldSizing = localStorage.getItem('properties_list_column_sizing_v1');
    if (oldSizing) partial.columnSizing = JSON.parse(oldSizing) as ColumnSizingState;
    const oldFreezeRow = localStorage.getItem(FREEZE_ROW_STORAGE_KEY);
    if (oldFreezeRow === '1') partial.freezeRowCount = 1;
    const oldFrozenCol = localStorage.getItem('properties_list_frozen_col_count_v1');
    if (oldFrozenCol) {
      const n = parseInt(oldFrozenCol, 10);
      if (!Number.isNaN(n) && n >= 0 && n <= PROPERTIES_COLUMN_COUNT) partial.frozenDataColCount = n;
    }
    if (Object.keys(partial).length > 0) {
      localStorage.setItem(PROPERTIES_TABLE_STORAGE_KEY, JSON.stringify({ ...PROPERTIES_TABLE_DEFAULTS, ...partial }));
    }
  } catch { /* ignore */ }
}

export function PropertiesList({ data: result }: { data: PropertiesResult }) {
  const router = useRouter();
  const { properties, totalSales, totalRentals } = result;
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);

  // Persisted table preferences (localStorage cache + DB sync)
  const { settings: tablePrefs, patch: patchTablePrefs } = useTablePreferences<PropertiesTableSettings>({
    pageKey: PROPERTIES_TABLE_PAGE_KEY,
    storageKey: PROPERTIES_TABLE_STORAGE_KEY,
    defaults: PROPERTIES_TABLE_DEFAULTS,
  });

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: tablePrefs.pageSize });
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'rental'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [streetFilter, setStreetFilter] = useState('');
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

  // View mode: table vs map
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  // Table layout / view controls — derived from persisted preferences
  const tableAlignH = tablePrefs.tableAlignH;
  const tableAlignV = tablePrefs.tableAlignV;
  const freezeRowCount = tablePrefs.freezeRowCount;
  const frozenDataColCount = tablePrefs.frozenDataColCount;
  const [alignDropdownOpen, setAlignDropdownOpen] = useState(false);
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
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

  const handleDelete = useCallback((property: PropertyItem) => {
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
  }, [router]);

  const filteredData = useMemo(() => {
    let list = typeFilter === 'all' ? properties : properties.filter((p) => p.type === typeFilter);
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    if (cityFilter) {
      const nCityFilter = normalizeCityDistrict(cityFilter);
      list = list.filter((p) => normalizeCityDistrict(p.addressCity) === nCityFilter);
    }
    if (districtFilter) {
      const nDistrictFilter = normalizeCityDistrict(districtFilter);
      list = list.filter((p) => normalizeCityDistrict(p.addressDistrict) === nDistrictFilter);
    }
    if (streetFilter) list = list.filter((p) => streetMatchesFilter(p.addressStreet, streetFilter));
    if (propertyTypeFilter.length > 0) {
      list = list.filter((p) => p.propertyType != null && propertyTypeFilter.includes(p.propertyType));
    }
    return list;
  }, [properties, typeFilter, statusFilter, cityFilter, districtFilter, streetFilter, propertyTypeFilter]);

  const districtOptions = useMemo(() => getDistrictsByCity(cityFilter), [cityFilter]);
  const streetOptions = useMemo(() => {
    if (!cityFilter || !districtFilter) return [];
    const nCityFilter = normalizeCityDistrict(cityFilter);
    const nDistrictFilter = normalizeCityDistrict(districtFilter);
    const streets = new Set<string>();
    for (const p of properties) {
      if (
        normalizeCityDistrict(p.addressCity) === nCityFilter &&
        normalizeCityDistrict(p.addressDistrict) === nDistrictFilter &&
        p.addressStreet
      ) {
        for (const opt of deriveStreetBaseOptions(p.addressStreet)) streets.add(opt);
      }
    }
    return Array.from(streets).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [properties, cityFilter, districtFilter]);

  // Reset to first page when type, status, or location filters change so the table always shows results
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [typeFilter, statusFilter, cityFilter, districtFilter, streetFilter, propertyTypeFilter]);

  // Pre-read investigation report presence from localStorage once per properties change
  // to avoid N synchronous reads on every render
  const investigationMap = useMemo(() => {
    if (typeof window === 'undefined') return {} as Record<string, boolean>;
    const map: Record<string, boolean> = {};
    for (const p of properties) {
      map[p.id] = !!localStorage.getItem(`investigation-report-v2-${p.id}`);
    }
    return map;
  }, [properties]);

  const columns = useMemo<ColumnDef<PropertyItem>[]>(() => [
    {
      id: 'rowNumber',
      size: COLUMN_WIDTHS_PX[0],
      header: '物件代碼',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        // Property type code: S=Sale, R=Rental + building type initial
        const PROPERTY_TYPE_CODE: Record<string, string> = {
          '公寓': 'A',    // Apartment
          '大樓': 'B',    // Building
          '華廈': 'E',    // Elevator apartment
          '別墅/透天': 'H', // House
          '辦公': 'O',    // Office
          '倉庫': 'W',    // Warehouse
          '店面': 'S',    // Store
          '廠房': 'F',    // Factory
          '土地': 'L',    // Land
          '單售車位': 'P', // Parking
          '其他': 'X',    // Other
        };
        const txPrefix = row.type === 'sale' ? 'S' : 'R';
        const typeCode = row.propertyType ? (PROPERTY_TYPE_CODE[row.propertyType] ?? 'X') : '?';
        const code = `${txPrefix}${typeCode}-${row.id.slice(0, 5).toUpperCase()}`;
        return (
          <span className="text-xs text-text-muted font-mono">{code}</span>
        );
      },
    },
    {
      id: 'actions',
      size: COLUMN_WIDTHS_PX[16],
      header: '操作',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        const isDeleting = deletingId === row.id;
        const mapsUrl = (() => {
          const addr = [row.addressCity, row.addressDistrict, row.addressStreet, row.addressNumber]
            .filter(Boolean).join('');
          if (addr) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
          if (row.latitude != null && row.longitude != null) {
            return `https://www.google.com/maps/search/?api=1&query=${row.latitude},${row.longitude}`;
          }
          return null;
        })();
        const hasCoords = row.latitude != null && row.longitude != null;
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
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={hasCoords ? `在 Google Maps 開啟（${row.latitude}, ${row.longitude}）` : '在 Google Maps 搜尋地址（尚未設定精確座標）'}
                className={`p-1.5 rounded-md transition-colors ${
                  hasCoords
                    ? 'hover:bg-green-500/10 text-green-600 hover:text-green-500'
                    : 'hover:bg-text-muted/10 text-text-muted hover:text-text-secondary'
                }`}
              >
                <MapPin size={14} />
              </a>
            ) : (
              <span
                title="尚未設定地址或座標"
                className="p-1.5 text-border-default cursor-not-allowed"
              >
                <MapPin size={14} />
              </span>
            )}
          </div>
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
      id: 'address',
      size: COLUMN_WIDTHS_PX[4] + COLUMN_WIDTHS_PX[5] + COLUMN_WIDTHS_PX[6] + COLUMN_WIDTHS_PX[7] + COLUMN_WIDTHS_PX[8] + COLUMN_WIDTHS_PX[9],
      header: () => (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <span>地址</span>
          <div className="flex gap-1">
            <select
              value={cityFilter}
              onChange={(e) => { setCityFilter(e.target.value); setDistrictFilter(''); setStreetFilter(''); }}
              className="w-full max-w-[90px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent"
              title="篩選縣市"
            >
              <option value="">縣市</option>
              {TAIWAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={districtFilter}
              onChange={(e) => { setDistrictFilter(e.target.value); setStreetFilter(''); }}
              disabled={!cityFilter}
              className="w-full max-w-[90px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent disabled:opacity-40"
              title="篩選區"
            >
              <option value="">區</option>
              {districtOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={streetFilter}
              onChange={(e) => setStreetFilter(e.target.value)}
              disabled={!districtFilter || streetOptions.length === 0}
              className="w-full max-w-[90px] text-xs bg-bg-primary border border-border-default rounded px-1.5 py-1 text-text-primary focus:outline-none focus:border-accent disabled:opacity-40"
              title="篩選路/段/街"
            >
              <option value="">路/段/街</option>
              {streetOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      ),
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        const hasAddress = !!(row.addressCity || row.addressStreet || row.addressNumber);
        if (hasAddress) {
          return (
            <span className="text-sm text-text-secondary block min-w-0 max-w-full break-words" title={row.address || ''}>
              {formatStructuredAddress(row)}
            </span>
          );
        }
        if (row.isPureLand) {
          return (
            <span className="text-xs text-text-muted">
              純土地物件
              {row.landNumber && <span className="ml-1 font-mono">（{row.landNumber}）</span>}
            </span>
          );
        }
        return <span className="text-xs text-text-muted italic">待上傳謄本</span>;
      },
    },
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
            {value != null && value > 0 ? `${value} 車位` : '-'}
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
      id: 'contentStatus',
      size: COLUMN_WIDTHS_PX[20],
      header: '內容狀態',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        // investigationMap is pre-built once per properties change (avoids per-render localStorage reads)
        const hasInvestigation = investigationMap[row.id] ?? false;

        const items: { label: string; abbr: string; has: boolean; detail?: string }[] = [
          {
            label: '謄本',
            abbr: '謄',
            has: row.hasTranscript ?? false,
          },
          {
            label: '權狀',
            abbr: '狀',
            has: row.hasTitleDoc ?? false,
          },
          {
            label: '物件照片',
            abbr: '照',
            has: (row.photoCount ?? 0) > 0,
            detail: (row.photoCount ?? 0) > 0 ? `${row.photoCount} 張` : undefined,
          },
          {
            label: '部落格',
            abbr: '博',
            has: row.hasBlog ?? false,
          },
          {
            label: '合約',
            abbr: '約',
            has: row.hasContract ?? false,
          },
          {
            label: '調查報告書',
            abbr: '查',
            has: hasInvestigation,
          },
        ];

        return (
          <div className="flex flex-wrap gap-1">
            {items.map((item) => (
              <span
                key={item.label}
                title={`${item.label}：${item.has ? (item.detail ?? '已上傳') : '尚未上傳'}`}
                className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-semibold cursor-default select-none transition-colors ${
                  item.has
                    ? 'bg-green-500/15 text-green-600 ring-1 ring-green-500/30'
                    : 'bg-bg-tertiary text-text-muted ring-1 ring-border-default'
                }`}
              >
                {item.abbr}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      size: COLUMN_WIDTHS_PX[17],
      header: '建立日期',
      cell: (info) => (
        <span className="text-xs text-text-muted">
          {new Date(info.getValue() as string).toLocaleDateString('zh-TW')}
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      size: COLUMN_WIDTHS_PX[18],
      header: '最後編輯',
      sortingFn: (a, b, id) => {
        const av = a.getValue(id) as string;
        const bv = b.getValue(id) as string;
        return new Date(av).getTime() - new Date(bv).getTime();
      },
      cell: (info) => {
        const raw = info.getValue() as string;
        const dt = new Date(raw);
        const formatted = new Intl.DateTimeFormat('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(dt);
        return (
          <span className="text-xs text-text-muted">
            {formatted}
          </span>
        );
      },
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
   
  ], [deletingId, handleDelete, statusFilter, cityFilter, districtFilter, streetFilter, districtOptions, streetOptions, propertyTypeFilter, propertyTypeDropdownOpen, investigationMap, recalcPropertyTypeDropdownPos]);

  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const columnSizing = tablePrefs.columnSizing;

  const handleColumnSizingChange = useCallback((updater: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)) => {
    const next = typeof updater === 'function' ? updater(columnSizing) : updater;
    patchTablePrefs({ columnSizing: next });
  }, [columnSizing, patchTablePrefs]);

  const table = useReactTable({
    data: filteredData,
    columns,
    columnResizeMode,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting, pagination, columnSizing },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnSizingChange: handleColumnSizingChange,
  });

  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    const allCols = table.getAllColumns();
    for (let i = 0; i < allCols.length; i++) {
      offsets.push(acc);
      acc += allCols[i].getSize();
    }
    return offsets;
  // Only columnSizing changes affect offsets; getAllColumns() returns a new ref every render (not a valid dep)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getState().columnSizing]);

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
          {/* Table / Map view toggle */}
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="表格檢視"
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                viewMode === 'table'
                  ? 'bg-accent text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              <AlignLeft size={13} /> 表格
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              title="地圖檢視"
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 border-l border-border-default transition-colors ${
                viewMode === 'map'
                  ? 'bg-accent text-white'
                  : 'bg-bg-primary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              <Map size={13} /> 地圖
            </button>
          </div>
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
                    onClick={() => patchTablePrefs({ tableAlignH: h })}
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
                    onClick={() => patchTablePrefs({ tableAlignV: v })}
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
                      patchTablePrefs({ freezeRowCount: n });
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
                        patchTablePrefs({ frozenDataColCount: n });
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

      {/* Map view */}
      {viewMode === 'map' && (
        <PropertyMapView properties={filteredData} />
      )}

      {/* Table: single scroll container (flex-1 min-h-0) so thead sticky works correctly */}
      <div
        className={`flex-1 min-h-0 flex flex-col bg-bg-secondary border border-border-default rounded-lg overflow-hidden [&_th]:whitespace-normal [&_td]:whitespace-normal [&_th]:break-words [&_td]:break-words [&_th]:min-w-0 [&_td]:min-w-0 [&_th]:overflow-hidden [&_td]:overflow-hidden ${TABLE_H_ALIGN_CLASSES[tableAlignH]} ${TABLE_V_ALIGN_CLASSES[tableAlignV]} ${viewMode === 'map' ? 'hidden' : ''}`}
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
                            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none transition-colors z-30 ${
                              header.column.getIsResizing()
                                ? 'bg-accent w-1.5'
                                : 'bg-transparent group-hover:bg-border-default hover:!bg-accent/60'
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
          onClose={() => setShowCreateModal(false)}
          onCreated={(propertyId) => {
            setShowCreateModal(false);
            if (propertyId) {
              window.open(`/superadmin/properties/${propertyId}/edit?tab=media`, '_blank');
            }
            router.refresh();
          }}
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
