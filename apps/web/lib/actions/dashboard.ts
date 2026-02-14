/**
 * @file dashboard.ts
 * @description Server actions for fetching dashboard statistics
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

// --- Types ---

export interface LandlordStats {
  totalProperties: number
  rentedProperties: number
  vacantProperties: number
  monthlyIncome: number
  yearlyIncome: number // Mocked or calculated
  pendingTasks: number // Mocked
  occupancyRate: number
}

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

export interface PotentialTenantStats {
  favoritesCount: number
  viewingsPending: number
  viewingsCompleted: number
  todayViewings: number
  thisWeekViewings: number
  matchingProperties: number
  applicationsInProgress: number
}

export interface AgentDashboardStats {
  activeListings: number
  pendingApplications: number
  upcomingViewings: number
  totalCommission: number
  thisMonthDeals: number
  clientCount: number
}

export interface PotentialBuyerStats {
  savedProperties: number
  scheduledViewings: number
  activeOffers: number
  newMatches: number
  preApprovedAmount: number
}

export interface ServiceProviderStats {
  openWorkOrders: number
  completedJobsMonth: number
  averageRating: number
  todayScheduleCount: number
  earningsMonth: number
  pendingQuotes: number
}

export interface TenantProperty {
  id: string
  title: string
  address: string
  price: number
  specs: string
  area: string
  image: string
  status: string
}

export interface TenantViewing {
  id: string
  property: string
  address: string
  date: string
  time: string
  status: string
  agent: string
}

// --- Actions ---

/**
 * Fetch viewings for Potential Tenant
 */
export async function getPotentialTenantViewings(): Promise<TenantViewing[]> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return []

    // 1. Get Lead IDs
    const { data: leads } = await supabase
      .from('leads_tenants')
      .select('id')
      .ilike('email', user.email)
    
    if (!leads || leads.length === 0) return []

    const leadIds = leads.map(l => l.id)

    // 2. Fetch Viewings
    const { data: viewings, error } = await supabase
      .from('viewing_appointments_tenant')
      .select(`
        id,
        preferred_date,
        status,
        property:Property_Rentals!inner (
          address,
          owner:users_profile!owner_id (
            full_name
          )
        )
      `)
      .in('lead_id', leadIds)
      .order('preferred_date', { ascending: true })

    if (error) throw error
    if (!viewings) return []

    // 3. Transform
    return viewings.map((v: any) => {
      const dateObj = new Date(v.preferred_date)
      const date = dateObj.toLocaleDateString('zh-TW')
      const time = dateObj.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      
      return {
        id: v.id,
        property: v.property?.address || 'Unknown Property', // Using address as title for now
        address: v.property?.address || '',
        date,
        time,
        status: v.status,
        agent: v.property?.owner?.full_name || '房東'
      }
    })

  } catch (error) {
    console.error('Error fetching potential tenant viewings:', error)
    return []
  }
}

/**
 * Fetch statistics for Landlord Dashboard
 */
export async function getLandlordDashboardStats(): Promise<LandlordStats> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Properties
    // We need to check both tables if landlord can have both types
    // Assuming owner_id links to users_profile.id
    // First get profile id
    const { data: profile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) throw new Error('Profile not found')

    const { data: rentalProps, error: rentalError } = await supabase
      .from('property_rentals')
      .select('id, status, monthly_rent')
      .eq('owner_id', profile.id)

    const { data: salesProps, error: salesError } = await supabase
      .from('property_sales')
      .select('id, status, price')
      .eq('owner_id', profile.id)

    const rentals = rentalProps || []
    const sales = salesProps || []

    const totalProperties = rentals.length + sales.length
    const rentedProperties = rentals.filter(p => p.status === 'rented').length
    const vacantProperties = rentals.filter(p => p.status === 'vacant').length + sales.filter(p => p.status === 'available').length

    // 2. Income
    // Calculate expected monthly income from rented properties
    const monthlyIncome = rentals
      .filter(p => p.status === 'rented')
      .reduce((sum, p) => sum + (Number(p.monthly_rent) || 0), 0)

    return {
      totalProperties,
      rentedProperties,
      vacantProperties,
      monthlyIncome,
      yearlyIncome: monthlyIncome * 12, // Estimate
      pendingTasks: 0, // TODO: Check maintenance requests
      occupancyRate: totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0
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
      occupancyRate: 0
    }
  }
}

/**
 * Fetch statistics for Tenant Dashboard
 */
export async function getTenantDashboardStats(): Promise<TenantStats | null> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('users_profile')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) return null

    // 1. Find active lease
    const { data: lease } = await supabase
      .from('lease_agreements')
      .select('*')
      .eq('tenant_id', profile.id)
      .eq('status', 'active')
      .single()

    if (!lease) {
        // If no active lease, return null or empty stats
        // Check for any lease to show historical data? 
        // For now, if no active lease, assume not a contracted tenant or just show empty
        return null
    }

    // 2. Maintenance Requests
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

    // 3. Payments (Mocked for now as we don't have full ledger logic yet)
    // We can query rental_ledger if populated
    
    return {
      leaseEndDate: lease.end_date,
      monthlyRent: lease.monthly_rent,
      depositStatus: 'paid', // TODO: Check deposit transaction
      currentMonthDue: lease.monthly_rent, // Simplified
      paymentsMade: 0, // TODO: Count from ledger
      totalPayments: 12, // TODO: Calculate based on lease duration
      overdueCount: 0,
      nextPaymentDate: new Date().toISOString(), // TODO: Calculate next due date
      maintenancePending: pendingMaintenance || 0,
      maintenanceInProgress: inProgressMaintenance || 0,
      maintenanceCompleted: completedMaintenance || 0,
      unreadNotifications: 0 // TODO: Check notifications table
    }

  } catch (error) {
    console.error('Error fetching tenant stats:', error)
    return null
  }
}

