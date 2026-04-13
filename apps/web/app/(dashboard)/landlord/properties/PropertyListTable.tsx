'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { batchUpdateLandlordPropertyStatus, type MyPropertyItem } from '@/lib/actions/properties'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function formatPrice(price: number, type: 'rental' | 'sale'): string {
  if (type === 'sale') {
    return `NT$ ${(price / 10000).toFixed(0)} 萬`
  }
  return `NT$ ${price.toLocaleString()} /月`
}

function statusBadgeVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'default' {
  switch (status) {
    case 'available':
    case 'vacant':
      return 'success'
    case 'pending':
      return 'warning'
    case 'sold':
    case 'archived':
      return 'secondary'
    case 'occupied':
      return 'info'
    case 'maintenance':
      return 'warning'
    default:
      return 'default'
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    available: '待售',
    pending: '交易中',
    sold: '已售出',
    vacant: '待出租',
    occupied: '已出租',
    maintenance: '維護中',
    archived: '已封存',
  }
  return map[status] ?? status
}

function batchOptionsForSelection(rows: MyPropertyItem[]): { value: string; label: string }[] {
  if (rows.length === 0) return []
  const types = new Set(rows.map((r) => r.type))
  if (types.size === 2) {
    return [{ value: 'archived', label: '已封存（適用出租與出售）' }]
  }
  const listingType = rows[0]?.type
  if (listingType === 'rental') {
    return [
      { value: 'vacant', label: '待出租' },
      { value: 'occupied', label: '已出租' },
      { value: 'maintenance', label: '維護中' },
      { value: 'archived', label: '已封存' },
    ]
  }
  return [
    { value: 'available', label: '待售' },
    { value: 'pending', label: '交易中' },
    { value: 'sold', label: '已售出' },
    { value: 'archived', label: '已封存' },
  ]
}

export interface PropertyListTableProps {
  data: MyPropertyItem[]
  onStatusPatched: (patch: ReadonlyArray<{ id: string; type: 'rental' | 'sale'; status: string }>) => void
}

export function PropertyListTable({ data, onStatusPatched }: PropertyListTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updated_at', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 })
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [batchStatus, setBatchStatus] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }, [data.length])

  const columns = useMemo<ColumnDef<MyPropertyItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border-default bg-bg-secondary text-accent focus:ring-accent"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) {
                el.indeterminate = table.getIsSomePageRowsSelected()
              }
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="全選本頁"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border-default bg-bg-secondary text-accent focus:ring-accent"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={`選取 ${row.original.title}`}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: 'title',
        header: '物件名',
        cell: ({ row }) => (
          <Link
            href={`/landlord/properties/${row.original.id}`}
            className="font-medium text-accent hover:underline line-clamp-2"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        accessorKey: 'address',
        header: '地址',
        cell: ({ getValue }) => (
          <span className="text-text-secondary line-clamp-2">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: '類型',
        sortingFn: (a, b) => a.original.type.localeCompare(b.original.type),
        cell: ({ getValue }) => (
          <span className="text-text-primary">{getValue() === 'rental' ? '出租' : '出售'}</span>
        ),
      },
      {
        accessorKey: 'price',
        header: '月租／售價',
        cell: ({ row }) => (
          <span className="whitespace-nowrap font-medium text-text-primary">
            {formatPrice(row.original.price, row.original.type)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: '狀態',
        cell: ({ getValue }) => {
          const s = String(getValue())
          return <Badge variant={statusBadgeVariant(s)}>{statusLabel(s)}</Badge>
        },
      },
      {
        accessorKey: 'updated_at',
        header: '最後修改',
        sortingFn: (a, b) =>
          new Date(a.original.updated_at).getTime() - new Date(b.original.updated_at).getTime(),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-sm text-text-secondary">
            {format(new Date(String(getValue())), 'yyyy/MM/dd HH:mm')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <Link href={`/landlord/properties/${row.original.id}`}>
            <Button variant="ghost" size="sm" type="button">
              詳情
            </Button>
          </Link>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination, rowSelection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => `${row.type}::${row.id}`,
    enableRowSelection: true,
  })

  const selectedOriginals = useMemo(() => {
    const out: MyPropertyItem[] = []
    for (const row of data) {
      const key = `${row.type}::${row.id}`
      if (rowSelection[key]) out.push(row)
    }
    return out
  }, [data, rowSelection])

  const batchOpts = useMemo(() => batchOptionsForSelection(selectedOriginals), [selectedOriginals])

  useEffect(() => {
    if (batchOpts.length === 0) return
    setBatchStatus((prev) => (batchOpts.some((o) => o.value === prev) ? prev : batchOpts[0].value))
  }, [batchOpts])

  const handleBatchApply = async () => {
    if (selectedOriginals.length === 0 || !batchStatus) return
    setBatchLoading(true)
    setBatchError(null)
    const payload = selectedOriginals.map((r) => ({
      id: r.id,
      listingType: r.type,
      status: batchStatus,
    }))
    const result = await batchUpdateLandlordPropertyStatus(payload)
    setBatchLoading(false)
    if (!result.success) {
      setBatchError(result.error ?? '更新失敗')
      return
    }
    onStatusPatched(payload.map((p) => ({ id: p.id, type: p.listingType, status: p.status })))
    setRowSelection({})
  }

  const sortIcon = (sorted: false | 'asc' | 'desc') => {
    if (sorted === 'asc') return <ArrowUp className="h-4 w-4 shrink-0" aria-hidden />
    if (sorted === 'desc') return <ArrowDown className="h-4 w-4 shrink-0" aria-hidden />
    return <ArrowUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
  }

  return (
    <Card className="overflow-hidden border-border-default bg-bg-secondary">
      {selectedOriginals.length > 0 ? (
        <div className="flex flex-col gap-3 border-b border-border-default bg-bg-primary/40 p-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-text-secondary">
            已選取 <span className="font-semibold text-text-primary">{selectedOriginals.length}</span> 筆
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex flex-col gap-1 text-xs text-text-secondary sm:min-w-[200px]">
              批次狀態
              <select
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value)}
                className="rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {batchOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" onClick={() => void handleBatchApply()} disabled={batchLoading}>
              {batchLoading ? '套用中…' : '套用至選取'}
            </Button>
          </div>
          {batchError ? <p className="text-sm text-warning sm:col-span-full">{batchError}</p> : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border-default bg-bg-primary/30">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sorted = header.column.getIsSorted()
                  return (
                    <th key={header.id} className="px-3 py-3 font-semibold text-text-primary">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-accent"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortIcon(sorted)}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border-default/80 hover:bg-bg-primary/20 data-[state=selected]:bg-bg-primary/30"
                data-state={row.getIsSelected() ? 'selected' : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle text-text-primary">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border-default p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <span>
            第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} 頁（共{' '}
            {table.getFilteredRowModel().rows.length} 筆）
          </span>
          <label className="ml-2 flex items-center gap-2">
            每頁
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="rounded border border-border-default bg-bg-primary px-2 py-1 text-text-primary"
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            筆
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="上一頁"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="下一頁"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
