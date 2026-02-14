
'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Phone, Mail, User, X, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/Toast'

// --- Types ---

type Customer = {
  id: string
  name: string
  phone: string
  email: string
  status: 'active' | 'inactive' | 'potential'
  emergency_contact?: string
  notes?: string
  created_at: string
}

const customerSchema = z.object({
  name: z.string().min(1, '姓名為必填欄位'),
  phone: z.string().min(1, '手機號碼為必填欄位'),
  email: z.string().email('Email 格式不正確').min(1, 'Email 為必填欄位'),
  status: z.enum(['active', 'inactive', 'potential']).optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional(),
})

type CustomerFormData = z.infer<typeof customerSchema>

// --- Components ---

function Badge({ status }: { status: string }) {
  const styles = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    potential: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }
  
  const labels = {
    active: '承租中',
    inactive: '已退租',
    potential: '潛在客戶',
  }

  const key = status as keyof typeof styles
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[key] || styles.potential}`}>
      {labels[key] || status}
    </span>
  )
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function CustomerForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading 
}: { 
  initialData?: Customer | null
  onSubmit: (data: CustomerFormData) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData || {
      status: 'potential',
      name: '',
      phone: '',
      email: '',
      emergency_contact: '',
      notes: ''
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white">姓名 <span className="text-red-500">*</span></Label>
        <Input 
          id="name" 
          placeholder="請輸入姓名" 
          {...register('name')} 
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-white">手機號碼 <span className="text-red-500">*</span></Label>
          <Input 
            id="phone" 
            placeholder="0912345678" 
            {...register('phone')} 
            className={errors.phone ? 'border-red-500' : ''}
          />
          {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">Email <span className="text-red-500">*</span></Label>
          <Input 
            id="email" 
            placeholder="example@mail.com" 
            {...register('email')} 
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="text-white">租賃狀態</Label>
        <select 
          id="status" 
          {...register('status')}
          className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#666666] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="potential">潛在客戶</option>
          <option value="active">承租中</option>
          <option value="inactive">已退租</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact" className="text-white">緊急聯絡人</Label>
        <Input 
          id="emergency_contact" 
          placeholder="姓名 / 電話" 
          {...register('emergency_contact')} 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-white">備註</Label>
        <textarea 
          id="notes" 
          {...register('notes')}
          className="flex min-h-[80px] w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] placeholder:text-[#666666] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="請輸入備註事項..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {initialData ? '儲存變更' : '新增客戶'}
        </Button>
      </div>
    </form>
  )
}

// --- Main Page Component ---

export default function LandlordCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { showToast } = useToast()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch Customers
  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      
      const res = await fetch(`/api/landlord/customers?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch data')
      
      const data = await res.json()
      setCustomers(data)
      setCurrentPage(1) // Reset to first page on new search
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '載入失敗', description: '無法載入客戶資料' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [searchQuery, statusFilter])

  // Handlers
  const handleAdd = () => {
    setEditingCustomer(null)
    setIsModalOpen(true)
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此客戶資料嗎？此操作無法復原。')) return

    try {
      const res = await fetch(`/api/landlord/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      
      setCustomers(prev => prev.filter(c => c.id !== id))
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
        // Update
        const res = await fetch(`/api/landlord/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Update failed')
        
        await fetchCustomers() // Refresh list
        showToast({ type: 'success', message: '更新成功', description: '客戶資料已更新' })
      } else {
        // Create
        const res = await fetch('/api/landlord/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Create failed')
        
        await fetchCustomers() // Refresh list
        showToast({ type: 'success', message: '新增成功', description: '客戶資料已新增' })
      }
      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      showToast({ type: 'error', message: '操作失敗', description: '請稍後再試' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pagination Logic
  const totalPages = Math.ceil(customers.length / itemsPerPage)
  const paginatedCustomers = customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
        <Button onClick={handleAdd}>
          <Plus className="w-5 h-5 mr-2" />
          新增客戶
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
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
              className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <option value="all">所有狀態</option>
              <option value="potential">潛在客戶</option>
              <option value="active">承租中</option>
              <option value="inactive">已退租</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-[#1A1A1A] border-[#333333]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#999999] uppercase bg-[#262626] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-4 font-medium">姓名</th>
                  <th className="px-6 py-4 font-medium">聯絡資訊</th>
                  <th className="px-6 py-4 font-medium">租賃狀態</th>
                  <th className="px-6 py-4 font-medium">備註</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#999999]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        載入中...
                      </div>
                    </td>
                  </tr>
                ) : paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#999999]">
                      尚無客戶資料
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#262626]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#7C3AED]">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-white">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-[#cccccc]">
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center gap-2 text-[#999999]">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={customer.status} />
                      </td>
                      <td className="px-6 py-4 text-[#999999] max-w-xs truncate">
                        {customer.notes || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!isLoading && customers.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-[#333333]">
              <span className="text-sm text-[#999999]">
                顯示 {Math.min((currentPage - 1) * itemsPerPage + 1, customers.length)} 到 {Math.min(currentPage * itemsPerPage, customers.length)} 筆，共 {customers.length} 筆
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一頁
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一頁
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCustomer ? '編輯客戶' : '新增客戶'}
      >
        <CustomerForm 
          initialData={editingCustomer} 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)}
          isLoading={isSubmitting}
        />
      </Modal>
    </DashboardLayout>
  )
}
