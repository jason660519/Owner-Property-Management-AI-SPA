// filepath: apps/superadmin/app/superadmin/properties/page.tsx
// created: 2026-02-14 | creator: Claude Opus 4.6
import { getAllProperties, getOwnersList } from '@/lib/actions/properties';
import { PropertiesList } from '@/components/admin/properties/PropertiesList';
import { DashboardLayout } from '@/components/dashboard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const BASE = '/superadmin';

export default async function SuperadminPropertiesPage() {
  const [data, owners] = await Promise.all([getAllProperties(), getOwnersList()]);

  return (
    <DashboardLayout
      currentRole="superadmin"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: BASE },
        { label: '物件管理' },
      ]}
    >
      <PropertiesList data={data} owners={owners} />
      <div className="mt-6">
        <Link href={BASE} className="text-[#7C3AED] hover:underline text-sm">
          ← 返回儀表板
        </Link>
      </div>
    </DashboardLayout>
  );
}
