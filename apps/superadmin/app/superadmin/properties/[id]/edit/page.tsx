// filepath: apps/superadmin/app/superadmin/properties/[id]/edit/page.tsx
// created: 2026-03-05 | creator: Claude
import { notFound } from 'next/navigation';
import { getPropertyById } from '@/lib/actions/properties';
import { getPropertyDocuments, getPropertyPhotos } from '@/lib/actions/properties';
import { PropertyEditForm } from '@/components/admin/properties/PropertyEditForm';
import { DashboardLayout } from '@/components/dashboard';
import { loadInvestigationReport } from '@/lib/actions/investigationReport';

export const dynamic = 'force-dynamic';

/** Server Actions (e.g. GIS map export polling ArcGIS) may exceed default limits on slow days */
export const maxDuration = 120;

const BASE = '/superadmin';

interface PropertyEditPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function PropertyEditPage({ params, searchParams }: PropertyEditPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const property = await getPropertyById(id);

  if (!property) {
    notFound();
  }

  const shouldPrefetchInvestigation = resolvedSearchParams?.tab === 'investigation';
  const propertyType = property.type === 'sale' ? 'sales' : 'rentals';

  const [{ data: initialInvestigationReport }, initialPhotos, initialDocuments] = shouldPrefetchInvestigation
    ? await Promise.all([
        loadInvestigationReport(id, propertyType),
        getPropertyPhotos(id),
        getPropertyDocuments(id),
      ])
    : [{ data: null }, undefined, undefined];

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
      <PropertyEditForm
        property={property}
        initialInvestigationReport={initialInvestigationReport}
        initialInvestigationPhotos={initialPhotos}
        initialInvestigationDocuments={initialDocuments}
      />
    </DashboardLayout>
  );
}
