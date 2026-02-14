import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'http://localhost:3000';

export default async function SuperadminRootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${MAIN_SITE_URL}/login`);
  }

  const { data: roleRows } = await supabase.rpc('get_user_roles', {
    lookup_user_id: user.id,
  });
  const roles = Array.isArray(roleRows)
    ? roleRows.map((r: { role_name: string }) => r.role_name)
    : [];
  const isSuperAdmin =
    roles.includes('super_admin') || user.user_metadata?.role === 'super_admin';

  if (!isSuperAdmin) {
    redirect(`${MAIN_SITE_URL}/login?reason=insufficient_role`);
  }

  redirect('/superadmin/dashboard');
}
