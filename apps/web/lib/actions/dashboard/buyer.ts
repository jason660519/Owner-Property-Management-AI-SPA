'use server'

import { unstable_noStore as noStore } from 'next/cache'

export interface PotentialBuyerStats {
  savedProperties: number
  scheduledViewings: number
  activeOffers: number
  newMatches: number
  preApprovedAmount: number
}

export async function getPotentialBuyerDashboardStats(): Promise<PotentialBuyerStats> {
  noStore()
  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    savedProperties: 15,
    scheduledViewings: 3,
    activeOffers: 1,
    newMatches: 8,
    preApprovedAmount: 15000000
  }
}
