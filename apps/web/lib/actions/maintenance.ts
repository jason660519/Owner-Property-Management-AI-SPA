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
  assignedToId: string | null
  assignedToName: string | null
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
  scheduledDate?: string | null
  assignedToId?: string | null
  actualCost?: number | null
}

// Maps raw DB row to MaintenanceRequest interface
function mapRow(r: Record<string, unknown>, requesterName = ''): MaintenanceRequest {
  const property = r.property as Record<string, unknown> | null
  const assignee = r.assignee as Record<string, unknown> | null
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
    assignedToId: (r.assigned_to as string) ?? null,
    assignedToName: (assignee?.full_name as string) || null,
  }
}

const SELECT_FIELDS = `
  id,
  property_id,
  assigned_to,
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
  property:Property_Rentals!property_id ( address, owner_id ),
  assignee:users_profile!assigned_to ( full_name )
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

export interface MaintenanceAssigneeOption {
  id: string
  fullName: string
}

/** Profiles the landlord may assign as on-platform handler (self + ledger tenants). */
export async function getMaintenanceAssigneeOptions(): Promise<MaintenanceAssigneeOption[]> {
  noStore()
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data: properties, error: propError } = await supabase
      .from('Property_Rentals')
      .select('id')
      .eq('owner_id', user.id)

    if (propError) throw propError
    const propertyIds = (properties ?? []).map((p: { id: string }) => p.id)
    if (propertyIds.length === 0) return []

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from('rental_ledger')
      .select('tenant_id')
      .in('property_id', propertyIds)
      .not('tenant_id', 'is', null)

    if (ledgerError) throw ledgerError

    const tenantIds = [
      ...new Set(
        (ledgerRows ?? [])
          .map((row: { tenant_id: string | null }) => row.tenant_id)
          .filter((tid): tid is string => Boolean(tid))
      ),
    ]

    const candidateIds = [...new Set([user.id, ...tenantIds])]

    const { data: profiles, error: profileError } = await supabase
      .from('users_profile')
      .select('id, full_name')
      .in('id', candidateIds)

    if (profileError) throw profileError

    const list = (profiles ?? []) as { id: string; full_name: string | null }[]
    return list.map((p) => ({
      id: p.id,
      fullName: p.full_name?.trim() || (p.id === user.id ? '房東（本人）' : '未命名使用者'),
    }))
  } catch (error) {
    console.error('Error loading maintenance assignee options:', error)
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

    const { data: existing, error: loadError } = await supabase
      .from('maintenance_requests')
      .select(
        `
        id,
        property:Property_Rentals!inner ( owner_id )
      `
      )
      .eq('id', id)
      .maybeSingle()

    if (loadError) throw loadError
    if (!existing) return { success: false, error: '找不到此維修申請' }

    const property = existing.property as { owner_id: string } | null
    if (!property || property.owner_id !== user.id) {
      return { success: false, error: '無權限更新此申請' }
    }

    if (input.assignedToId !== undefined && input.assignedToId !== null) {
      const { data: props } = await supabase.from('Property_Rentals').select('id').eq('owner_id', user.id)
      const pids = (props ?? []).map((p: { id: string }) => p.id)
      const { data: ledgerRows } = await supabase
        .from('rental_ledger')
        .select('tenant_id')
        .in('property_id', pids)
        .not('tenant_id', 'is', null)
      const tenantIds = new Set(
        (ledgerRows ?? [])
          .map((row: { tenant_id: string | null }) => row.tenant_id)
          .filter((tid): tid is string => Boolean(tid))
      )
      const allowed = new Set<string>([user.id, ...tenantIds])
      if (!allowed.has(input.assignedToId)) {
        return { success: false, error: '無效的指派對象' }
      }
    }

    const patch: Record<string, unknown> = { status: input.status }
    if (input.notes !== undefined) patch.notes = input.notes
    if (input.estimatedCost !== undefined) patch.estimated_cost = input.estimatedCost
    if (input.scheduledDate !== undefined) patch.scheduled_date = input.scheduledDate
    if (input.assignedToId !== undefined) patch.assigned_to = input.assignedToId
    if (input.actualCost !== undefined) patch.actual_cost = input.actualCost
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
