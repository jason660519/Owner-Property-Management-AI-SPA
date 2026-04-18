import { customerSchema } from '../customer-types'

describe('customerSchema', () => {
  const base = {
    name: '王小明',
    phone: '0912345678',
    email: 'a@b.com',
    status: 'potential' as const,
    notes: '',
  }

  it('accepts valid TW mobile and email', () => {
    const r = customerSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.phone).toBe('0912345678')
    }
  })

  it('strips spaces/dashes in phone before validation', () => {
    const r = customerSchema.safeParse({ ...base, phone: '0912 345 678' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.phone).toBe('0912345678')
  })

  it('rejects invalid phone prefix', () => {
    const r = customerSchema.safeParse({ ...base, phone: '0812345678' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid phone length', () => {
    const r = customerSchema.safeParse({ ...base, phone: '091234567' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const r = customerSchema.safeParse({ ...base, email: 'not-an-email' })
    expect(r.success).toBe(false)
  })

  it('rejects empty name', () => {
    const r = customerSchema.safeParse({ ...base, name: '  ' })
    expect(r.success).toBe(false)
  })
})
