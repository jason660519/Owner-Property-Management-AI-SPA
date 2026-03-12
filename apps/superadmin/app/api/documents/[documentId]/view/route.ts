// 謄本／物件文件檢視：僅建立者或經授權者（含 super_admin）可取得短期 signed URL，外人持連結無法存取。
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const SIGNED_URL_EXPIRES_SEC = 3600; // 1 小時

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await context.params;
  if (!documentId) {
    return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: doc, error: docError } = await admin
    .from('property_documents')
    .select('id, file_path, owner_id, property_id')
    .eq('id', documentId)
    .eq('is_active', true)
    .maybeSingle();

  if (docError || !doc?.file_path) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // 權限：本人 / super_admin / 授權仲介
  const isOwner = user.id === doc.owner_id;
  if (isOwner) {
    return redirectToSignedUrl(admin, doc.file_path);
  }

  const { data: roleRows } = await supabase.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });
  const roles = Array.isArray(roleRows)
    ? roleRows.map((r: { role_name: string }) => r.role_name)
    : [];
  const isSuperAdmin =
    roles.includes('super_admin') || user.user_metadata?.role === 'super_admin';
  if (isSuperAdmin) {
    return redirectToSignedUrl(admin, doc.file_path);
  }

  const { data: authorized } = await supabase.rpc('is_owner_or_authorized_agent', {
    p_user_id: user.id,
    p_landlord_id: doc.owner_id,
    p_property_id: doc.property_id,
  });
  if (authorized === true) {
    return redirectToSignedUrl(admin, doc.file_path);
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function redirectToSignedUrl(
  admin: ReturnType<typeof createAdminClient>,
  filePath: string
) {
  const { data, error } = await admin.storage
    .from('property-documents')
    .createSignedUrl(filePath, SIGNED_URL_EXPIRES_SEC);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: 'Failed to generate view URL' },
      { status: 500 }
    );
  }
  return NextResponse.redirect(data.signedUrl, 302);
}
