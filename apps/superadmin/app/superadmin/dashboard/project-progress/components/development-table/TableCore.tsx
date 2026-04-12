// filepath: project-progress/components/development-table/TableCore.tsx
// Core TanStack Table rendering component for the project progress table
'use client';

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';

import type {
  ProgressRow,
  ColumnAlignment,
  SelectionType,
  DevTabSettings,
} from './types';
import {
  COLUMN_HEADERS,
  TABLE_SCROLL_MIN_WIDTH_PX,
  DEFAULT_COLUMN_ALIGNMENT,
  MIN_HEADER_HEIGHT,
  MAX_HEADER_HEIGHT,
  FREEZE_ROW_EDGE_CLASS,
  FREEZE_COL_LINE,
  getAlignmentClasses,
  getRowKey,
} from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TableCoreProps {
  data: ProgressRow[];
  columns: ColumnDef<ProgressRow, unknown>[];
  // Persisted state
  colWidths: number[];
  headerHeight: number;
  columnAlignments: ColumnAlignment[];
  freezeRowCount: 0 | 1;
  frozenDataColCount: number;
  // Callbacks
  onPatchPrefs: (patch: Partial<DevTabSettings>) => void;
  // Selection
  selectionType: SelectionType;
  selectedRow: number;
  selectedCol: number;
  onSelectCell: (rowIdx: number, colIdx: number) => void;
  onSelectColumn: (colIdx: number) => void;
  onSelectAll: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TableCore({
  data,
  columns,
  colWidths,
  headerHeight,
  columnAlignments,
  freezeRowCount,
  frozenDataColCount,
  onPatchPrefs,
  selectionType,
  selectedRow,
  selectedCol,
  onSelectCell,
  onSelectColumn,
  onSelectAll,
}: TableCoreProps) {
  // ----- Sorting state (local, not persisted) -----
  const [sorting, setSorting] = useState<SortingState>([]);

  // ----- TanStack table instance -----
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Column pinning is handled manually via sticky positioning
  });

  // ----- Refs -----
  const tableRef = useRef<HTMLDivElement>(null);
  const tableInnerRef = useRef<HTMLDivElement>(null);
  const currentWidthsRef = useRef(colWidths);
  const headerHeightRef = useRef(headerHeight);

  // Keep refs in sync with props
  useEffect(() => { currentWidthsRef.current = colWidths; }, [colWidths]);
  useEffect(() => { headerHeightRef.current = headerHeight; }, [headerHeight]);

  // ----- Pixel widths for frozen-column offsets -----
  const [colPxWidths, setColPxWidths] = useState<number[]>(() =>
    COLUMN_HEADERS.map(() => 80),
  );

  const tableGridTemplateColumns = useMemo(
    () => colWidths.map(w => `${w}%`).join(' '),
    [colWidths],
  );

  const frozenColLeftOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < COLUMN_HEADERS.length; i++) {
      offsets.push(acc);
      acc += colPxWidths[i] ?? 80;
    }
    return offsets;
  }, [colPxWidths]);

  // Observe container to compute pixel widths from percentage widths
  useEffect(() => {
    const container = tableRef.current;
    if (!container) return;
    const update = () => {
      const inner = tableInnerRef.current;
      const scrollportW = container.clientWidth;
      if (scrollportW <= 0) return;
      const tableW =
        inner != null && inner.offsetWidth > 0
          ? inner.offsetWidth
          : Math.max(scrollportW, TABLE_SCROLL_MIN_WIDTH_PX);
      if (tableW <= 0) return;
      setColPxWidths(colWidths.map(pct => Math.max(40, (pct / 100) * tableW)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    const inner = tableInnerRef.current;
    if (inner != null) ro.observe(inner);
    return () => ro.disconnect();
  }, [colWidths]);

  // ----- Column resize handlers -----
  const handleResizeStart = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidths = [...currentWidthsRef.current];
    const containerWidth =
      tableInnerRef.current?.offsetWidth && tableInnerRef.current.offsetWidth > 0
        ? tableInnerRef.current.offsetWidth
        : Math.max(tableRef.current?.offsetWidth ?? 1000, TABLE_SCROLL_MIN_WIDTH_PX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.pageX - startX;
      const deltaPercent = (deltaPx / containerWidth) * 100;
      const newWidths = [...startWidths];
      const left = newWidths[index] + deltaPercent;
      const right = newWidths[index + 1] - deltaPercent;
      const minPct = (40 / containerWidth) * 100;
      if (left >= minPct && right >= minPct) {
        newWidths[index] = left;
        newWidths[index + 1] = right;
        onPatchPrefs({ colWidths: newWidths });
        currentWidthsRef.current = newWidths;
      }
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onPatchPrefs]);

  const handleResizeStartBetween = useCallback(
    (leftIndex: number, rightIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.pageX;
      const startWidths = [...currentWidthsRef.current];
      const containerWidth =
        tableInnerRef.current?.offsetWidth && tableInnerRef.current.offsetWidth > 0
          ? tableInnerRef.current.offsetWidth
          : Math.max(tableRef.current?.offsetWidth ?? 1000, TABLE_SCROLL_MIN_WIDTH_PX);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaPx = moveEvent.pageX - startX;
        const deltaPercent = (deltaPx / containerWidth) * 100;
        const newWidths = [...startWidths];
        const left = newWidths[leftIndex] + deltaPercent;
        const right = newWidths[rightIndex] - deltaPercent;
        const minPct = (40 / containerWidth) * 100;
        if (left >= minPct && right >= minPct) {
          newWidths[leftIndex] = left;
          newWidths[rightIndex] = right;
          onPatchPrefs({ colWidths: newWidths });
          currentWidthsRef.current = newWidths;
        }
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [onPatchPrefs],
  );

  // ----- Header height resize -----
  const handleHeaderResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.pageY;
    const startHeight = headerHeightRef.current;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.pageY - startY;
      const next = Math.min(MAX_HEADER_HEIGHT, Math.max(MIN_HEADER_HEIGHT, startHeight + deltaY));
      onPatchPrefs({ headerHeight: next });
      headerHeightRef.current = next;
    };
    const onMouseUp = () => {
      document.body.style.userSelect = prevUserSelect;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onPatchPrefs]);

  // ----- Derived selection helpers -----
  const isAllSelected = selectionType === 'all';
  const headerGroups = table.getHeaderGroups();
  const rows = table.getRowModel().rows;
  const colCount = COLUMN_HEADERS.length;

  // ----- Render -----
  return (
    <div className="bg-bg-primary border border-border-default rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 transition-colors">
      <div className="overflow-auto flex-1 min-h-0" ref={tableRef}>
        <div ref={tableInnerRef} style={{ minWidth: `max(100%, ${TABLE_SCROLL_MIN_WIDTH_PX}px)` }}>
          {/* -------- Header -------- */}
          <div
            className={clsx(
              'relative z-10 bg-bg-secondary flex flex-col w-full min-w-0 shrink-0',
              freezeRowCount > 0
                ? clsx('sticky top-0 border-b-4 border-solid', FREEZE_ROW_EDGE_CLASS)
                : 'border-b border-border-default',
            )}
            style={{ minHeight: headerHeight }}
          >
            <div
              className="grid min-h-0 w-full divide-x divide-border-default"
              style={{ minHeight: headerHeight, gridTemplateColumns: tableGridTemplateColumns }}
            >
              {headerGroups[0]?.headers.map((header, idx) => {
                const meta = header.column.columnDef.meta;
                const alignClasses = getAlignmentClasses(columnAlignments[idx] ?? DEFAULT_COLUMN_ALIGNMENT);
                const isColSelected = (selectionType === 'column' && selectedCol === idx) || isAllSelected;
                const isFrozen = idx < frozenDataColCount;
                const isFreezeBoundary = frozenDataColCount > 0 && idx === frozenDataColCount - 1;
                const isLastCol = idx === colCount - 1;
                const isFirstScrollableCol = frozenDataColCount > 0 && idx === frozenDataColCount;
                // Header container handles sticky top; individual cells only need sticky for frozen columns
                const stickyLeft = isFrozen;

                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();

                return (
                  <div
                    key={header.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (canSort) {
                        header.column.toggleSorting();
                      }
                      onSelectColumn(idx);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (canSort) header.column.toggleSorting();
                        onSelectColumn(idx);
                      }
                    }}
                    className={clsx(
                      // `relative` anchors the absolute resize handle to this cell.
                      'relative min-w-0 px-4 py-3 text-xs font-semibold text-text-secondary tracking-wider flex flex-col overflow-hidden min-h-0 cursor-pointer',
                      stickyLeft && 'sticky',
                      isColSelected ? 'bg-blue-500/15 ring-inset ring-1 ring-blue-500/40' : 'bg-bg-secondary',
                      isFreezeBoundary
                        ? FREEZE_COL_LINE
                        : isLastCol
                          ? 'border-r border-border-default'
                          : '',
                      isFirstScrollableCol && '!border-l-0',
                      alignClasses.flex,
                      alignClasses.text,
                      isFreezeBoundary
                        ? 'z-[12]'
                        : isFrozen
                          ? 'z-[5]'
                          : '',
                    )}
                    style={{
                      minWidth: 0,
                      ...(stickyLeft ? { left: frozenColLeftOffsets[idx] } : {}),
                    }}
                  >
                    <div className="flex items-center gap-1 w-full">
                      <span className="uppercase break-words leading-tight line-clamp-2 flex-1">
                        {meta?.headerEn ?? header.column.id}
                      </span>
                      {/* Sort indicator */}
                      {sorted === 'asc' && <ChevronUp className="w-3 h-3 flex-shrink-0 text-blue-500" />}
                      {sorted === 'desc' && <ChevronDown className="w-3 h-3 flex-shrink-0 text-blue-500" />}
                    </div>
                    <span className="text-[10px] text-text-muted break-words w-full leading-tight line-clamp-1">
                      {meta?.headerZh ?? ''}
                    </span>
                    {/* Column resize divider */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10 active:bg-blue-600"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (!isLastCol) {
                          handleResizeStart(idx, e);
                        } else if (idx > 0) {
                          handleResizeStartBetween(idx - 1, idx, e);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Header height resize handle */}
            {freezeRowCount > 0 && (
              <div
                role="separator"
                aria-label="Drag to adjust header row height"
                className="absolute left-0 right-0 bottom-0 h-2 cursor-row-resize hover:bg-blue-400/30 active:bg-blue-500/50 z-20 flex items-center justify-center group"
                onMouseDown={handleHeaderResizeStart}
              >
                <span className="opacity-0 group-hover:opacity-100 text-[10px] text-text-muted">
                  拖曳調整高度
                </span>
              </div>
            )}
          </div>

          {/* -------- Body -------- */}
          <div className="divide-y divide-border-default border-b border-border-default">
            {rows.map((row, rowIdx) => {
              const isRowSelected = selectionType === 'row' && selectedRow === rowIdx;
              const original = row.original;
              const rowKey = getRowKey(original.__source, original.__rowId);

              return (
                <div
                  key={rowKey}
                  className={clsx(
                    'grid min-h-[80px] min-w-0 w-full items-stretch divide-x divide-border-light transition-colors group',
                    isRowSelected
                      ? 'bg-blue-500/10'
                      : isAllSelected
                        ? 'bg-blue-500/5'
                        : 'hover:bg-bg-secondary',
                  )}
                  style={{ gridTemplateColumns: tableGridTemplateColumns }}
                >
                  {row.getVisibleCells().map((cell, colIdx) => {
                    const isFrozen = colIdx < frozenDataColCount;
                    const isFreezeBoundary = frozenDataColCount > 0 && colIdx === frozenDataColCount - 1;
                    const isLastCol = colIdx === colCount - 1;
                    const isFirstScrollableCol = frozenDataColCount > 0 && colIdx === frozenDataColCount;
                    const isCellSelected = selectionType === 'cell' && selectedRow === rowIdx && selectedCol === colIdx;
                    const isColSelected = selectionType === 'column' && selectedCol === colIdx;
                    const alignClasses = getAlignmentClasses(columnAlignments[colIdx] ?? DEFAULT_COLUMN_ALIGNMENT);

                    return (
                      <div
                        key={cell.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectCell(rowIdx, colIdx)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectCell(rowIdx, colIdx);
                          }
                        }}
                        className={clsx(
                          'min-w-0 px-4 py-4 flex flex-col overflow-hidden cursor-cell',
                          isFreezeBoundary
                            ? FREEZE_COL_LINE
                            : isLastCol
                              ? 'border-r border-border-light'
                              : '',
                          isFirstScrollableCol && '!border-l-0',
                          (isCellSelected || isAllSelected) && 'bg-blue-500/20 ring-1 ring-inset ring-blue-500/40',
                          isColSelected && 'bg-blue-500/10',
                          alignClasses.flex,
                          alignClasses.text,
                          isFreezeBoundary
                            ? 'sticky z-[3] bg-bg-primary'
                            : isFrozen
                              ? 'sticky z-[1] bg-bg-primary'
                              : '',
                        )}
                        style={{
                          minWidth: 0,
                          ...(isFrozen ? { left: frozenColLeftOffsets[colIdx] } : {}),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
