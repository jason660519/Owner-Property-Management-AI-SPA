// filepath: apps/superadmin/app/superadmin/settings/page.tsx
// created: 2026-02-17 | Blacklist UI for IP / User-Agent blocking

'use client';

import React from 'react';
import Link from 'next/link';
import { BookMarked, Images, FileText, Share2, RefreshCw, FlaskConical, HardDrive } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

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
            <Card variant="outlined" padding="lg" hoverable>
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

          <Link href="/superadmin/settings/property-rules" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Images size={16} />
                  物件上傳規則
                </CardTitle>
                <CardDescription>
                  設定每個物件最多可上傳的照片張數等上傳限制。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

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
          <Link href="/superadmin/settings/integrations" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 size={16} />
                  第三方平台整合
                </CardTitle>
                <CardDescription>
                  連結 Google Blogger、Facebook 粉絲頁，讓 AI 自動將物件部落格發布至外部平台，擴大曝光。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/superadmin/settings/lvr-sync" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw size={16} />
                  實價登錄資料同步
                </CardTitle>
                <CardDescription>
                  手動觸發內政部實價登錄 Open Data 同步，更新各縣市成交行情資料庫。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/superadmin/settings/evaluations-global-test" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical size={16} />
                  AI 模型全域評測
                </CardTitle>
                <CardDescription>
                  進入 AI 模型全域評測頁，集中上傳測試檔案、設定全域 Prompt，並比較各模型的回應品質與效能。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/superadmin/settings/backup" className="block">
            <Card variant="outlined" padding="lg" hoverable>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive size={16} />
                  資料備份管理
                </CardTitle>
                <CardDescription>
                  備份照片、文件 metadata，防止 supabase db reset 或 Docker 重置造成資料遺失。支援本地目錄、外接設備、手動下載。
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

      </div>
    </DashboardLayout>
  );
}
