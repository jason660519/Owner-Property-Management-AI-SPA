// filepath: apps/superadmin/app/superadmin/settings/page.tsx
// created: 2026-02-17 | Blacklist UI for IP / User-Agent blocking

'use client';

import React from 'react';
import Link from 'next/link';
import { BookMarked, Settings } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

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
          <h1 className="text-2xl font-bold text-text-primary">Setting</h1>
          <p className="text-sm text-text-muted mt-1">
            系統全域設定與偏好
          </p>
        </div>

        {/* 黑名單設定入口（AI 服務 / API KEY 已移至側邊欄） */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Link href="/superadmin/settings/black_list" className="block">
            <Card
              variant="outlined"
              padding="lg"
              hoverable
            >
              <CardHeader>
                <CardTitle>黑名單設定</CardTitle>
                <CardDescription>
                  設定被封鎖的 IP / CIDR 與 User-Agent，防止惡意爬蟲與攻擊來源。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/superadmin/settings/prompt-management" className="block">
            <Card
              variant="outlined"
              padding="lg"
              hoverable
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked size={16} />
                  Prompt 管理
                </CardTitle>
                <CardDescription>
                  集中管理所有已儲存的 Prompt 模板，可供各功能頁面快速新增、編輯與載入。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
}
