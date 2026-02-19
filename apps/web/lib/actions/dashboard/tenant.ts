'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export interface TenantStats {
  leaseEndDate: string | null
  monthlyRent: number
  depositStatus: 'paid' | 'unpaid' | 'refunding' | 'unknown'
  currentMonthDue: number
  paymentsMade: number
  totalPayments: number
  overdueCount: number
  nextPaymentDate: string | null
  maintenancePending: number
  maintenanceInProgress: number
  maintenanceCompleted: number
  unreadNotifications: number
}

export async function getTenantDashboardStats(): Promise<TenantStats | null> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    const { data: lease } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('tenant_id', profile.id)
      .eq('status', 'active')
      .single()

    if (!lease) return null

    const { count: pendingMaintenance } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requested_by', profile.id)
      .eq('status', 'open')

    const { count: inProgressMaintenance } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requested_by', profile.id)
      .eq('status', 'in_progress')

    const { count: completedMaintenance } = await supabase
      .from('maintenance_requests')
      .select('*', { count: 'exact', head: true })
      .eq('requested_by', profile.id)
      .eq('status', 'completed')

    return {
      leaseEndDate: lease.end_date,
      monthlyRent: lease.monthly_rent,
      depositStatus: 'paid',
      currentMonthDue: lease.monthly_rent,
      paymentsMade: 0,
      totalPayments: 12,
      overdueCount: 0,
      nextPaymentDate: new Date().toISOString(),
      maintenancePending: pendingMaintenance || 0,
      maintenanceInProgress: inProgressMaintenance || 0,
      maintenanceCompleted: completedMaintenance || 0,
      unreadNotifications: 0
    }
  } catch (error) {
    console.error('Error fetching tenant stats:', error)
    return null
  }
}
