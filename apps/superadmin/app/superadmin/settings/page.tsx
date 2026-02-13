'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';

export default function SettingsPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="設定"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定' },
      ]}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">一般設定</h1>
          <p className="text-sm text-text-muted mt-1">
            系統全域設定與偏好
          </p>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-base p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-tertiary mb-4">
            <Settings className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">設定頁面建置中</h3>
          <p className="text-text-secondary max-w-md mx-auto">
            AI 服務設定已移動至專屬頁面。一般系統設定功能即將推出。
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
