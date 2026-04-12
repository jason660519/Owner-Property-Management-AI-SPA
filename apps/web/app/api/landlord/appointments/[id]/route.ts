
import { createClient } from '@/lib/supabase/server'
import { sendViewingAppointmentStatusEmail } from '@/lib/landlord/appointment-notifications'
import { NextRequest, NextResponse } from 'next/server'

type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

const VALID_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'completed', 'cancelled']

function isValidStatus(value: unknown): value is AppointmentStatus {
  return typeof value === 'string' && VALID_STATUSES.includes(value as AppointmentStatus)
}

async function resolvePropertySummary(supabase: Awaited<ReturnType<typeof createClient>>, propertyId: string) {
  const { data: rental } = await supabase
    .from('property_rentals')
    .select('id, title, address')
    .eq('id', propertyId)
    .single()

  if (rental) {
    return {
      title: rental.title ?? '房源',
      address: rental.address ?? '',
    }
  }

  const { data: sale } = await supabase
    .from('property_sales')
    .select('id, title, address')
    .eq('id', propertyId)
    .single()

  return {
    title: sale?.title ?? '房源',
    address: sale?.address ?? '',
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: appointment, error } = await supabase
    .from('viewing_appointments_tenant')
    .select('*')
    .eq('id', id)
    .eq('landlord_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch property details
  let property = null
  const { data: rental } = await supabase
    .from('property_rentals')
    .select('id, title, address, monthly_rent')
    .eq('id', appointment.property_id)
    .single()
  
  if (rental) {
    property = rental
  } else {
    const { data: sale } = await supabase
      .from('property_sales')
      .select('id, title, address, price')
      .eq('id', appointment.property_id)
      .single()
    if (sale) property = sale
  }

  return NextResponse.json({
    ...appointment,
    property: property || { title: 'Unknown Property', address: '' }
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await req.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status, preferred_date, preferred_time, feedback } = body

  if (status && !isValidStatus(status)) {
    return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
  }

  const { data: existingAppointment, error: existingError } = await supabase
    .from('viewing_appointments_tenant')
    .select('id, property_id, visitor_name, visitor_email, preferred_date, preferred_time, status')
    .eq('id', id)
    .eq('landlord_id', user.id)
    .single()

  if (existingError || !existingAppointment) {
    return NextResponse.json({ error: existingError?.message ?? 'Appointment not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (status) {
    updateData.status = status
    if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString()
    if (status === 'completed') updateData.completed_at = new Date().toISOString()
  }
  
  if (preferred_date) updateData.preferred_date = preferred_date
  if (preferred_time) updateData.preferred_time = preferred_time
  if (feedback) updateData.feedback = feedback

  const { data: updatedAppointment, error } = await supabase
    .from('viewing_appointments_tenant')
    .update(updateData)
    .select('id, property_id, visitor_name, visitor_email, preferred_date, preferred_time, status, feedback')
    .eq('id', id)
    .eq('landlord_id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let emailSent: boolean | null = null
  if (
    status &&
    existingAppointment.status !== status &&
    updatedAppointment?.visitor_email &&
    (status === 'confirmed' || status === 'cancelled' || status === 'completed')
  ) {
    const property = await resolvePropertySummary(supabase, updatedAppointment.property_id)
    emailSent = await sendViewingAppointmentStatusEmail({
      tenantEmail: updatedAppointment.visitor_email,
      tenantName: updatedAppointment.visitor_name ?? '租客',
      propertyTitle: property.title,
      propertyAddress: property.address,
      preferredDate: updatedAppointment.preferred_date,
      preferredTime: updatedAppointment.preferred_time,
      status,
      feedback: typeof feedback === 'string' ? feedback : null,
    })
  }

  return NextResponse.json({ success: true, emailSent })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Instead of hard delete, maybe just mark as cancelled?
  // User asked for "Cancel" operation, usually means update status to 'cancelled'.
  // But DELETE method usually means hard delete.
  // I'll implement soft delete (update status) via PUT, and hard delete via DELETE if needed.
  // But typically "Cancel" is a status change.
  // Let's support hard delete for cleanup.

  const { error } = await supabase
    .from('viewing_appointments_tenant')
    .delete()
    .eq('id', id)
    .eq('landlord_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ success: true })
}
