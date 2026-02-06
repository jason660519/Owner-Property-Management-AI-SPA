'use client';

import { DashboardLayout } from '@/components/dashboard';

export default function VerificationsPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="審核申請"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '審核申請' },
      ]}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">審核申請</h1>
        <p>此功能正在開發中...</p>
      </div>
    </DashboardLayout>
  );
}
