import { getMyProperties } from '@/lib/actions/properties'
import { NextResponse } from 'next/server'

export async function GET() {
  const result = await getMyProperties()

  if (!result.success) {
    return NextResponse.json(result, { status: 500 })
  }

  return NextResponse.json(result)
}