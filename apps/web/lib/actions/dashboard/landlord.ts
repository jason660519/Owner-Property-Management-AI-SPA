'use server'

import { isActiveClosedLandlordCustomer } from '@/app/(dashboard)/landlord/customers/customer-details'
import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export interface LandlordStats {
  totalProperties: number
  rentedProperties: number
  vacantProperties: number
  monthlyIncome: number
  yearlyIncome: number
  pendingTasks: number
  occupancyRate: number
  /** 已成交且未封存的房東客戶數（Row 034） */
  closedCustomersCount: number
  pendingApplications: number
  openMaintenanceRequests: number
  expiringLeasesCount: number
}

export async function getLandlordDashboardStats(): Promise<LandlordStats> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) throw new Error('Profile not found')

    const { data: rentalProps } = await supabase
      .from('property_rentals')
      .select('id, status, monthly_rent')
      .eq('owner_id', profile.id)

    const { data: salesProps } = await supabase
      .from('property_sales')
      .select('id, status, price')
      .eq('owner_id', profile.id)

    const rentals = rentalProps || []
    const sales = salesProps || []

    const totalProperties = rentals.length + sales.length
    const rentedProperties = rentals.filter(p => p.status === 'rented').length
    const vacantProperties = rentals.filter(p => p.status === 'vacant').length + sales.filter(p => p.status === 'available').length

    const monthlyIncome = rentals
      .filter(p => p.status === 'rented')
      .reduce((sum, p) => sum + (Number(p.monthly_rent) || 0), 0)

    const { data: landlordCustomers } = await supabase
      .from('landlord_customers')
      .select('status,notes')
      .eq('landlord_id', user.id)

    const closedCustomersCount = (landlordCustomers ?? []).filter(isActiveClosedLandlordCustomer).length

    // Pending rental applications awaiting review
    const { count: pendingApplications } = await supabase
      .from('rental_applications')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', user.id)
      .in('status', ['submitted', 'under_review'])

    // Open maintenance requests on landlord's rental properties
    const rentalIds = rentals.map(p => p.id)
    let openMaintenanceRequests = 0
    if (rentalIds.length > 0) {
      const { count } = await supabase
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true })
        .in('property_id', rentalIds)
        .eq('status', 'open')
      openMaintenanceRequests = count ?? 0
    }

    // Leases expiring within 30 days
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { count: expiringLeasesCount } = await supabase
      .from('lease_agreements')
      .select('*', { count: 'exact', head: true })
      .eq('landlord_id', user.id)
      .eq('status', 'active')
      .lte('end_date', thirtyDaysOut)

    const pendingTasksTotal = (pendingApplications ?? 0) + openMaintenanceRequests + (expiringLeasesCount ?? 0)

    return {
      totalProperties,
      rentedProperties,
      vacantProperties,
      monthlyIncome,
      yearlyIncome: monthlyIncome * 12,
      pendingTasks: pendingTasksTotal,
      occupancyRate: totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0,
      closedCustomersCount,
      pendingApplications: pendingApplications ?? 0,
      openMaintenanceRequests,
      expiringLeasesCount: expiringLeasesCount ?? 0,
    }
  } catch (error) {
    console.error('Error fetching landlord stats:', error)
    return {
      totalProperties: 0,
      rentedProperties: 0,
      vacantProperties: 0,
      monthlyIncome: 0,
      yearlyIncome: 0,
      pendingTasks: 0,
      occupancyRate: 0,
      closedCustomersCount: 0,
      pendingApplications: 0,
      openMaintenanceRequests: 0,
      expiringLeasesCount: 0,
    }
  }
}
