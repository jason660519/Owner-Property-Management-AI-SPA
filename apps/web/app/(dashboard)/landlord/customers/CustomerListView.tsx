'use client'

import { useMemo, useState } from 'react'
import { Edit, Loader2, Mail, Phone, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatCustomerLastContact, getStatusLabel, type CustomerStatus } from './customer-details'
import { type Customer } from './customer-types'

type SortKey = 'name' | 'status' | 'date'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<CustomerStatus, number> = {
  potential: 0,
  negotiating: 1,
  closed: 2,
  lost: 3,
}

const ITEMS_PER_PAGE = 20

interface CustomerListViewProps {
  customers: Customer[]
  selectedCustomerId: string | null
  isLoading: boolean
  onSelectCustomer: (id: string) => void
  onQuickStatusChange: (id: string, status: CustomerStatus) => void
  onEditCustomer: (customer: Customer) => void
  onDeleteCustomer: (id: string) => void
}

function compareCustomers(a: Customer, b: Customer, key: SortKey, dir: SortDir): number {
  const sign = dir === 'asc' ? 1 : -1
  if (key === 'name') {
    return sign * a.name.localeCompare(b.name, 'zh-Hant')
  }
  if (key === 'status') {
    return sign * (STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  }
  const ta = new Date(a.updated_at ?? a.created_at).getTime()
  const tb = new Date(b.updated_at ?? b.created_at).getTime()
  return sign * (ta - tb)
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <th className="px-4 py-3 font-medium whitespace-nowrap">
      <button
        type="button"
        onClick={onClick}
        className={[
          'inline-flex items-center gap-1 uppercase tracking-wide transition-colors',
          active ? 'text-white' : 'text-[#999999] hover:text-[#cccccc]',
        ].join(' ')}
      >
        {label}
        {active && <span className="text-[10px]">{dir === 'asc' ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}

export function CustomerListView({
  customers,
  selectedCustomerId,
  isLoading,
  onSelectCustomer,
  onQuickStatusChange,
  onEditCustomer,
  onDeleteCustomer,
}: CustomerListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const sorted = useMemo(() => {
    const next = [...customers]
    next.sort((a, b) => compareCustomers(a, b, sortKey, sortDir))
    return next
  }, [customers, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE))
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'date' ? 'desc' : 'asc')
  }

  return (
    <Card className="bg-[#1A1A1A] border-[#333333]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[720px]">
          <thead className="text-xs bg-[#262626] border-b border-[#333333]">
            <tr>
              <th className="px-4 py-3 font-medium text-[#999999] uppercase">頭像</th>
              <SortHeader
                label="姓名"
                active={sortKey === 'name'}
                dir={sortDir}
                onClick={() => handleSort('name')}
              />
              <SortHeader
                label="狀態"
                active={sortKey === 'status'}
                dir={sortDir}
                onClick={() => handleSort('status')}
              />
              <th className="px-4 py-3 font-medium text-[#999999] uppercase whitespace-nowrap">電話</th>
              <th className="px-4 py-3 font-medium text-[#999999] uppercase whitespace-nowrap">Email</th>
              <SortHeader
                label="最後聯絡"
                active={sortKey === 'date'}
                dir={sortDir}
                onClick={() => handleSort('date')}
              />
              <th className="px-4 py-3 font-medium text-[#999999] uppercase text-right whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#999999]">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    載入中...
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#999999]">
                  尚無客戶資料
                </td>
              </tr>
            ) : (
              paginated.map((customer) => {
                const isSelected = customer.id === selectedCustomerId
                return (
                  <tr
                    key={customer.id}
                    className={[
                      'transition-colors cursor-pointer',
                      isSelected ? 'bg-[#262626]' : 'hover:bg-[#262626]/50',
                    ].join(' ')}
                    onClick={() => onSelectCustomer(customer.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
                        <User className="w-4 h-4" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{customer.name}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={customer.status}
                        onChange={(e) => {
                          onQuickStatusChange(customer.id, e.target.value as CustomerStatus)
                        }}
                        className="max-w-[120px] rounded-md border border-[#333333] bg-[#1A1A1A] px-2 py-1 text-xs text-[#cccccc] hover:border-[#7C3AED] transition-colors cursor-pointer"
                        title="修改狀態"
                      >
                        {(['potential', 'negotiating', 'closed', 'lost'] as const).map((s) => (
                          <option key={s} value={s}>
                            {getStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[#cccccc] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-[#666666]" />
                        {customer.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999999] max-w-[200px] truncate" title={customer.email}>
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-[#666666]" />
                        {customer.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#999999] whitespace-nowrap">
                      {formatCustomerLastContact(customer)}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEditCustomer(customer)}
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && customers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-[#333333]">
          <span className="text-sm text-[#999999]">
            顯示 {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sorted.length)} 到{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} 筆，共 {sorted.length} 筆（每頁 {ITEMS_PER_PAGE} 筆）
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
