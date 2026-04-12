import { DashboardLayout } from '@/components/dashboard';
import PaperclipWorktreesClient from './PaperclipWorktreesClient';

export const dynamic = 'force-dynamic';

export default function PaperclipWorktreesPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="Paperclip Worktrees"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: 'Paperclip Worktrees' },
      ]}
    >
      <PaperclipWorktreesClient />
    </DashboardLayout>
  );
}
