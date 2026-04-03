// filepath: apps/superadmin/app/superadmin/properties/[id]/edit/page.tsx
// created: 2026-03-05 | creator: Claude
import { notFound } from 'next/navigation';
import { getPropertyById } from '@/lib/actions/properties';
import { PropertyEditForm } from '@/components/admin/properties/PropertyEditForm';
import { DashboardLayout } from '@/components/dashboard';

export const dynamic = 'force-dynamic';

/** Server Actions (e.g. GIS map export polling ArcGIS) may exceed default limits on slow days */
export const maxDuration = 120;

const BASE = '/superadmin';

interface PropertyEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyEditPage({ params }: PropertyEditPageProps) {
  const { id } = await params;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  return (
    <DashboardLayout
      currentRole="superadmin"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: BASE },
        { label: '物件管理', href: `${BASE}/properties` },
        { label: property.title ?? '編輯物件' },
      ]}
      contentFullHeight
    >
      <PropertyEditForm property={property} />
    </DashboardLayout>
  );
}
