'use client';

import React from 'react';
import Link from 'next/link';
import { FileCog, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export default function ToolsPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="Tools"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: 'Tools' },
      ]}
    >
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Tools</h1>
          <p className="text-sm text-text-muted mt-1">
            集中管理資料處理工具與資料庫匯入流程
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link href="/superadmin/settings/fp-converter" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={16} />
                  FP 轉 PDF 功能
                </CardTitle>
                <CardDescription>
                  上傳 Windows FinePrint (.fp) 格式謄本，系統自動提取文字並輸出為 PDF 檔案，無需 Windows 環境。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Row 146: 尋人資料庫卡片移至 Sidebar 直連入口（避免雙跳）。
              新入口：/superadmin/settings/people-database?tab=search */}

          <Link href="/superadmin/tools/file-manager" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCog size={16} />
                  檔案整理與歸檔系統
                </CardTitle>
                <CardDescription>
                  以規則驅動掃描檔案合規性、產生整理計畫、執行歸檔/清理，並提供回滾機制確保資料安全。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
