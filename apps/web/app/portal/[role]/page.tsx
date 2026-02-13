import { redirect } from 'next/navigation';
import { ROLE_METADATA } from '@/components/dashboard/RoleSwitcher';

export default function RoleRedirectPage({ params }: { params: { role: string } }) {
  const roleData = ROLE_METADATA.find(r => r.role === params.role);
  
  if (roleData) {
    redirect(roleData.dashboardPath);
  }
  
  redirect('/portal');
}
