'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'
/** `pending_tenant`: landlord submitted closure; tenant must confirm before `completed`. */
export type MaintenanceStatus =
  | 'open'
  | 'in_progress'
  | 'pending_tenant'
  | 'completed'
  | 'cancelled'
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
  /** Landlord workflow: cannot set `completed` here — use `confirmMaintenanceClosureByTenant` or `completeMaintenanceAsLandlord`. */
  status: Exclude<MaintenanceStatus, 'completed'>
  notes?: string
  estimatedCost?: number
  scheduledDate?: string | null
  assignedToId?: string | null
  actualCost?: number | null
}

const LEDGER_DESC_PREFIX = '[maintenance_request:'

function ledgerDescriptionForMaintenanceRequest(id: string, title: string): string {
  return `${LEDGER_DESC_PREFIX}${id}] ${title}`
}

async function enqueueInAppNotification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.from('notification_queue').insert({
    user_id: userId,
    notification_type: 'in_app',
    title,
    message,
    priority: 'normal',
    status: 'pending',
    metadata,
  })
  if (error) console.error('enqueueInAppNotification:', error)
}

function formatZhVisit(iso: string | null): string {
  if (!iso) return '（尚未設定）'
  return new Date(iso).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Idempotent maintenance expense row for finance summaries. Returns true if a new row was inserted. */
async function ensureMaintenanceLedgerExpense(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    landlordId: string
    maintenanceId: string
    propertyId: string
    tenantId: string | null
    title: string
    amount: number
  }
): Promise<boolean> {
  const descNeedle = `${LEDGER_DESC_PREFIX}${params.maintenanceId}]`
  const { data: existing, error: findErr } = await supabase
    .from('rental_ledger')
    .select('id')
    .eq('property_id', params.propertyId)
    .eq('transaction_type', 'maintenance')
    .ilike('description', `%${descNeedle}%`)
    .maybeSingle()

  if (findErr) {
    console.error('ensureMaintenanceLedgerExpense lookup:', findErr)
    return false
  }
  if (existing) return false

  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('rental_ledger').insert({
    property_id: params.propertyId,
    tenant_id: params.tenantId,
    transaction_date: today,
    transaction_type: 'maintenance',
    amount: params.amount,
    description: ledgerDescriptionForMaintenanceRequest(params.maintenanceId, params.title),
    created_by: params.landlordId,
  })
  if (error) {
    console.error('ensureMaintenanceLedgerExpense insert:', error)
    return false
  }
  return true
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

// Landlord: update maintenance request status / details (never sets `completed` — see complete flows below)
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
        requested_by,
        status,
        scheduled_date,
        title,
        property_id,
        actual_cost,
        estimated_cost,
        notes,
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

    const prevStatus = existing.status as MaintenanceStatus
    const requestedBy = existing.requested_by as string
    const prevScheduled = (existing.scheduled_date as string | null) ?? null

    if (input.status === 'pending_tenant' && prevStatus !== 'in_progress') {
      return { success: false, error: '請先將案件標記為「處理中」，再送請租客確認結案' }
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

    const { error } = await supabase.from('maintenance_requests').update(patch).eq('id', id)

    if (error) throw error

    const mergedScheduled =
      input.scheduledDate !== undefined ? input.scheduledDate : prevScheduled

    if (prevStatus === 'open' && input.status === 'in_progress') {
      await enqueueInAppNotification(
        supabase,
        requestedBy,
        '維修案件已接單',
        `您的「${existing.title as string}」維修申請已由房東／處理人接單。預約到訪：${formatZhVisit(mergedScheduled)}。`,
        { maintenance_request_id: id, event: 'maintenance_accepted' }
      )
    }

    if (prevStatus === 'in_progress' && input.status === 'pending_tenant') {
      const act = input.actualCost !== undefined ? input.actualCost : (existing.actual_cost as number | null)
      const costLine =
        act != null && !Number.isNaN(Number(act))
          ? `實際費用 NT$ ${Number(act).toLocaleString('zh-TW')}。`
          : ''
      await enqueueInAppNotification(
        supabase,
        requestedBy,
        '請確認維修結案',
        `「${existing.title as string}」已完成處理，${costLine}請至維修申請頁面確認結案。`,
        { maintenance_request_id: id, event: 'maintenance_pending_confirm' }
      )
    }

    if (
      prevStatus === 'in_progress' &&
      input.status === 'in_progress' &&
      input.scheduledDate !== undefined &&
      (input.scheduledDate || '') !== (prevScheduled || '')
    ) {
      await enqueueInAppNotification(
        supabase,
        requestedBy,
        '維修預約時間已更新',
        `「${existing.title as string}」預約到訪時間已調整為：${formatZhVisit(input.scheduledDate)}。`,
        { maintenance_request_id: id, event: 'maintenance_schedule_changed' }
      )
    }

    revalidatePath('/landlord/maintenance')
    revalidatePath('/tenant/maintenance')
    return { success: true }
  } catch (error) {
    console.error('Error updating maintenance request:', error)
    return { success: false, error: '更新失敗，請重試' }
  }
}

