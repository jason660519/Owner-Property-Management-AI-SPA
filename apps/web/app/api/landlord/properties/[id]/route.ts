import { updateMyPropertyStatus } from '@/lib/actions/properties'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = (await req.json()) as {
    propertyType?: 'sale' | 'rental'
    status?: string
  }
  const { id } = await params

  if (!body.propertyType || !body.status) {
    return NextResponse.json({ success: false, error: 'Missing propertyType or status' }, { status: 400 })
  }

  const result = await updateMyPropertyStatus(id, body.propertyType, body.status)

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json(result)
}