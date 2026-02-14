
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

  const updateData: any = {
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

  const { error } = await supabase
    .from('viewing_appointments_tenant')
    .update(updateData)
    .eq('id', id)
    .eq('landlord_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ success: true })
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
