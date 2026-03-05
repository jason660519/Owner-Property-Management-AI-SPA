'use client';

import { DashboardLayout } from '@/components/dashboard';

export default function ContractsPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="合約管理 (Contracts Management)"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '合約管理' },
      ]}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">合約管理 (Contracts Management)</h1>
        <p>此功能正在開發中...</p>
      </div>
    </DashboardLayout>
  );
}
