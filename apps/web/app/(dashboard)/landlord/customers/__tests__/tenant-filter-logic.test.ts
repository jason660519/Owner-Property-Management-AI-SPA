import { parseCustomerDetails } from '../customer-details'
import type { Customer } from '../customer-types'
import {
  DEFAULT_TENANT_FILTER_CRITERIA,
  filterTenants,
  passesIncomeRentMultiple,
} from '../tenant-filter-logic'

function makeCustomer(id: string, income: number | null): Customer {
  const tenantProfile =
    income == null
      ? undefined
      : {
          creditScore: 700,
          monthlyIncome: income,
          occupationType: '工程師',
        }
  const notes = JSON.stringify({
    summaryNote: '',
    intent: 'undecided',
    followUps: [],
    viewingRecords: [],
    communicationLog: [],
    ...(tenantProfile ? { tenantProfile } : {}),
  })

  return {
    id,
    name: `租客 ${id}`,
    phone: '0900000000',
    email: 't@example.com',
    status: 'potential',
    notes,
    priority: 0,
    created_at: new Date().toISOString(),
  }
}

describe('tenant-filter-logic (T-21)', () => {
  it('passesIncomeRentMultiple: income must be >= 3× reference rent', () => {
    const profile = { creditScore: 650, monthlyIncome: 89_999, occupationType: '工程師' }
    expect(passesIncomeRentMultiple(profile, 30_000, 3)).toBe(false)
    expect(passesIncomeRentMultiple(profile, 30_000, 2)).toBe(true)

    const exact = { creditScore: 650, monthlyIncome: 90_000, occupationType: '工程師' }
    expect(passesIncomeRentMultiple(exact, 30_000, 3)).toBe(true)
  })

  it('filterTenants: 月收入為月租 3 倍以上的篩選條件正確過濾申請者', () => {
    const customers: Customer[] = [
      makeCustomer('a', 120_000),
      makeCustomer('b', 90_000),
      makeCustomer('c', 89_000),
      makeCustomer('d', null),
    ]

    const criteria = {
      ...DEFAULT_TENANT_FILTER_CRITERIA,
      rentIncomeMultiple: 3 as const,
    }

    const filtered = filterTenants(customers, (c) => parseCustomerDetails(c.notes), criteria, 30_000)
    const ids = filtered.map((c) => c.id).sort()
    expect(ids).toEqual(['a', 'b'])
  })
})
