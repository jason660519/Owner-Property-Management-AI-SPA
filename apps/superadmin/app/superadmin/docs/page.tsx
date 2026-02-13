import { DashboardLayout } from '@/components/dashboard';
import { DocsPage } from '@/components/docs';

export const dynamic = 'force-dynamic';

export default function SuperadminDocsPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="專案檔案"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '專案檔案' },
      ]}
    >
      <DocsPage />
    </DashboardLayout>
  );
}
