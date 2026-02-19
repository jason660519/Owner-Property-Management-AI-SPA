import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface MeProfileResponse {
  userId: string
  email?: string
  full_name?: string
  avatar_url?: string
  primary_role?: string
  roles: string[]
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json(null, { status: 401 })

  const { data: profile } = await supabase
    .from('users_profile')
    .select('full_name, avatar_url, primary_role, roles')
    .eq('id', user.id)
    .single()

  const roles: string[] =
    profile?.roles ||
    user.app_metadata?.roles ||
    user.user_metadata?.roles ||
    []

  const body: MeProfileResponse = {
    userId: user.id,
    email: user.email,
    full_name: profile?.full_name,
    avatar_url: profile?.avatar_url,
    primary_role: profile?.primary_role,
    roles,
  }

  return NextResponse.json(body)
}
