'use client'

<<<<<<< HEAD
import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { LayoutGrid, List, Loader2, Mail, Edit, Phone, Plus, Search, Trash2, User } from 'lucide-react'
=======
import { useCallback, useEffect, useState } from 'react'
import { LayoutGrid, List, Loader2, Plus, Search } from 'lucide-react'
>>>>>>> feature/paperclip-row-032
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
  type CustomerDetailsPayload,
  type CustomerIntent,
  type CustomerStatus,
} from './customer-details'
import { CustomerDetailsPanel } from './CustomerDetailsPanel'
import { CustomerFormModal } from './CustomerFormModal'
import { CustomerGridView } from './CustomerGridView'
import { CustomerListView } from './CustomerListView'
import { normalizeCustomer, type Customer, type CustomerApiRecord, type CustomerFormData } from './customer-types'
import { TenantFilterWorkbench } from './TenantFilterWorkbench'

function mergeTenantProfileFromForm(
  base: CustomerDetailsPayload,
  data: CustomerFormData,
): CustomerDetailsPayload {
  const cs = data.credit_score?.trim() ?? ''
  const inc = data.monthly_income?.trim() ?? ''
  const occ = data.occupation_type?.trim() ?? ''

  const creditScore = cs === '' || Number.isNaN(Number(cs)) ? null : Number(cs)
  const monthlyIncome = inc === '' || Number.isNaN(Number(inc)) ? null : Number(inc)
  const occupationType = occ === '' ? null : occ

  if (creditScore === null && monthlyIncome === null && occupationType === null) {
    const { tenantProfile: _omit, ...rest } = base
    return rest
  }

  return {
    ...base,
    tenantProfile: {
      creditScore,
      monthlyIncome,
      occupationType,
    },
  }
}

function LandlordCustomersPageInner() {
  const searchParams = useSearchParams()
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
  const [mainTab, setMainTab] = useState<'overview' | 'tenant_filter'>('overview')

  const [filterCustomers, setFilterCustomers] = useState<Customer[]>([])
  const [filterLoading, setFilterLoading] = useState(false)

  const { showToast } = useToast()

  const selectedCustomer = customers.find((item) => item.id === selectedCustomerId) || null

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

  const reloadFilterCustomers = useCallback(async () => {
    setFilterLoading(true)
    try {
      const res = await fetch('/api/landlord/customers')
      if (!res.ok) throw new Error('Failed to fetch data')
      const data = await res.json() as CustomerApiRecord[]
      setFilterCustomers(data.map(normalizeCustomer))
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '載入失敗', description: '無法載入租客篩選資料' })
    } finally {
      setFilterLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    if (mainTab !== 'tenant_filter') return
    void reloadFilterCustomers()
  }, [mainTab, reloadFilterCustomers])

  const reloadFilterAndOverview = useCallback(async () => {
    await reloadFilterCustomers()
    await fetchCustomers()
  }, [reloadFilterCustomers, fetchCustomers])

  useEffect(() => {
    const cid = searchParams.get('customerId')
    if (!cid) return
    const inOverview = customers.some((c) => c.id === cid)
    const inFilterList = filterCustomers.some((c) => c.id === cid)
    if (inOverview || inFilterList) {
      setSelectedCustomerId(cid)
      setMainTab('overview')
    }
  }, [searchParams, customers, filterCustomers])

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
        const merged = mergeTenantProfileFromForm(
          { ...details, summaryNote: data.notes?.trim() || '' },
          data,
        )
        const payload = {
          ...data,
          status: normalizeCustomerStatus(data.status),
          notes: serializeCustomerDetails(merged),
        }

        const res = await fetch(`/api/landlord/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Update failed')

        showToast({ type: 'success', message: '更新成功', description: '客戶資料已更新' })
      } else {
        const merged = mergeTenantProfileFromForm(
          {
            summaryNote: data.notes?.trim() || '',
            intent: 'undecided',
            followUps: [],
            viewingRecords: [],
            communicationLog: [],
          },
          data,
        )
        const payload = {
          ...data,
          status: normalizeCustomerStatus(data.status),
          notes: serializeCustomerDetails(merged),
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

  const handleBatchTenantStatus = async (ids: string[], nextStatus: CustomerStatus) => {
    const now = new Date().toISOString()
    for (const id of ids) {
      const customer = filterCustomers.find((c) => c.id === id)
      if (!customer) continue
      const details = parseCustomerDetails(customer.notes)
      const nextDetails = appendCommunication(details, {
        summary: `批次狀態更新為「${getStatusLabel(nextStatus)}」`,
        createdAt: now,
        channel: 'system',
      })
      const res = await fetch(`/api/landlord/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          notes: serializeCustomerDetails(nextDetails),
        }),
      })
      if (!res.ok) throw new Error('Batch update failed')
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
        <div className="flex flex-col sm:flex-row gap-2 border-b border-[#333333] pb-3">
          <button
            type="button"
            onClick={() => setMainTab('overview')}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              mainTab === 'overview' ? 'bg-[#7C3AED] text-white' : 'text-[#cccccc] hover:bg-[#262626]',
            ].join(' ')}
          >
            總覽
          </button>
          <button
            type="button"
            onClick={() => setMainTab('tenant_filter')}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
              mainTab === 'tenant_filter' ? 'bg-[#7C3AED] text-white' : 'text-[#cccccc] hover:bg-[#262626]',
            ].join(' ')}
          >
            租客篩選
          </button>
        </div>

        {mainTab === 'tenant_filter' ? (
          <TenantFilterWorkbench
            customers={filterCustomers}
            isLoading={filterLoading}
            onReload={reloadFilterAndOverview}
            onBatchUpdateStatus={handleBatchTenantStatus}
            showToast={showToast}
          />
        ) : (
          <>
        {/* Filters + view toggle */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="搜尋姓名、電話或 Email..."
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
            <CustomerListView
              key={`${searchQuery}-${statusFilter}`}
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              isLoading={isLoading}
              onSelectCustomer={setSelectedCustomerId}
              onQuickStatusChange={handleGridStatusChange}
              onEditCustomer={(customer) => { setEditingCustomer(customer); setIsModalOpen(true) }}
              onDeleteCustomer={(id) => { void handleDelete(id) }}
            />
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
          </>
        )}
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

export default function LandlordCustomersPage() {
  return (
    <Suspense
      fallback={(
        <DashboardLayout
          currentRole="landlord"
          pageTitle="客戶管理"
          breadcrumbs={[
            { label: '首頁', href: '/' },
            { label: '房東專區', href: '/landlord' },
            { label: '客戶管理' },
          ]}
        >
          <div className="flex items-center justify-center py-24 text-[#999999] gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            載入頁面…
          </div>
        </DashboardLayout>
      )}
    >
      <LandlordCustomersPageInner />
    </Suspense>
  )
}
