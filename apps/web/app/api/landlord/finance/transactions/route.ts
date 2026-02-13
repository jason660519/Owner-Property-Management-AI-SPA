
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || ''
  const type = searchParams.get('type')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get Property IDs owned by user to filter ledger
  const { data: properties } = await supabase
    .from('property_rentals')
    .select('id, title')
    .eq('owner_id', user.id)

  const propertyIds = properties?.map(p => p.id) || []
  const propertyMap = properties?.reduce((acc, p) => ({ ...acc, [p.id]: p.title }), {} as Record<string, string>) || {}

  if (propertyIds.length === 0) {
      return NextResponse.json([])
  }

  let dbQuery = supabase
    .from('rental_ledger')
    .select('*')
    .in('property_id', propertyIds)
    .order('transaction_date', { ascending: false })

  if (type && type !== 'all') {
    dbQuery = dbQuery.eq('transaction_type', type)
  }

  if (startDate) dbQuery = dbQuery.gte('transaction_date', startDate)
  if (endDate) dbQuery = dbQuery.lte('transaction_date', endDate)
  
  if (query) {
    dbQuery = dbQuery.ilike('description', `%${query}%`)
  }

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with property title
  const enrichedData = data.map(item => ({
      ...item,
      property_title: propertyMap[item.property_id] || 'Unknown Property'
  }))
  
  return NextResponse.json(enrichedData)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { 
      property_id, 
      transaction_date, 
      transaction_type, 
      amount, 
      description,
      payment_method 
  } = body

  if (!property_id || !transaction_date || !transaction_type || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('rental_ledger')
    .insert({
      property_id,
      transaction_date,
      transaction_type,
      amount,
      description,
      payment_method,
      created_by: user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json(data)
}
