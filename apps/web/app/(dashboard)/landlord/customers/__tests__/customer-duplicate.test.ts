import { findDuplicateCustomer } from '../customer-duplicate'
import type { Customer } from '../customer-types'

const sample = (overrides: Partial<Customer>): Customer => ({
  id: 'c1',
  name: 'A',
  phone: '0911111111',
  email: 'a@test.com',
  status: 'potential',
  priority: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('findDuplicateCustomer', () => {
  const list: Customer[] = [
    sample({ id: '1', phone: '0922222222', email: 'dup@test.com' }),
    sample({ id: '2', phone: '0933333333', email: 'other@test.com' }),
  ]

  it('finds duplicate by phone (normalized)', () => {
    const hit = findDuplicateCustomer(list, '0922-222-222', 'new@test.com')
    expect(hit?.id).toBe('1')
  })

  it('finds duplicate by email (case-insensitive)', () => {
    const hit = findDuplicateCustomer(list, '0999999999', 'DUP@test.com')
    expect(hit?.id).toBe('1')
  })

  it('returns null when no match', () => {
    expect(findDuplicateCustomer(list, '0944444444', 'none@test.com')).toBeNull()
  })

  it('ignores excludeId in edit mode', () => {
    const hit = findDuplicateCustomer(list, '0922222222', 'x@y.com', '1')
    expect(hit).toBeNull()
  })
})