/** Tenant: `pending_tenant` → `completed` (ledger is written when landlord next loads maintenance — see sync). */
export async function confirmMaintenanceClosureByTenant(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const { data: row, error: loadError } = await supabase
      .from('maintenance_requests')
      .select(
        `
        id,
        status,
        requested_by,
        title,
        property:Property_Rentals!inner ( owner_id )
      `
      )
      .eq('id', id)
      .maybeSingle()

    if (loadError) throw loadError
    if (!row) return { success: false, error: '找不到此維修申請' }
    if ((row.requested_by as string) !== user.id) {
      return { success: false, error: '無權限操作此申請' }
    }
    if ((row.status as string) !== 'pending_tenant') {
      return { success: false, error: '此申請不在待確認結案狀態' }
    }

    const ownerId = (row.property as { owner_id: string }).owner_id

    const { error } = await supabase
      .from('maintenance_requests')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error

    await enqueueInAppNotification(
      supabase,
      ownerId,
      '租客已確認維修結案',
      `「${row.title as string}」已由租客確認結案；支出將在您下次開啟維修管理頁面時自動寫入收支流水（若已填寫費用）。`,
      { maintenance_request_id: id, event: 'maintenance_tenant_confirmed' }
    )

    revalidatePath('/landlord/maintenance')
    revalidatePath('/tenant/maintenance')
    return { success: true }
  } catch (error) {
    console.error('Error confirming maintenance closure:', error)
    return { success: false, error: '確認失敗，請重試' }
  }
}

/**
 * Landlord: close case immediately (skip tenant confirm). Writes rental_ledger when amount is known.
 * Allowed from `in_progress` or `pending_tenant`.
 */
export async function completeMaintenanceAsLandlord(
  id: string,
  input: Pick<UpdateMaintenanceInput, 'notes' | 'actualCost' | 'scheduledDate' | 'assignedToId' | 'estimatedCost'>
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
        requested_by,
        status,
        title,
        property_id,
        actual_cost,
        estimated_cost,
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

    const st = existing.status as string
    if (st !== 'in_progress' && st !== 'pending_tenant') {
      return { success: false, error: '僅能從「處理中」或「待租客確認」強制結案' }
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

    const patch: Record<string, unknown> = {
      status: 'completed',
      completed_date: new Date().toISOString(),
    }
    if (input.notes !== undefined) patch.notes = input.notes
    if (input.estimatedCost !== undefined) patch.estimated_cost = input.estimatedCost
    if (input.scheduledDate !== undefined) patch.scheduled_date = input.scheduledDate
    if (input.assignedToId !== undefined) patch.assigned_to = input.assignedToId
    if (input.actualCost !== undefined) patch.actual_cost = input.actualCost

    const { error } = await supabase.from('maintenance_requests').update(patch).eq('id', id)
    if (error) throw error

    const resolvedActual =
      input.actualCost !== undefined ? input.actualCost : (existing.actual_cost as number | null)
    const resolvedEst =
      input.estimatedCost !== undefined ? input.estimatedCost : (existing.estimated_cost as number | null)
    let expenseAmount = NaN
    if (resolvedActual != null && !Number.isNaN(Number(resolvedActual)) && Number(resolvedActual) > 0) {
      expenseAmount = Number(resolvedActual)
    } else if (resolvedEst != null && !Number.isNaN(Number(resolvedEst)) && Number(resolvedEst) > 0) {
      expenseAmount = Number(resolvedEst)
    }

    if (!Number.isNaN(expenseAmount) && expenseAmount > 0) {
      await ensureMaintenanceLedgerExpense(supabase, {
        landlordId: user.id,
        maintenanceId: id,
        propertyId: existing.property_id as string,
        tenantId: (existing.requested_by as string) ?? null,
        title: existing.title as string,
        amount: expenseAmount,
      })
    }

    await enqueueInAppNotification(
      supabase,
      existing.requested_by as string,
      '維修案件已結案',
      `「${existing.title as string}」已由房東標示結案。`,
      { maintenance_request_id: id, event: 'maintenance_closed' }
    )

    revalidatePath('/landlord/maintenance')
    revalidatePath('/tenant/maintenance')
    revalidatePath('/landlord/finance')
    return { success: true }
  } catch (error) {
    console.error('Error completing maintenance as landlord:', error)
    return { success: false, error: '結案失敗，請重試' }
  }
}

/** Backfills `rental_ledger` rows for completed requests (e.g. after tenant confirmed). Call from landlord maintenance UI. */
export async function syncMaintenanceExpenseLedgerForLandlord(): Promise<{ inserted: number }> {
  noStore()
  const supabase = await createClient()
  let inserted = 0

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { inserted: 0 }

    const { data: properties, error: pErr } = await supabase
      .from('Property_Rentals')
      .select('id')
      .eq('owner_id', user.id)
    if (pErr) throw pErr
    const propertyIds = (properties ?? []).map((p: { id: string }) => p.id)
    if (propertyIds.length === 0) return { inserted: 0 }

    const { data: rows, error: mErr } = await supabase
      .from('maintenance_requests')
      .select('id, property_id, requested_by, title, actual_cost, estimated_cost')
      .in('property_id', propertyIds)
      .eq('status', 'completed')

    if (mErr) throw mErr

    for (const r of rows ?? []) {
      const act = r.actual_cost != null ? Number(r.actual_cost) : NaN
      const est = r.estimated_cost != null ? Number(r.estimated_cost) : NaN
      const expenseAmount = !Number.isNaN(act) && act > 0 ? act : !Number.isNaN(est) && est > 0 ? est : NaN
      if (Number.isNaN(expenseAmount) || expenseAmount <= 0) continue

      const did = await ensureMaintenanceLedgerExpense(supabase, {
        landlordId: user.id,
        maintenanceId: r.id as string,
        propertyId: r.property_id as string,
        tenantId: (r.requested_by as string) ?? null,
        title: r.title as string,
        amount: expenseAmount,
      })
      if (did) inserted += 1
    }

    revalidatePath('/landlord/maintenance')
    revalidatePath('/landlord/finance')
    return { inserted }
  } catch (error) {
    console.error('syncMaintenanceExpenseLedgerForLandlord:', error)
    return { inserted: 0 }
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
