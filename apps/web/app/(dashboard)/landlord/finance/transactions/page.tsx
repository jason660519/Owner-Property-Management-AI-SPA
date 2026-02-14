
'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Loader2, 
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { DashboardLayout } from '@/components/dashboard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Label } from '@/components/ui/Label'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'

// --- Types ---

type Transaction = {
  id: string
  property_id: string
  property_title: string
  transaction_date: string
  transaction_type: string
  amount: number
  description: string
  payment_method: string
}

const transactionSchema = z.object({
  property_id: z.string().min(1, '請選擇房源'),
  transaction_date: z.string().min(1, '請選擇日期'),
  transaction_type: z.string().min(1, '請選擇交易類型'),
  amount: z.number().min(1, '金額必須大於 0'),
  description: z.string().optional(),
  payment_method: z.string().optional(),
})

type TransactionFormData = z.infer<typeof transactionSchema>

// --- Components ---

function TransactionForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading,
  properties
}: { 
  initialData?: Transaction | null
  onSubmit: (data: TransactionFormData) => void
  onCancel: () => void
  isLoading: boolean
  properties: { id: string, title: string }[]
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData ? {
      property_id: initialData.property_id,
      transaction_date: initialData.transaction_date,
      transaction_type: initialData.transaction_type,
      amount: Number(initialData.amount),
      description: initialData.description || '',
      payment_method: initialData.payment_method || ''
    } : {
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'rent_income',
      amount: 0
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-white">房源 <span className="text-red-500">*</span></Label>
        <select 
          {...register('property_id')}
          className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        >
          <option value="">請選擇房源</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
        {errors.property_id && <p className="text-red-500 text-xs">{errors.property_id.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white">日期 <span className="text-red-500">*</span></Label>
          <Input type="date" {...register('transaction_date')} />
          {errors.transaction_date && <p className="text-red-500 text-xs">{errors.transaction_date.message}</p>}
        </div>
        
        <div className="space-y-2">
          <Label className="text-white">交易類型 <span className="text-red-500">*</span></Label>
          <select 
            {...register('transaction_type')}
            className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            <option value="rent_income">租金收入</option>
            <option value="deposit">押金收取</option>
            <option value="utility">水電費</option>
            <option value="maintenance">維修費</option>
            <option value="management_fee">管理費</option>
            <option value="tax">稅務支出</option>
            <option value="other">其他</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white">金額 <span className="text-red-500">*</span></Label>
        <Input 
          type="number" 
          placeholder="0" 
          {...register('amount', { valueAsNumber: true })} 
        />
        {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-white">付款方式</Label>
        <select 
          {...register('payment_method')}
          className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
        >
          <option value="">請選擇</option>
          <option value="bank_transfer">銀行轉帳</option>
          <option value="cash">現金</option>
          <option value="check">支票</option>
          <option value="credit_card">信用卡</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label className="text-white">說明/備註</Label>
        <Input placeholder="選填" {...register('description')} />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {initialData ? '儲存變更' : '新增記錄'}
        </Button>
      </div>
    </form>
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [properties, setProperties] = useState<{ id: string, title: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Transaction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const { showToast } = useToast()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Fetch Properties for dropdown
  useEffect(() => {
    const fetchProps = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('property_rentals').select('id, title')
      if (data) setProperties(data)
    }
    fetchProps()
  }, [])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter)
      
      const res = await fetch(`/api/landlord/finance/transactions?${params.toString()}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      showToast({ type: 'error', message: '載入失敗' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [searchQuery, typeFilter])

  const handleSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true)
    try {
      if (editingItem) {
        const res = await fetch(`/api/landlord/finance/transactions/${editingItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Update failed')
        showToast({ type: 'success', message: '更新成功' })
      } else {
        const res = await fetch('/api/landlord/finance/transactions', {
          method: 'POST',
          body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error('Create failed')
        showToast({ type: 'success', message: '新增成功' })
      }
      setIsModalOpen(false)
      fetchTransactions()
    } catch (error) {
      showToast({ type: 'error', message: '操作失敗' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此記錄嗎？')) return
    try {
      const res = await fetch(`/api/landlord/finance/transactions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setTransactions(prev => prev.filter(t => t.id !== id))
      showToast({ type: 'success', message: '刪除成功' })
    } catch (error) {
      showToast({ type: 'error', message: '刪除失敗' })
    }
  }

  // Helper
  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      rent_income: '租金收入',
      deposit: '押金收取',
      utility: '水電費',
      maintenance: '維修費',
      management_fee: '管理費',
      tax: '稅務支出',
      other: '其他'
    }
    return map[type] || type
  }

  const isIncome = (type: string) => ['rent_income', 'deposit'].includes(type)

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage)
  const paginatedData = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <DashboardLayout
      currentRole="landlord"
      pageTitle="收支管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '房東專區', href: '/landlord' },
        { label: '財務報表', href: '/landlord/finance' },
        { label: '收支管理' },
      ]}
      headerActions={
        <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          新增記錄
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input 
              placeholder="搜尋描述..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1A1A1A] border-[#333333]"
            />
          </div>
          <div className="w-full md:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white ring-offset-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
            >
              <option value="all">所有類型</option>
              <option value="rent_income">租金收入</option>
              <option value="maintenance">維修費</option>
              <option value="utility">水電費</option>
              <option value="other">其他</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="bg-[#1A1A1A] border-[#333333]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#999999] uppercase bg-[#262626] border-b border-[#333333]">
                <tr>
                  <th className="px-6 py-4 font-medium">日期</th>
                  <th className="px-6 py-4 font-medium">類型</th>
                  <th className="px-6 py-4 font-medium">房源</th>
                  <th className="px-6 py-4 font-medium">描述</th>
                  <th className="px-6 py-4 font-medium text-right">金額</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333333]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#999999]">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        載入中...
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#999999]">
                      尚無記錄
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-[#262626]/50 transition-colors">
                      <td className="px-6 py-4 text-[#cccccc]">
                        {item.transaction_date}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1 ${isIncome(item.transaction_type) ? 'text-green-500' : 'text-red-500'}`}>
                          {isIncome(item.transaction_type) ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                          {getTypeLabel(item.transaction_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">
                        {item.property_title}
                      </td>
                      <td className="px-6 py-4 text-[#999999]">
                        {item.description || '-'}
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${isIncome(item.transaction_type) ? 'text-green-500' : 'text-red-500'}`}>
                        {isIncome(item.transaction_type) ? '+' : '-'}{Number(item.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleDelete(item.id)}
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
          {!isLoading && transactions.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t border-[#333333]">
              <span className="text-sm text-[#999999]">
                顯示 {Math.min((currentPage - 1) * itemsPerPage + 1, transactions.length)} 到 {Math.min(currentPage * itemsPerPage, transactions.length)} 筆，共 {transactions.length} 筆
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? '編輯記錄' : '新增記錄'}
      >
        <TransactionForm 
          initialData={editingItem} 
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          isLoading={isSubmitting}
          properties={properties}
        />
      </Modal>
    </DashboardLayout>
  )
}
