import { getAllProperties } from '@/lib/actions/properties';
import { PropertiesMapPage } from '@/components/admin/properties/PropertiesMapPage';
import { DashboardLayout } from '@/components/dashboard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const BASE = '/superadmin';

export default async function SuperadminPropertiesMapPage() {
  const data = await getAllProperties();

  return (
    <DashboardLayout
      currentRole="superadmin"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: BASE },
        { label: '物件管理', href: `${BASE}/properties` },
        { label: '地圖檢視' },
      ]}
      contentFullHeight
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <PropertiesMapPage data={data} />
        <div className="shrink-0 px-1 py-3">
          <Link href={BASE} className="text-[#7C3AED] hover:underline text-sm">
            ← 返回儀表板
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
