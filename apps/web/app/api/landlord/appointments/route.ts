
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || ''
  const status = searchParams.get('status')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Since property_id in viewing_appointments_tenant might not be a FK to property_rentals,
  // we will fetch appointments first, then fetch property details.
  // Note: For efficient search on property title, we might need to join, but if no FK, we can't easily.
  // We will filter by property title on the client side or fetch properties first if needed.
  // For now, let's just fetch appointments and join property details manually.

  let dbQuery = supabase
    .from('viewing_appointments_tenant')
    .select('*')
    .eq('landlord_id', user.id)
    .order('preferred_date', { ascending: true })
    .order('preferred_time', { ascending: true })

  if (status && status !== 'all') {
    dbQuery = dbQuery.eq('status', status)
  }

  if (startDate) {
    dbQuery = dbQuery.gte('preferred_date', startDate)
  }
  
  if (endDate) {
    dbQuery = dbQuery.lte('preferred_date', endDate)
  }

  if (query) {
    // Search visitor name or phone
    dbQuery = dbQuery.or(`visitor_name.ilike.%${query}%,visitor_phone.ilike.%${query}%`)
  }

  const { data: appointments, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch property details for each appointment
  // We collect all property_ids
  const propertyIds = Array.from(new Set(appointments.map(a => a.property_id)))
  
  let propertiesMap: Record<string, any> = {}
  
  if (propertyIds.length > 0) {
    // Try property_rentals first
    const { data: rentals } = await supabase
      .from('property_rentals')
      .select('id, title, address')
      .in('id', propertyIds)
    
    if (rentals) {
      rentals.forEach(p => propertiesMap[p.id] = p)
    }

    // Also try property_sales just in case
    const { data: sales } = await supabase
        .from('property_sales')
        .select('id, title, address')
        .in('id', propertyIds)

    if (sales) {
        sales.forEach(p => propertiesMap[p.id] = p)
    }
  }

  // Combine data
  const enrichedAppointments = appointments.map(app => ({
    ...app,
    property: propertiesMap[app.property_id] || { title: 'Unknown Property', address: '' }
  }))
  
  return NextResponse.json(enrichedAppointments)
}
