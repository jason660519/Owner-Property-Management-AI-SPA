import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function SuperadminRootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const role = user.user_metadata?.role;
  if (role !== 'super_admin') {
    redirect('/login?reason=insufficient_role');
  }

  redirect('/superadmin/dashboard');
}
