import type { Customer } from './customer-types'
import type { CustomerDetailsPayload, TenantProfile } from './customer-details'

export const OCCUPATION_OPTIONS = ['工程師', '金融業', '服務業', '自由業', '公教', '其他'] as const

export type TenantSortKey =
  | 'credit_desc'
  | 'credit_asc'
  | 'income_desc'
  | 'income_asc'
  | 'occupation_asc'
  | 'fit_desc'
  | 'fit_asc'

export type TenantFilterCriteria = {
  creditMin: number | null
  creditMax: number | null
  incomeMin: number | null
  occupationFilters: string[]
  /** When set (e.g. 3), require monthlyIncome >= referenceMonthlyRent * multiple (T-21). */
  rentIncomeMultiple: number | null
}

export const DEFAULT_TENANT_FILTER_CRITERIA: TenantFilterCriteria = {
  creditMin: null,
  creditMax: null,
  incomeMin: null,
  occupationFilters: [],
  rentIncomeMultiple: null,
}

export function getTenantProfile(details: CustomerDetailsPayload): TenantProfile {
  return (
    details.tenantProfile ?? {
      creditScore: null,
      monthlyIncome: null,
      occupationType: null,
    }
  )
}

/** T-21 / AC: applicant passes when declared monthly income is at least `multiple` times reference rent. */
export function passesIncomeRentMultiple(
  profile: TenantProfile | undefined,
  referenceMonthlyRent: number,
  multiple: number,
): boolean {
  const income = profile?.monthlyIncome
  if (income == null || !Number.isFinite(income)) return false
  if (!Number.isFinite(referenceMonthlyRent) || referenceMonthlyRent <= 0) return false
  if (!Number.isFinite(multiple) || multiple <= 0) return false
  return income >= referenceMonthlyRent * multiple
}

export function filterTenants(
  customers: Customer[],
  getDetails: (customer: Customer) => CustomerDetailsPayload,
  criteria: TenantFilterCriteria,
  referenceMonthlyRent: number,
): Customer[] {
  return customers.filter((customer) => {
    const profile = getTenantProfile(getDetails(customer))

    if (criteria.rentIncomeMultiple != null) {
      if (!passesIncomeRentMultiple(profile, referenceMonthlyRent, criteria.rentIncomeMultiple)) {
        return false
      }
    }

    if (criteria.creditMin != null) {
      if (profile.creditScore == null || profile.creditScore < criteria.creditMin) return false
    }
    if (criteria.creditMax != null) {
      if (profile.creditScore == null || profile.creditScore > criteria.creditMax) return false
    }

    if (criteria.incomeMin != null) {
      if (profile.monthlyIncome == null || profile.monthlyIncome < criteria.incomeMin) return false
    }

    if (criteria.occupationFilters.length > 0) {
      const occ = profile.occupationType?.trim().toLowerCase() ?? ''
      const wanted = criteria.occupationFilters.map((o) => o.trim().toLowerCase()).filter(Boolean)
      if (!occ || !wanted.some((w) => occ === w || occ.includes(w))) {
        return false
      }
    }

    return true
  })
}

export type FitTierLabel = '佳' | '中' | '待觀察'

export function computeTenantFit(
  profile: TenantProfile | undefined,
  referenceMonthlyRent: number,
): { score: number | null; tier: FitTierLabel | null; lines: string[] } {
  const lines: string[] = []
  if (!profile || (profile.monthlyIncome == null && profile.creditScore == null && !profile.occupationType)) {
    return { score: null, tier: null, lines: ['尚無租客篩選欄位資料，請於客戶表單補齊。'] }
  }

  const rent = Number.isFinite(referenceMonthlyRent) && referenceMonthlyRent > 0 ? referenceMonthlyRent : 0
  let incomePoints = 0
  if (profile.monthlyIncome != null && Number.isFinite(profile.monthlyIncome) && rent > 0) {
    const ratio = profile.monthlyIncome / rent
    incomePoints = Math.min(45, (Math.min(ratio, 5) / 3) * 45)
    lines.push(`收入倍數（對參考月租）：約 ${ratio.toFixed(2)}×（權重最高 45 分）`)
  } else {
    lines.push('收入或參考月租未填，收入面向不計分。')
  }

  let creditPoints = 0
  if (profile.creditScore != null && Number.isFinite(profile.creditScore)) {
    creditPoints = Math.min(35, (Math.min(Math.max(profile.creditScore, 0), 850) / 850) * 35)
    lines.push(`信用分數 ${profile.creditScore}（權重最高 35 分）`)
  } else {
    lines.push('信用分數未填，信用面向不計分。')
  }

  let occPoints = 0
  const occ = profile.occupationType?.trim() ?? ''
  if (occ) {
    const stable = ['公教', '金融業', '工程師'].some((k) => occ.includes(k))
    occPoints = stable ? 15 : 10
    lines.push(`職業：${occ}（穩定度加分最高 15 分）`)
  } else {
    lines.push('職業類型未填，職業面向不計分。')
  }

  const raw = incomePoints + creditPoints + occPoints
  const hasAnySignal = incomePoints > 0 || creditPoints > 0 || occPoints > 0
  if (!hasAnySignal) {
    return { score: null, tier: null, lines }
  }

  const score = Math.round(Math.min(100, Math.max(0, raw)) * 10) / 10
  let tier: FitTierLabel
  if (score >= 80) tier = '佳'
  else if (score >= 50) tier = '中'
  else tier = '待觀察'

  lines.push(`合計約 ${score} 分（僅供房東內部參考，非徵信報告）。`)

  return { score, tier, lines }
}

function sortKeyForOccupation(profile: TenantProfile | undefined): string {
  return profile?.occupationType?.trim().toLowerCase() ?? '\uffff'
}

export function sortTenants(
  customers: Customer[],
  getDetails: (customer: Customer) => CustomerDetailsPayload,
  sortKey: TenantSortKey,
  referenceMonthlyRent: number,
): Customer[] {
  const decorated = customers.map((c) => ({
    customer: c,
    profile: getTenantProfile(getDetails(c)),
    fit: computeTenantFit(getTenantProfile(getDetails(c)), referenceMonthlyRent).score ?? -1,
  }))

  const mul = sortKey.endsWith('_asc') ? 1 : -1

  decorated.sort((a, b) => {
    switch (sortKey) {
      case 'credit_asc':
      case 'credit_desc': {
        const av = a.profile.creditScore
        const bv = b.profile.creditScore
        const aMissing = av == null ? 1 : 0
        const bMissing = bv == null ? 1 : 0
        if (aMissing !== bMissing) return aMissing - bMissing
        return ((av ?? 0) - (bv ?? 0)) * mul
      }
      case 'income_asc':
      case 'income_desc': {
        const av = a.profile.monthlyIncome
        const bv = b.profile.monthlyIncome
        const aMissing = av == null ? 1 : 0
        const bMissing = bv == null ? 1 : 0
        if (aMissing !== bMissing) return aMissing - bMissing
        return ((av ?? 0) - (bv ?? 0)) * mul
      }
      case 'occupation_asc':
        return sortKeyForOccupation(a.profile).localeCompare(sortKeyForOccupation(b.profile), 'zh-Hant')
      case 'fit_asc':
      case 'fit_desc':
        return (a.fit - b.fit) * mul
      default:
        return 0
    }
  })

  return decorated.map((d) => d.customer)
}
