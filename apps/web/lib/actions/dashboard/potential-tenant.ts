'use server'

import { createClient } from '@/lib/supabase/server'
import { unstable_noStore as noStore } from 'next/cache'

export interface PotentialTenantStats {
  favoritesCount: number
  viewingsPending: number
  viewingsCompleted: number
  todayViewings: number
  thisWeekViewings: number
  matchingProperties: number
  applicationsInProgress: number
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

export async function getPotentialTenantViewings(): Promise<TenantViewing[]> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return []

    const { data: leads } = await supabase
      .from('leads_tenants')
      .select('id')
      .ilike('email', user.email)

    if (!leads || leads.length === 0) return []

    const leadIds = leads.map(l => l.id)

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

    return viewings.map((v: Record<string, unknown>) => {
      const dateObj = new Date(v.preferred_date as string)
      const date = dateObj.toLocaleDateString('zh-TW')
      const time = dateObj.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      const property = v.property as Record<string, unknown> | null

      return {
        id: v.id as string,
        property: (property?.address as string) || 'Unknown Property',
        address: (property?.address as string) || '',
        date,
        time,
        status: v.status as string,
        agent: ((property?.owner as Record<string, unknown>)?.full_name as string) || '房東'
      }
    })
  } catch (error) {
    console.error('Error fetching potential tenant viewings:', error)
    return []
  }
}

export async function getPotentialTenantDashboardStats(): Promise<PotentialTenantStats | null> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return null

    const { data: leads } = await supabase
      .from('leads_tenants')
      .select('id, landlord_id')
      .ilike('email', user.email)

    if (!leads || leads.length === 0) {
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
    const ownerIds = leads.map(l => l.landlord_id)

    const { data: viewings } = await supabase
      .from('viewing_appointments_tenant')
      .select('*')
      .in('lead_id', leadIds)

    const viewingsPending = viewings?.filter(v => v.status === 'confirmed').length || 0
    const viewingsCompleted = viewings?.filter(v => v.status === 'completed').length || 0

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
      applicationsInProgress: 0
    }
  } catch (error) {
    console.error('Error fetching potential tenant stats:', error)
    return null
  }
}

export async function getPotentialTenantProperties(): Promise<TenantProperty[]> {
  noStore()
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return []

    const { data: leads } = await supabase
      .from('leads_tenants')
      .select('landlord_id')
      .ilike('email', user.email)

    if (!leads || leads.length === 0) return []

    const ownerIds = leads.map(l => l.landlord_id)

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

    return properties.map((p: Record<string, unknown>) => {
      const rawDetails = p.details
      const details = typeof rawDetails === 'string' ? JSON.parse(rawDetails) : (rawDetails as Record<string, unknown>) || {}
      const bedrooms = details.bedrooms || 0
      const bathrooms = details.bathrooms || 0
      const area = details.area || 0

      const photos = p.Property_Photos as Array<Record<string, unknown>> | undefined
      const primaryPhoto = photos?.find((ph) => ph.is_primary) || photos?.[0]
      const image = primaryPhoto
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${primaryPhoto.storage_path}`
        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=60'

      return {
        id: p.id as string,
        title: p.address as string,
        address: p.address as string,
        price: p.monthly_rent as number,
        specs: `${bedrooms}房 ${bathrooms}衛`,
        area: `${area}坪`,
        image,
        status: p.status as string
      }
    })
  } catch (error) {
    console.error('Error fetching potential tenant properties:', error)
    return []
  }
}
