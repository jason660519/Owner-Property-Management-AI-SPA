'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'
import {
  sendApplicationSubmittedToLandlord,
  sendApplicationApprovedToTenant,
  sendApplicationRejectedToTenant,
} from '@/lib/email'

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn'

export interface RentalApplication {
  id: string
  propertyId: string
  propertyTitle: string
  propertyAddress: string
  propertyImage: string
  landlordId: string
  applicantId: string
  offerAmount: number
  leaseTermMonths: number
  desiredMoveIn: string | null
  applicantName: string
  applicantPhone: string | null
  applicantEmail: string | null
  employmentStatus: string | null
  monthlyIncome: number | null
  occupantsCount: number
  hasPets: boolean
  additionalNotes: string | null
  status: ApplicationStatus
  rejectionReason: string | null
  reviewedAt: string | null
  submittedAt: string | null
  createdAt: string
}

export interface CreateApplicationInput {
  propertyId: string
  landlordId: string
  offerAmount: number
  leaseTermMonths: number
  desiredMoveIn?: string
  applicantName: string
  applicantPhone?: string
  applicantEmail?: string
  employmentStatus?: string
  monthlyIncome?: number
  occupantsCount?: number
  hasPets?: boolean
  additionalNotes?: string
}

// Map raw DB row to RentalApplication
function mapRow(r: Record<string, unknown>): RentalApplication {
  const property = r.property as Record<string, unknown> | null
  const photos = property?.Property_Photos as Array<Record<string, unknown>> | undefined
  const primaryPhoto = photos?.find((p) => p.is_primary) ?? photos?.[0]
  const image = primaryPhoto
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${primaryPhoto.storage_path}`
    : ''

  return {
    id: r.id as string,
    propertyId: r.property_id as string,
    propertyTitle: (property?.address as string) || '',
    propertyAddress: (property?.address as string) || '',
    propertyImage: image,
    landlordId: r.landlord_id as string,
    applicantId: r.applicant_id as string,
    offerAmount: r.offer_amount as number,
    leaseTermMonths: r.lease_term_months as number,
    desiredMoveIn: (r.desired_move_in as string) ?? null,
    applicantName: r.applicant_name as string,
    applicantPhone: (r.applicant_phone as string) ?? null,
    applicantEmail: (r.applicant_email as string) ?? null,
    employmentStatus: (r.employment_status as string) ?? null,
    monthlyIncome: (r.monthly_income as number) ?? null,
    occupantsCount: (r.occupants_count as number) ?? 1,
    hasPets: (r.has_pets as boolean) ?? false,
    additionalNotes: (r.additional_notes as string) ?? null,
    status: r.status as ApplicationStatus,
    rejectionReason: (r.rejection_reason as string) ?? null,
    reviewedAt: (r.reviewed_at as string) ?? null,
    submittedAt: (r.submitted_at as string) ?? null,
    createdAt: r.created_at as string,
  }
}

const PROPERTY_SELECT = `
  property:Property_Rentals!property_id (
    address,
    Property_Photos ( storage_path, is_primary )
  )
`

// Tenant: list their own applications
export async function getMyApplications(): Promise<RentalApplication[]> {
  noStore()
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('rental_applications')
      .select(`*, ${PROPERTY_SELECT}`)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  } catch (error) {
    console.error('Error fetching applications:', error)
    return []
  }
}

// Tenant: create a new application (saved as draft)
export async function createApplication(
  input: CreateApplicationInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const { data, error } = await supabase
      .from('rental_applications')
      .insert({
        property_id: input.propertyId,
        landlord_id: input.landlordId,
        applicant_id: user.id,
        offer_amount: input.offerAmount,
        lease_term_months: input.leaseTermMonths,
        desired_move_in: input.desiredMoveIn ?? null,
        applicant_name: input.applicantName,
        applicant_phone: input.applicantPhone ?? null,
        applicant_email: input.applicantEmail ?? null,
        employment_status: input.employmentStatus ?? null,
        monthly_income: input.monthlyIncome ?? null,
        occupants_count: input.occupantsCount ?? 1,
        has_pets: input.hasPets ?? false,
        additional_notes: input.additionalNotes ?? null,
        status: 'draft',
      })
      .select('id')
      .single()

    if (error) throw error

    revalidatePath('/tenant/potential/applications')
    return { success: true, id: (data as Record<string, unknown>).id as string }
  } catch (error) {
    console.error('Error creating application:', error)
    return { success: false, error: '建立失敗，請重試' }
  }
}

// Tenant: submit a draft application (changes status to 'submitted') + notify landlord
export async function submitApplication(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    // Fetch application details for email
    const { data: app } = await supabase
      .from('rental_applications')
      .select(`
        landlord_id, offer_amount, lease_term_months, desired_move_in,
        applicant_name,
        property:Property_Rentals!property_id ( address )
      `)
      .eq('id', id)
      .eq('applicant_id', user.id)
      .eq('status', 'draft')
      .single()

    const { error } = await supabase
      .from('rental_applications')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('applicant_id', user.id)
      .eq('status', 'draft')

    if (error) throw error

    // Send email notification to landlord (fire-and-forget)
    if (app) {
      const row = app as Record<string, unknown>
      const { data: landlordAuth } = await adminClient.auth.admin.getUserById(
        row.landlord_id as string
      )
      const landlordEmail = landlordAuth?.user?.email
      if (landlordEmail) {
        const property = row.property as Record<string, unknown> | null
        sendApplicationSubmittedToLandlord({
          landlordEmail,
          landlordName: '房東',
          tenantName: (row.applicant_name as string) || user.email || '申請人',
          propertyAddress: (property?.address as string) || '',
          offerAmount: row.offer_amount as number,
          leaseTermMonths: row.lease_term_months as number,
          desiredMoveIn: (row.desired_move_in as string) ?? undefined,
          applicationId: id,
        }).catch(() => {/* non-blocking */})
      }
    }

    revalidatePath('/tenant/potential/applications')
    return { success: true }
  } catch (error) {
    console.error('Error submitting application:', error)
    return { success: false, error: '送出失敗，請重試' }
  }
}

// Tenant: withdraw a submitted application
export async function withdrawApplication(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const { error } = await supabase
      .from('rental_applications')
      .update({ status: 'withdrawn' })
      .eq('id', id)
      .eq('applicant_id', user.id)
      .in('status', ['submitted', 'under_review'])

    if (error) throw error

    revalidatePath('/tenant/potential/applications')
    return { success: true }
  } catch (error) {
    console.error('Error withdrawing application:', error)
    return { success: false, error: '撤回失敗，請重試' }
  }
}

// Landlord: list applications for their properties
export async function getLandlordApplications(): Promise<RentalApplication[]> {
  noStore()
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('rental_applications')
      .select(`*, ${PROPERTY_SELECT}`)
      .eq('landlord_id', user.id)
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
  } catch (error) {
    console.error('Error fetching landlord applications:', error)
    return []
  }
}

// Landlord: approve or reject an application + notify tenant
export async function reviewApplication(
  id: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    // Fetch application + profile for email
    const { data: landlordProfile } = await supabase
      .from('users_profile')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const { data: app } = await supabase
      .from('rental_applications')
      .select(`
        applicant_id, applicant_name, offer_amount,
        property:Property_Rentals!property_id ( address )
      `)
      .eq('id', id)
      .eq('landlord_id', user.id)
      .single()

    const { error } = await supabase
      .from('rental_applications')
      .update({
        status: decision,
        rejection_reason: rejectionReason ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', id)
      .eq('landlord_id', user.id)

    if (error) throw error

    // Send email notification to tenant (fire-and-forget)
    if (app) {
      const row = app as Record<string, unknown>
      const { data: tenantAuth } = await adminClient.auth.admin.getUserById(
        row.applicant_id as string
      )
      const tenantEmail = tenantAuth?.user?.email
      if (tenantEmail) {
        const property = row.property as Record<string, unknown> | null
        const landlordName =
          (landlordProfile as Record<string, unknown> | null)?.full_name as string || '房東'
        if (decision === 'approved') {
          sendApplicationApprovedToTenant({
            tenantEmail,
            tenantName: (row.applicant_name as string) || '申請人',
            landlordName,
            propertyAddress: (property?.address as string) || '',
            offerAmount: row.offer_amount as number,
          }).catch(() => {/* non-blocking */})
        } else {
          sendApplicationRejectedToTenant({
            tenantEmail,
            tenantName: (row.applicant_name as string) || '申請人',
            propertyAddress: (property?.address as string) || '',
            rejectionReason,
          }).catch(() => {/* non-blocking */})
        }
      }
    }

    revalidatePath('/landlord/applications')
    revalidatePath('/tenant/potential/applications')
    return { success: true }
  } catch (error) {
    console.error('Error reviewing application:', error)
    return { success: false, error: '審核失敗，請重試' }
  }
}

// Tenant: get a single application by ID (for edit page)
export async function getApplicationById(
  id: string
): Promise<RentalApplication | null> {
  noStore()
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('rental_applications')
      .select(`*, ${PROPERTY_SELECT}`)
      .eq('id', id)
      .or(`applicant_id.eq.${user.id},landlord_id.eq.${user.id}`)
      .single()

    if (error || !data) return null
    return mapRow(data as Record<string, unknown>)
  } catch (error) {
    console.error('Error fetching application by id:', error)
    return null
  }
}

export interface UpdateApplicationInput {
  offerAmount?: number
  leaseTermMonths?: number
  desiredMoveIn?: string
  applicantName?: string
  applicantPhone?: string
  applicantEmail?: string
  employmentStatus?: string
  monthlyIncome?: number
  occupantsCount?: number
  hasPets?: boolean
  additionalNotes?: string
}

// Tenant: update a draft application
export async function updateApplicationDraft(
  id: string,
  input: UpdateApplicationInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: '請先登入' }

    const patch: Record<string, unknown> = {}
    if (input.offerAmount !== undefined) patch.offer_amount = input.offerAmount
    if (input.leaseTermMonths !== undefined) patch.lease_term_months = input.leaseTermMonths
    if (input.desiredMoveIn !== undefined) patch.desired_move_in = input.desiredMoveIn
    if (input.applicantName !== undefined) patch.applicant_name = input.applicantName
    if (input.applicantPhone !== undefined) patch.applicant_phone = input.applicantPhone
    if (input.applicantEmail !== undefined) patch.applicant_email = input.applicantEmail
    if (input.employmentStatus !== undefined) patch.employment_status = input.employmentStatus
    if (input.monthlyIncome !== undefined) patch.monthly_income = input.monthlyIncome
    if (input.occupantsCount !== undefined) patch.occupants_count = input.occupantsCount
    if (input.hasPets !== undefined) patch.has_pets = input.hasPets
    if (input.additionalNotes !== undefined) patch.additional_notes = input.additionalNotes

    const { error } = await supabase
      .from('rental_applications')
      .update(patch)
      .eq('id', id)
      .eq('applicant_id', user.id)
      .eq('status', 'draft')

    if (error) throw error

    revalidatePath(`/tenant/potential/applications/${id}/edit`)
    revalidatePath('/tenant/potential/applications')
    return { success: true }
  } catch (error) {
    console.error('Error updating application draft:', error)
    return { success: false, error: '儲存失敗，請重試' }
  }
}
