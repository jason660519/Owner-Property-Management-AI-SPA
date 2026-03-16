// filepath: apps/superadmin/app/superadmin/properties/add_new_property/page.tsx
import { DashboardLayout } from '@/components/dashboard';
import { PropertyCreatePageClient } from '@/components/admin/properties/PropertyCreatePageClient';

export const dynamic = 'force-dynamic';

const BASE = '/superadmin';

export default async function SuperadminAddNewPropertyPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: BASE },
        { label: '物件管理', href: `${BASE}/properties` },
        { label: '新增物件' },
      ]}
      contentFullHeight
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <PropertyCreatePageClient />
      </div>
    </DashboardLayout>
  );
}

