'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';

export async function POST(req: NextRequest) {
  const authResult = await requireSuperadmin({
    request: req,
    allowHeaderFallback: false,
    routeLabel: 'api/documents/upload-condition-pdf',
  });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const propertyId = formData.get('propertyId') as string | null;

    if (!file || !propertyId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    const admin = createAdminClient();
    const dayStamp = new Date().toISOString().slice(0, 10);
    const storagePath = `${propertyId}/condition-statement-${dayStamp}-${Date.now()}.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from('property-documents')
      .upload(storagePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      });

    if (uploadError) {
      return NextResponse.json({ error: `上傳失敗：${uploadError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: storagePath });
  } catch (err) {
    return NextResponse.json(
      { error: `伺服器錯誤：${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
