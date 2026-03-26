'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
export type MaintenanceStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'structural'
  | 'other'

export interface MaintenanceRequest {
  id: string
  propertyId: string
  propertyAddress: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  title: string
  description: string
  status: MaintenanceStatus
  estimatedCost: number | null
  actualCost: number | null
  scheduledDate: string | null
  completedDate: string | null
  photoUrls: string[]
  notes: string | null
  createdAt: string
  requestedByName: string
}

export interface CreateMaintenanceInput {
  propertyId: string
  category: MaintenanceCategory
  priority: MaintenancePriority
  title: string
  description: string
  photoUrls?: string[]
}

export interface UpdateMaintenanceInput {
  status: MaintenanceStatus
  notes?: string
  estimatedCost?: number
  scheduledDate?: string
}

// Maps raw DB row to MaintenanceRequest interface
function mapRow(r: Record<string, unknown>, requesterName = ''): MaintenanceRequest {
  const property = r.property as Record<string, unknown> | null
  return {
    id: r.id as string,
    propertyId: r.property_id as string,
    propertyAddress: (property?.address as string) || '',
    category: r.category as MaintenanceCategory,
    priority: r.priority as MaintenancePriority,
    title: r.title as string,
    description: r.description as string,
    status: r.status as MaintenanceStatus,
    estimatedCost: (r.estimated_cost as number) ?? null,
    actualCost: (r.actual_cost as number) ?? null,
    scheduledDate: (r.scheduled_date as string) ?? null,
    completedDate: (r.completed_date as string) ?? null,
    photoUrls: (r.photo_urls as string[]) || [],
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at as string,
    requestedByName: requesterName,
  }
}

const SELECT_FIELDS = `
  id,
  property_id,
  category,
  priority,
  title,
  description,
  status,
  estimated_cost,
  actual_cost,
  scheduled_date,
  completed_date,
  photo_urls,
  notes,
  created_at,
  property:Property_Rentals!property_id ( address, owner_id )
`

// Tenant: list their own maintenance requests
export async function getMyMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  noStore()
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(SELECT_FIELDS)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  } catch (error) {
    console.error('Error fetching tenant maintenance requests:', error)
    return []
  }
}

// Tenant: submit a new maintenance request
export async function createMaintenanceRequest(
  input: CreateMaintenanceInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const { error } = await supabase.from('maintenance_requests').insert({
      property_id: input.propertyId,
      requested_by: user.id,
      category: input.category,
      priority: input.priority,
      title: input.title,
      description: input.description,
      photo_urls: input.photoUrls ?? [],
      status: 'open',
    })

    if (error) throw error

    revalidatePath('/tenant/maintenance')
    return { success: true }
  } catch (error) {
    console.error('Error creating maintenance request:', error)
    return { success: false, error: '提交失敗，請重試' }
  }
}

// Landlord: list all maintenance requests for owned properties
export async function getLandlordMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  noStore()
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    // Get owned property IDs first
    const { data: properties } = await supabase
      .from('Property_Rentals')
      .select('id')
      .eq('owner_id', user.id)

    if (!properties || properties.length === 0) return []

    const propertyIds = properties.map((p: Record<string, unknown>) => p.id as string)

    const { data, error } = await supabase
      .from('maintenance_requests')
      .select(
        `
        ${SELECT_FIELDS},
        requester:users_profile!requested_by ( full_name )
      `
      )
      .in('property_id', propertyIds)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>
      const requester = row.requester as Record<string, unknown> | null
      return mapRow(row, (requester?.full_name as string) || '租客')
    })
  } catch (error) {
    console.error('Error fetching landlord maintenance requests:', error)
    return []
  }
}

// Landlord: update maintenance request status / details
export async function updateMaintenanceRequest(
  id: string,
  input: UpdateMaintenanceInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const patch: Record<string, unknown> = { status: input.status }
    if (input.notes !== undefined) patch.notes = input.notes
    if (input.estimatedCost !== undefined) patch.estimated_cost = input.estimatedCost
    if (input.scheduledDate !== undefined) patch.scheduled_date = input.scheduledDate
    if (input.status === 'completed') patch.completed_date = new Date().toISOString()

    const { error } = await supabase.from('maintenance_requests').update(patch).eq('id', id)

    if (error) throw error

    revalidatePath('/landlord/maintenance')
    revalidatePath('/tenant/maintenance')
    return { success: true }
  } catch (error) {
    console.error('Error updating maintenance request:', error)
    return { success: false, error: '更新失敗，請重試' }
  }
}

// Tenant: cancel their own open request
export async function cancelMaintenanceRequest(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('requested_by', user.id)
      .in('status', ['open'])

    if (error) throw error

    revalidatePath('/tenant/maintenance')
    return { success: true }
  } catch (error) {
    console.error('Error cancelling maintenance request:', error)
    return { success: false, error: '取消失敗，請重試' }
  }
}
