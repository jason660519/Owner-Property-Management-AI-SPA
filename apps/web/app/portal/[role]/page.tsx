import { redirect } from 'next/navigation';
import { ROLE_METADATA } from '@/config/roles';
import { canonicalizeRole } from '@/lib/roles';

// Next.js 15+ / 16: params is a Promise – must be awaited
export default async function RoleRedirectPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role: param } = await params;

  // Accept either canonical key or common aliases in the URL (e.g. /portal/contracted_tenant)
  const canonical = canonicalizeRole(param) || param;

  const roleData = ROLE_METADATA.find(
    (r) => r.role === canonical || r.role === param,
  );

  if (roleData) {
    redirect(roleData.dashboardPath);
  }

  // fallback to portal
  redirect('/portal');
}
