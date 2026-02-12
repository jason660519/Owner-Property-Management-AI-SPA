'use client';

import { DashboardLayout } from '@/components/dashboard';

export default function LeasesPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="租約管理"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '租約管理' },
      ]}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">租約管理</h1>
        <p>此功能正在開發中...</p>
      </div>
    </DashboardLayout>
  );
}
