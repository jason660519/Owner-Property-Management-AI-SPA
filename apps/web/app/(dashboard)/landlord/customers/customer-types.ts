import * as z from 'zod'
import { normalizeCustomerStatus, type CustomerStatus } from './customer-details'

export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  status: CustomerStatus
  emergency_contact?: string
  notes?: string
  created_at: string
  updated_at?: string
}

export type CustomerApiRecord = Omit<Customer, 'status'> & {
  status: string
}

export const customerSchema = z.object({
  name: z.string().min(1, '姓名為必填欄位'),
  phone: z.string().min(1, '手機號碼為必填欄位'),
  email: z.string().email('Email 格式不正確').min(1, 'Email 為必填欄位'),
  status: z.enum(['potential', 'negotiating', 'closed', 'lost']).optional(),
  emergency_contact: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export function normalizeCustomer(record: CustomerApiRecord): Customer {
  return {
    ...record,
    status: normalizeCustomerStatus(record.status),
  }
}
