'use client'

import { useCallback, useEffect, useState } from 'react'
import { LayoutGrid, List, Loader2, Mail, Edit, Phone, Plus, Search, Trash2, User } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  appendCommunication,
  appendFollowUp,
  getIntentLabel,
  getStatusLabel,
  normalizeCustomerStatus,
  parseCustomerDetails,
  serializeCustomerDetails,
  type CustomerIntent,
  type CustomerStatus,
} from './customer-details'
import { CustomerDetailsPanel, CustomerStatusBadge } from './CustomerDetailsPanel'
import { CustomerFormModal } from './CustomerFormModal'
import { CustomerGridView } from './CustomerGridView'
import { normalizeCustomer, type Customer, type CustomerApiRecord, type CustomerFormData } from './customer-types'

export default function LandlordCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [followUpDraft, setFollowUpDraft] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const { showToast } = useToast()

  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId) || null
  const totalPages = Math.max(1, Math.ceil(customers.length / itemsPerPage))
  const paginatedCustomers = customers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const res = await fetch(`/api/landlord/customers?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch data')

      const data = await res.json() as CustomerApiRecord[]
      const normalized = data.map(normalizeCustomer)
      setCustomers(normalized)
      setCurrentPage(1)
      setSelectedCustomerId((prev) => {
        if (prev && normalized.some((item) => item.id === prev)) return prev
        return normalized[0]?.id || null
      })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '載入失敗', description: '無法載入客戶資料' })
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, showToast, statusFilter])

  useEffect(() => {
    void fetchCustomers()
  }, [fetchCustomers])

  const updateCustomerById = async (id: string, next: Partial<Customer>) => {
    const res = await fetch(`/api/landlord/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    if (!res.ok) throw new Error('Update customer failed')
    setCustomers((prev) => prev.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        ...next,
        status: next.status ? normalizeCustomerStatus(next.status) : item.status,
      }
    }))
  }

  const updateSelectedCustomer = async (next: Partial<Customer>) => {
    if (!selectedCustomer) return
    await updateCustomerById(selectedCustomer.id, next)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此客戶資料嗎？此操作無法復原。')) return

    try {
      const res = await fetch(`/api/landlord/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')

      const nextCustomers = customers.filter((item) => item.id !== id)
      setCustomers(nextCustomers)
      if (selectedCustomerId === id) {
        setSelectedCustomerId(nextCustomers[0]?.id || null)
      }
      showToast({ type: 'success', message: '刪除成功', description: '客戶資料已刪除' })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '刪除失敗', description: '請稍後再試' })
    }
  }

  const handleSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      if (editingCustomer) {
        const details = parseCustomerDetails(editingCustomer.notes)
        const payload = {
          ...data,
          status: normalizeCustomerStatus(data.status),
          notes: serializeCustomerDetails({ ...details, summaryNote: data.notes?.trim() || '' }),
        }

        const res = await fetch(`/api/landlord/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Update failed')

        showToast({ type: 'success', message: '更新成功', description: '客戶資料已更新' })
      } else {
        const payload = {
          ...data,
          status: normalizeCustomerStatus(data.status),
          notes: serializeCustomerDetails({
            summaryNote: data.notes?.trim() || '',
            intent: 'undecided',
            followUps: [],
            viewingRecords: [],
            communicationLog: [],
          }),
        }

        const res = await fetch('/api/landlord/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Create failed')

        showToast({ type: 'success', message: '新增成功', description: '客戶資料已新增' })
      }

      setIsModalOpen(false)
      await fetchCustomers()
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '操作失敗', description: '請稍後再試' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuickStatusChange = async (nextStatus: CustomerStatus) => {
    if (!selectedCustomer || selectedCustomer.status === nextStatus) return

    try {
      const now = new Date().toISOString()
      const details = parseCustomerDetails(selectedCustomer.notes)
      const nextDetails = appendCommunication(details, {
        summary: `狀態更新為「${getStatusLabel(nextStatus)}」`,
        createdAt: now,
        channel: 'system',
      })

      await updateSelectedCustomer({
        status: nextStatus,
        notes: serializeCustomerDetails(nextDetails),
      })
      showToast({ type: 'success', message: '狀態已更新', description: `已切換為「${getStatusLabel(nextStatus)}」` })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '狀態更新失敗', description: '請稍後再試' })
    }
  }

  const handleGridStatusChange = async (id: string, nextStatus: CustomerStatus) => {
    const customer = customers.find((c) => c.id === id)
    if (!customer || customer.status === nextStatus) return

    try {
      const now = new Date().toISOString()
      const details = parseCustomerDetails(customer.notes)
      const nextDetails = appendCommunication(details, {
        summary: `狀態更新為「${getStatusLabel(nextStatus)}」`,
        createdAt: now,
        channel: 'system',
      })

      await updateCustomerById(id, {
        status: nextStatus,
        notes: serializeCustomerDetails(nextDetails),
      })
      showToast({ type: 'success', message: '狀態已更新', description: `已切換為「${getStatusLabel(nextStatus)}」` })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '狀態更新失敗', description: '請稍後再試' })
    }
  }

  const handleReorder = async (reordered: Customer[]) => {
    setCustomers(reordered)
    await fetch('/api/landlord/customers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: reordered.map((c, i) => ({ id: c.id, priority: i })) }),
    })
  }

  const handleIntentChange = async (intent: CustomerIntent) => {
    if (!selectedCustomer) return

    try {
      const now = new Date().toISOString()
      const details = parseCustomerDetails(selectedCustomer.notes)
      const nextDetails = appendCommunication({ ...details, intent }, {
        summary: `更新意向為「${getIntentLabel(intent)}」`,
        createdAt: now,
        channel: 'system',
      })

      await updateSelectedCustomer({ notes: serializeCustomerDetails(nextDetails) })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '意向更新失敗', description: '請稍後再試' })
    }
  }

  const handleAddFollowUp = async () => {
    if (!selectedCustomer) return

    const content = followUpDraft.trim()
    if (!content) return

    try {
      const now = new Date().toISOString()
      const details = parseCustomerDetails(selectedCustomer.notes)
      const nextDetails = appendFollowUp(details, content, '房東', now)

      await updateSelectedCustomer({ notes: serializeCustomerDetails(nextDetails) })
      setFollowUpDraft('')
      showToast({ type: 'success', message: '已新增備註', description: '已記錄跟進時間與操作者' })
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '新增備註失敗', description: '請稍後再試' })
    }
  }

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="客戶管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '客戶管理' },
      ]}
      headerActions={
        <Button onClick={() => { setEditingCustomer(null); setIsModalOpen(true) }}>
          <Plus className="w-5 h-5 mr-2" />
          新增客戶
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters + view toggle */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="搜尋姓名或電話..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1A1A1A] border-[#333333]"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white"
            >
              <option value="all">所有狀態</option>
              <option value="potential">潛在</option>
              <option value="negotiating">洽談中</option>
              <option value="closed">已成交</option>
              <option value="lost">已失效</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 border border-[#333333] rounded-lg p-0.5 self-start md:self-auto">
            <button
              onClick={() => setViewMode('list')}
              title="列表模式"
              className={[
                'flex items-center justify-center w-9 h-9 rounded-md transition-colors',
                viewMode === 'list'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#999999] hover:text-white hover:bg-[#262626]',
              ].join(' ')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid 模式"
              className={[
                'flex items-center justify-center w-9 h-9 rounded-md transition-colors',
                viewMode === 'grid'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#999999] hover:text-white hover:bg-[#262626]',
              ].join(' ')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          {viewMode === 'grid' ? (
            <Card className="bg-[#1A1A1A] border-[#333333] p-4">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-20 text-[#999999]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  載入中...
                </div>
              ) : (
                <CustomerGridView
                  customers={customers}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={setSelectedCustomerId}
                  onQuickStatusChange={handleGridStatusChange}
                  onReorder={(reordered) => { void handleReorder(reordered) }}
                />
              )}
            </Card>
          ) : (
            <Card className="bg-[#1A1A1A] border-[#333333]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-[#999999] uppercase bg-[#262626] border-b border-[#333333]">
                    <tr>
                      <th className="px-6 py-4 font-medium">姓名</th>
                      <th className="px-6 py-4 font-medium">聯絡資訊</th>
                      <th className="px-6 py-4 font-medium">客戶狀態</th>
                      <th className="px-6 py-4 font-medium">備註摘要</th>
                      <th className="px-6 py-4 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#333333]">
                    {isLoading ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-[#999999]"><div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />載入中...</div></td></tr>
                    ) : paginatedCustomers.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-[#999999]">尚無客戶資料</td></tr>
                    ) : (
                      paginatedCustomers.map((customer) => {
                        const details = parseCustomerDetails(customer.notes)
                        const isSelected = customer.id === selectedCustomerId

                        return (
                          <tr key={customer.id} className={`transition-colors cursor-pointer ${isSelected ? 'bg-[#262626]' : 'hover:bg-[#262626]/50'}`} onClick={() => setSelectedCustomerId(customer.id)}>
                            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]"><User className="w-4 h-4" /></div><span className="font-medium text-white">{customer.name}</span></div></td>
                            <td className="px-6 py-4"><div className="flex flex-col gap-1"><div className="flex items-center gap-2 text-[#cccccc]"><Phone className="w-3 h-3" />{customer.phone}</div><div className="flex items-center gap-2 text-[#999999]"><Mail className="w-3 h-3" />{customer.email}</div></div></td>
                            <td className="px-6 py-4"><CustomerStatusBadge status={customer.status} /></td>
                            <td className="px-6 py-4 text-[#999999] max-w-xs truncate">{details.summaryNote || '-'}</td>
                            <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2"><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); setIsModalOpen(true) }}><Edit className="w-4 h-4 text-blue-400" /></Button><Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); void handleDelete(customer.id) }}><Trash2 className="w-4 h-4 text-red-400" /></Button></div></td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && customers.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-[#333333]">
                  <span className="text-sm text-[#999999]">顯示 {Math.min((currentPage - 1) * itemsPerPage + 1, customers.length)} 到 {Math.min(currentPage * itemsPerPage, customers.length)} 筆，共 {customers.length} 筆</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>上一頁</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>下一頁</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="bg-[#1A1A1A] border-[#333333] p-5 space-y-5">
            <CustomerDetailsPanel
              customer={selectedCustomer}
              followUpDraft={followUpDraft}
              onFollowUpDraftChange={setFollowUpDraft}
              onAddFollowUp={() => { void handleAddFollowUp() }}
              onQuickStatusChange={(status) => { void handleQuickStatusChange(status) }}
              onIntentChange={(intent) => { void handleIntentChange(intent) }}
            />
          </Card>
        </div>
      </div>

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingCustomer}
        isLoading={isSubmitting}
        onSubmit={(data) => { void handleSubmit(data) }}
      />
    </DashboardLayout>
  )
}
