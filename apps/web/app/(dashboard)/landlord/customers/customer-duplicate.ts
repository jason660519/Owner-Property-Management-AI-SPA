import type { Customer } from './customer-types'

function normalizePhone(value: string) {
  return value.replace(/[\s-]/g, '').trim()
}

/**
 * Returns an existing customer with the same normalized phone or same email (case-insensitive), if any.
 * When `excludeId` is set (e.g. edit mode), that customer is ignored.
 */
export function findDuplicateCustomer(
  customers: Customer[],
  phone: string,
  email: string,
  excludeId?: string | null,
): Customer | null {
  const p = normalizePhone(phone)
  const e = email.trim().toLowerCase()
  return (
    customers.find((c) => {
      if (excludeId && c.id === excludeId) return false
      const samePhone = normalizePhone(c.phone) === p
      const sameEmail = c.email.trim().toLowerCase() === e
      return samePhone || sameEmail
    }) ?? null
  )
}
