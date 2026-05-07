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

    const [
      { count: pendingMaintenance },
      { count: inProgressMaintenance },
      { count: completedMaintenance },
      { count: unreadNotifications },
    ] = await Promise.all([
      supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requested_by', profile.id)
        .eq('status', 'open'),
      supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requested_by', profile.id)
        .eq('status', 'in_progress'),
      supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .eq('requested_by', profile.id)
        .eq('status', 'completed'),
      supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('notification_type', 'in_app')
        .eq('status', 'sent')
        .is('read_at', null),
    ])

    // Calculate next payment due date from lease payment_due_day
    const now = new Date()
    const dueDay = lease.payment_due_day as number
    let nextPayment = new Date(now.getFullYear(), now.getMonth(), dueDay)
    if (nextPayment <= now) {
      nextPayment = new Date(now.getFullYear(), now.getMonth() + 1, dueDay)
    }

    // Estimate months paid since lease start
    const leaseStart = new Date(lease.start_date as string)
    const leaseEnd = new Date(lease.end_date as string)
    const totalMonths = Math.round((leaseEnd.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30))
    const monthsPaid = Math.max(0, Math.floor((now.getTime() - leaseStart.getTime()) / (1000 * 60 * 60 * 24 * 30)))

    return {
      leaseEndDate: lease.end_date as string,
      monthlyRent: lease.monthly_rent as number,
      depositStatus: 'paid',
      currentMonthDue: lease.monthly_rent as number,
      paymentsMade: monthsPaid,
      totalPayments: totalMonths,
      overdueCount: 0,
      nextPaymentDate: nextPayment.toISOString(),
      maintenancePending: pendingMaintenance || 0,
      maintenanceInProgress: inProgressMaintenance || 0,
      maintenanceCompleted: completedMaintenance || 0,
      unreadNotifications: unreadNotifications || 0,
    }
  } catch (error) {
    console.error('Error fetching tenant stats:', error)
    return null
  }
}
