import * as z from 'zod'
import { normalizeCustomerStatus, type CustomerStatus } from './customer-details'

/** Taiwan mobile: 09 + 8 digits (10 characters). */
export const TW_MOBILE_REGEX = /^09\d{8}$/

export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  status: CustomerStatus
  emergency_contact?: string
  notes?: string
  priority: number
  created_at: string
  updated_at?: string
}

export type CustomerApiRecord = Omit<Customer, 'status' | 'priority'> & {
  status: string
  priority?: number
}

export const customerSchema = z.object({
  name: z.string().trim().min(1, '姓名為必填欄位'),
  phone: z
    .string()
    .min(1, '手機號碼為必填欄位')
    .transform((s) => s.replace(/[\s-]/g, ''))
    .pipe(
      z
        .string()
        .regex(TW_MOBILE_REGEX, '手機號碼需為 09 開頭之 10 碼（例：0912345678）'),
    ),
  email: z.string().min(1, 'Email 為必填欄位').email('Email 格式不正確'),
  status: z.enum(['potential', 'negotiating', 'closed', 'lost']).optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export function normalizeCustomer(record: CustomerApiRecord): Customer {
  return {
    ...record,
    status: normalizeCustomerStatus(record.status),
    priority: record.priority ?? 0,
  }
}
