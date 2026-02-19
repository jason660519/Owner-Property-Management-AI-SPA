import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data, error } = await supabase
    .from('property_rentals')
    .select('id, title')
    .eq('owner_id', user.id)
    .order('title')

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data ?? [])
}
