'use client'

import { useRef, useState } from 'react'
import { GripVertical, MessageSquare, User } from 'lucide-react'
import { getStatusLabel, type CustomerStatus } from './customer-details'
import { CustomerStatusBadge } from './CustomerDetailsPanel'
import { type Customer } from './customer-types'

type ColumnCount = 2 | 3 | 4

interface CustomerGridViewProps {
  customers: Customer[]
  selectedCustomerId: string | null
  onSelectCustomer: (id: string) => void
  onQuickStatusChange: (id: string, status: CustomerStatus) => void
  onReorder: (reordered: Customer[]) => void
}

function formatLastContact(c: Customer): string {
  const dateStr = c.updated_at ?? c.created_at
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週前`
  return `${Math.floor(diffDays / 30)}個月前`
}

const STATUS_OPTIONS: CustomerStatus[] = ['potential', 'negotiating', 'closed', 'lost']

const COL_CLASS: Record<ColumnCount, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

interface CardProps {
  customer: Customer
  isSelected: boolean
  isDragging: boolean
  isDragOver: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onStatusChange: (status: CustomerStatus) => void
}

function CustomerCard({
  customer,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onStatusChange,
}: CardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={[
        'group relative rounded-xl border p-4 cursor-pointer transition-all select-none',
        isDragging ? 'opacity-40' : '',
        isDragOver ? 'border-[#7C3AED] scale-[1.02] shadow-lg shadow-[#7C3AED]/10' : '',
        isSelected
          ? 'bg-[#262626] border-[#7C3AED]'
          : 'bg-[#1A1A1A] border-[#333333] hover:border-[#555555]',
      ].join(' ')}
    >
      {/* Drag handle */}
      <div className="absolute top-2 right-2 text-[#555555] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Main card content */}
      <div className="flex flex-col items-center text-center gap-2 pb-8">
        <div className="w-14 h-14 rounded-full bg-[#7C3AED]/20 flex items-center justify-center flex-shrink-0">
          <User className="w-7 h-7 text-[#7C3AED]" />
        </div>
        <div className="min-w-0 w-full">
          <p className="font-semibold text-white text-sm truncate">{customer.name}</p>
          <div className="mt-1.5 flex justify-center">
            <CustomerStatusBadge status={customer.status} />
          </div>
          <p className="text-xs text-[#666666] mt-1.5">
            最後聯絡：{formatLastContact(customer)}
          </p>
        </div>
      </div>

      {/* Hover quick actions — gradient overlay at bottom */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-2.5 px-3 rounded-b-xl
                   bg-gradient-to-t from-[#0D0D0D]/95 to-transparent
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      >
        <a
          href="/landlord/messages"
          onClick={(e) => e.stopPropagation()}
          title="發訊息"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1A1A1A] border border-[#333333]
                     text-xs text-[#cccccc] hover:border-[#7C3AED] hover:text-white transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          發訊息
        </a>
        <select
          value={customer.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation()
            onStatusChange(e.target.value as CustomerStatus)
          }}
          className="px-2 py-1 rounded-lg bg-[#1A1A1A] border border-[#333333]
                     text-xs text-[#cccccc] hover:border-[#7C3AED] transition-colors
                     cursor-pointer appearance-none"
          title="修改狀態"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function CustomerGridView({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onQuickStatusChange,
  onReorder,
}: CustomerGridViewProps) {
  const [columns, setColumns] = useState<ColumnCount>(3)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Keep a ref so drag handlers always see the latest list
  const listRef = useRef<Customer[]>(customers)
  listRef.current = customers

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggingId) setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null)
      setDragOverId(null)
      return
    }
    const list = [...listRef.current]
    const from = list.findIndex((c) => c.id === draggingId)
    const to = list.findIndex((c) => c.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    onReorder(list.map((c, i) => ({ ...c, priority: i })))
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  return (
    <div className="space-y-4">
      {/* Column switcher */}
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-xs text-[#666666] mr-1">欄數</span>
        {([2, 3, 4] as ColumnCount[]).map((n) => (
          <button
            key={n}
            onClick={() => setColumns(n)}
            className={[
              'px-2.5 py-1 rounded text-xs border transition-colors',
              columns === n
                ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                : 'bg-transparent border-[#333333] text-[#999999] hover:border-[#555555] hover:text-white',
            ].join(' ')}
          >
            {n}欄
          </button>
        ))}
      </div>

      {/* Grid */}
      {customers.length === 0 ? (
        <div className="py-20 text-center text-[#666666] text-sm">尚無客戶資料</div>
      ) : (
        <div className={`grid ${COL_CLASS[columns]} gap-4`}>
          {customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isSelected={customer.id === selectedCustomerId}
              isDragging={customer.id === draggingId}
              isDragOver={customer.id === dragOverId}
              onSelect={() => onSelectCustomer(customer.id)}
              onDragStart={(e) => handleDragStart(e, customer.id)}
              onDragOver={(e) => handleDragOver(e, customer.id)}
              onDrop={(e) => handleDrop(e, customer.id)}
              onDragEnd={handleDragEnd}
              onStatusChange={(status) => onQuickStatusChange(customer.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
