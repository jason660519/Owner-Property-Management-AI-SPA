'use server'

import { unstable_noStore as noStore } from 'next/cache'

export interface AgentDashboardStats {
  activeListings: number
  pendingApplications: number
  upcomingViewings: number
  totalCommission: number
  thisMonthDeals: number
  clientCount: number
}

export async function getAgentDashboardStats(): Promise<AgentDashboardStats> {
  noStore()
  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    activeListings: 12,
    pendingApplications: 5,
    upcomingViewings: 8,
    totalCommission: 158000,
    thisMonthDeals: 3,
    clientCount: 45
  }
}
