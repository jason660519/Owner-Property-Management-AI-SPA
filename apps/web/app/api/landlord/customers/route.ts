
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || ''
  const status = searchParams.get('status')
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let dbQuery = supabase
    .from('landlord_customers')
    .select('*')
    .eq('landlord_id', user.id)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })

  if (query) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
  }
  
  if (status && status !== 'all') {
    dbQuery = dbQuery.eq('status', status)
  }

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json() as { orders: { id: string; priority: number }[] }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!Array.isArray(body.orders)) {
    return NextResponse.json({ error: 'orders must be an array' }, { status: 400 })
  }

  const updates = body.orders.map(({ id, priority }) =>
    supabase
      .from('landlord_customers')
      .update({ priority })
      .eq('id', id)
      .eq('landlord_id', user.id)
  )

  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone, email, status, emergency_contact, notes } = body

  if (!name || !phone || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const phoneNorm = String(phone).replace(/[\s-]/g, '')

  const { data: dupByPhone } = await supabase
    .from('landlord_customers')
    .select('id')
    .eq('landlord_id', user.id)
    .eq('phone', phoneNorm)
    .maybeSingle()

  const emailTrim = String(email).trim()

  const { data: dupByEmail } = await supabase
    .from('landlord_customers')
    .select('id')
    .eq('landlord_id', user.id)
    .ilike('email', emailTrim)
    .maybeSingle()

  if (dupByPhone || dupByEmail) {
    return NextResponse.json(
      { error: '此電話或 Email 已存在於您的客戶名單' },
      { status: 409 },
    )
  }

  const { data, error } = await supabase
    .from('landlord_customers')
    .insert({
      landlord_id: user.id,
      name,
      phone: phoneNorm,
      email: emailTrim,
      status: status || 'potential',
      emergency_contact,
      notes
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json(data)
}
