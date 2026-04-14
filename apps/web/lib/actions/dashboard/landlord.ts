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

    return {
      totalProperties,
      rentedProperties,
      vacantProperties,
      monthlyIncome,
      yearlyIncome: monthlyIncome * 12,
      pendingTasks: 0,
      occupancyRate: totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0,
      closedCustomersCount,
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
    }
  }
}