/**
 * Fetch statistics for Potential Tenant Dashboard
 */
export async function getPotentialTenantDashboardStats(): Promise<PotentialTenantStats | null> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return null

    // Find leads matching user's email
    // Note: We use case-insensitive match on email
    const { data: leads } = await supabase
      .from('leads_tenants')
      .select('id, landlord_id')
      .ilike('email', user.email)
    
    if (!leads || leads.length === 0) {
        // Fallback: Check if user is also a landlord (for demo/dev purposes)
        // If the user is a landlord, they might want to see how the dashboard looks.
        // But strictly speaking, if they are not a lead, they have 0 stats.
        return {
            favoritesCount: 0,
            viewingsPending: 0,
            viewingsCompleted: 0,
            todayViewings: 0,
            thisWeekViewings: 0,
            matchingProperties: 0,
            applicationsInProgress: 0
        }
    }

    const leadIds = leads.map(l => l.id)
    const ownerIds = leads.map(l => l.landlord_id) // Landlords who invited this user

    // 1. Viewings
    const { data: viewings } = await supabase
      .from('viewing_appointments_tenant')
      .select('*')
      .in('lead_id', leadIds)
    
    const viewingsPending = viewings?.filter(v => v.status === 'confirmed').length || 0
    const viewingsCompleted = viewings?.filter(v => v.status === 'completed').length || 0
    
    // Calculate today and this week
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const todayViewings = viewings?.filter(v => {
        const d = new Date(v.scheduled_at)
        return d.toDateString() === now.toDateString() && v.status === 'confirmed'
    }).length || 0

    const thisWeekViewings = viewings?.filter(v => {
        const d = new Date(v.scheduled_at)
        return d >= now && d <= nextWeek && v.status === 'confirmed'
    }).length || 0

    // 2. Matching Properties (Properties from the Landlords who invited this user)
    const { count: matchingProperties } = await supabase
      .from('Property_Rentals')
      .select('*', { count: 'exact', head: true })
      .in('owner_id', ownerIds)
      .eq('status', 'vacant')

    return {
      favoritesCount: 0,
      viewingsPending,
      viewingsCompleted,
      todayViewings,
      thisWeekViewings,
      matchingProperties: matchingProperties || 0,
      applicationsInProgress: 0 // TODO: Implement when Application table exists
    }

  } catch (error) {
    console.error('Error fetching potential tenant stats:', error)
    return null
  }
}

/**
 * Fetch properties for Potential Tenant
 */
export async function getPotentialTenantProperties(): Promise<TenantProperty[]> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return []

    // 1. Get Owner IDs who invited this user
    const { data: leads } = await supabase
      .from('leads_tenants')
      .select('landlord_id')
      .ilike('email', user.email)
    
    if (!leads || leads.length === 0) {
      // Fallback for demo: if user is landlord, show their own properties? 
      // Or just return empty
      return []
    }

    const ownerIds = leads.map(l => l.landlord_id)

    // 2. Fetch properties from these owners
    // Only 'vacant' or 'available' properties
    const { data: properties, error } = await supabase
      .from('Property_Rentals')
      .select(`
        id,
        address,
        monthly_rent,
        status,
        details,
        Property_Photos (
          storage_path,
          is_primary
        )
      `)
      .in('owner_id', ownerIds)
      .eq('status', 'vacant')

    if (error) throw error
    if (!properties) return []

    // 3. Transform to TenantProperty
    return properties.map((p: any) => {
      // Extract details
      const details = typeof p.details === 'string' ? JSON.parse(p.details) : p.details || {}
      const bedrooms = details.bedrooms || 0
      const bathrooms = details.bathrooms || 0
      const area = details.area || 0

      // Find primary photo
      const primaryPhoto = p.Property_Photos?.find((ph: any) => ph.is_primary) || p.Property_Photos?.[0]
      // Construct image URL (mock or real)
      const image = primaryPhoto 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${primaryPhoto.storage_path}`
        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=60' // Fallback

      return {
        id: p.id,
        title: p.address, // Or some title field if added later
        address: p.address,
        price: p.monthly_rent,
        specs: `${bedrooms}房 ${bathrooms}衛`,
        area: `${area}坪`,
        image,
        status: p.status
      }
    })

  } catch (error) {
    console.error('Error fetching potential tenant properties:', error)
    return []
  }
}

/**
 * Fetch statistics for Agent Dashboard
 */
export async function getAgentDashboardStats(): Promise<AgentDashboardStats> {
  noStore()
  // Mock data for initial implementation
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate network delay

  return {
    activeListings: 12,
    pendingApplications: 5,
    upcomingViewings: 8,
    totalCommission: 158000,
    thisMonthDeals: 3,
    clientCount: 45
  }
}

/**
 * Fetch statistics for Potential Buyer Dashboard
 */
export async function getPotentialBuyerDashboardStats(): Promise<PotentialBuyerStats> {
  noStore()
  // Mock data for initial implementation
  await new Promise(resolve => setTimeout(resolve, 500))

  return {
    savedProperties: 15,
    scheduledViewings: 3,
    activeOffers: 1,
    newMatches: 8,
    preApprovedAmount: 15000000
  }
}

/**
 * Fetch statistics for Service Provider Dashboard
 */
export async function getServiceProviderDashboardStats(): Promise<ServiceProviderStats> {
  noStore()
  // Mock data for initial implementation
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
