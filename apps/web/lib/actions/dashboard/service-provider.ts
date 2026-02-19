'use server'

import { unstable_noStore as noStore } from 'next/cache'

export interface ServiceProviderStats {
  openWorkOrders: number
  completedJobsMonth: number
  averageRating: number
  todayScheduleCount: number
  earningsMonth: number
  pendingQuotes: number
}

export async function getServiceProviderDashboardStats(): Promise<ServiceProviderStats> {
  noStore()
  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    openWorkOrders: 7,
    completedJobsMonth: 24,
    averageRating: 4.8,
    todayScheduleCount: 3,
    earningsMonth: 86000,
    pendingQuotes: 4
  }
}
