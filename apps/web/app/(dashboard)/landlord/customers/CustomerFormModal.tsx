import { X, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { parseCustomerDetails } from './customer-details'
import { customerSchema, type Customer, type CustomerFormData } from './customer-types'

function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initialData?: Customer | null
  onSubmit: (data: CustomerFormData) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const initialDetails = parseCustomerDetails(initialData?.notes)

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      status: initialData?.status || 'potential',
      name: initialData?.name || '',
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      emergency_contact: initialData?.emergency_contact || '',
      notes: initialDetails.summaryNote,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white">姓名 <span className="text-red-500">*</span></Label>
        <Input id="name" placeholder="請輸入姓名" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-white">手機號碼 <span className="text-red-500">*</span></Label>
          <Input id="phone" placeholder="0912345678" {...register('phone')} className={errors.phone ? 'border-red-500' : ''} />
          {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-white">Email <span className="text-red-500">*</span></Label>
          <Input id="email" placeholder="example@mail.com" {...register('email')} className={errors.email ? 'border-red-500' : ''} />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status" className="text-white">客戶狀態</Label>
        <select
          id="status"
          {...register('status')}
          className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white"
        >
          <option value="potential">潛在</option>
          <option value="negotiating">洽談中</option>
          <option value="closed">已成交</option>
          <option value="lost">已失效</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergency_contact" className="text-white">緊急聯絡人</Label>
        <Input id="emergency_contact" placeholder="姓名 / 電話" {...register('emergency_contact')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-white">備註摘要</Label>
        <textarea
          id="notes"
          {...register('notes')}
          className="flex min-h-[80px] w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white placeholder:text-[#666666]"
          placeholder="請輸入客戶摘要備註..."
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

export function CustomerFormModal({
  isOpen,
  onClose,
  initialData,
  isLoading,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  initialData?: Customer | null
  isLoading: boolean
  onSubmit: (data: CustomerFormData) => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-[#333333]">
          <h2 className="text-xl font-bold text-white">{initialData ? '編輯客戶' : '新增客戶'}</h2>
          <button onClick={onClose} className="text-[#999999] hover:text-white transition-colors" aria-label="關閉">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <CustomerForm
            initialData={initialData}
            onSubmit={onSubmit}
            onCancel={onClose}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
