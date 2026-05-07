'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'disputed'
export type PaymentType =
  | 'rent_payment'
  | 'deposit_payment'
  | 'earnest_money'
  | 'purchase_payment'
  | 'utility_payment'
  | 'maintenance_fee'
  | 'commission'
  | 'refund'
  | 'other'

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  rent_payment: '租金',
  deposit_payment: '押金',
  earnest_money: '訂金',
  purchase_payment: '購屋款',
  utility_payment: '管理費',
  maintenance_fee: '維修費',
  commission: '仲介費',
  refund: '退款',
  other: '其他',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: '待付款',
  processing: '處理中',
  completed: '已完成',
  failed: '失敗',
  cancelled: '已取消',
  refunded: '已退款',
  disputed: '爭議中',
}

export interface BuyerPaymentRecord {
  id: string
  transactionType: PaymentType
  amount: number
  currencyCode: string
  paymentMethod: string
  status: PaymentStatus
  transactionReference: string | null
  propertyId: string | null
  propertyAddress: string | null
  dueDate: string | null
  paidAt: string | null
  description: string | null
  createdAt: string
}

export interface BuyerPaymentSummary {
  totalPaid: number
  totalPending: number
  currentYearPaid: number
  overdueCount: number
  records: BuyerPaymentRecord[]
}

export async function getBuyerPayments(): Promise<BuyerPaymentSummary | null> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: rows, error } = await supabase
      .from('payment_transactions')
      .select(`
        id,
        transaction_type,
        amount,
        currency_code,
        payment_method,
        status,
        transaction_reference,
        property_id,
        due_date,
        paid_at,
        description,
        created_at,
        property_sale:Property_Sales!property_id ( address ),
        property_rental:Property_Rentals!property_id ( address )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const currentYear = new Date().getFullYear()
    const now = new Date()

    const records: BuyerPaymentRecord[] = (rows ?? []).map((r) => {
      const sale = r.property_sale as { address?: string } | null
      const rental = r.property_rental as { address?: string } | null
      return {
        id: r.id as string,
        transactionType: r.transaction_type as PaymentType,
        amount: r.amount as number,
        currencyCode: (r.currency_code as string) || 'TWD',
        paymentMethod: r.payment_method as string,
        status: r.status as PaymentStatus,
        transactionReference: (r.transaction_reference as string) || null,
        propertyId: (r.property_id as string) || null,
        propertyAddress: sale?.address || rental?.address || null,
        dueDate: (r.due_date as string) || null,
        paidAt: (r.paid_at as string) || null,
        description: (r.description as string) || null,
        createdAt: r.created_at as string,
      }
    })

    const totalPaid = records
      .filter((r) => r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0)

    const totalPending = records
      .filter((r) => r.status === 'pending' || r.status === 'processing')
      .reduce((sum, r) => sum + r.amount, 0)

    const currentYearPaid = records
      .filter((r) => r.status === 'completed' && new Date(r.createdAt).getFullYear() === currentYear)
      .reduce((sum, r) => sum + r.amount, 0)

    const overdueCount = records.filter(
      (r) =>
        (r.status === 'pending') &&
        r.dueDate &&
        new Date(r.dueDate) < now
    ).length

    return { totalPaid, totalPending, currentYearPaid, overdueCount, records }
  } catch (error) {
    console.error('Error fetching buyer payments:', error)
    return null
  }
}
