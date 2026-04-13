import { DashboardLayout } from '@/components/dashboard';
import PaperclipDashboardTabs from './PaperclipDashboardTabs';

export const dynamic = 'force-dynamic';

export default function PaperclipWorktreesPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="Paperclip Mission Control"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: 'Paperclip Mission Control' },
      ]}
    >
      <PaperclipDashboardTabs />
    </DashboardLayout>
  );
}
