/**
 * @file AdminDashboardClient.tsx
 * @description Client component for Superadmin Dashboard
 */

'use client'

import { Users, Home, Key, FileText, Settings, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Link from 'next/link'
import {
  DashboardLayout,
  StatsGrid,
  type KPIConfig,
  type KPILoadingState,
} from '@/components/dashboard'
import type { AdminStats } from '@/lib/actions/dashboard'

interface AdminDashboardClientProps {
  stats: AdminStats
}

export default function AdminDashboardClient({ stats }: AdminDashboardClientProps) {
  // KPI configurations
  const kpis: KPIConfig[] = [
    {
      title: '總用戶數',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '管理用戶',
          href: '/admin/users',
        },
        {
          label: '群組管理',
          href: '/admin/groups',
        },
      ],
    },
    {
      title: '總物件數',
      value: stats.totalProperties,
      icon: Home,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看所有物件',
          href: '/admin/properties', // Assuming admin has this route, or link to landlord view
        },
      ],
    },
    {
      title: '活躍租賃',
      value: stats.activeRentals,
      icon: Key,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看租約',
          href: '/admin/leases',
        },
      ],
    },
    {
      title: '系統待辦',
      value: stats.pendingVerifications,
      icon: Shield,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '審核申請',
          href: '/admin/verifications',
          badge: stats.pendingVerifications > 0 ? {
            count: stats.pendingVerifications,
            variant: 'warning',
          } : undefined,
        },
      ],
    },
  ]

  const kpiLoadingStates: KPILoadingState[] = kpis.map(() => ({
    isLoading: false,
    isEmpty: false,
  }))

  return (
    <DashboardLayout
      currentRole="super_admin"
      pageTitle="系統管理儀表板"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '管理後台', href: '/admin' },
        { label: '儀表板' },
      ]}
      greeting="歡迎回來，系統管理員"
      headerActions={
        <Link href="/admin/settings">
          <Button variant="outline">
            <Settings className="w-5 h-5 mr-2" />
            系統設定
          </Button>
        </Link>
      }
    >
      {/* KPI Stats Grid */}
      <StatsGrid kpis={kpis} loading={kpiLoadingStates} columns={4} className="mb-8" />

      {/* Quick Actions & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">用戶管理</h4>
                <p className="text-sm text-[#999999]">管理系統用戶與權限</p>
              </div>
            </Link>

            <Link
              href="/admin/groups"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h4 className="text-white font-medium">權限群組</h4>
                <p className="text-sm text-[#999999]">設定角色與存取控制</p>
              </div>
            </Link>
            
            <Link
                href="/admin/logs"
                className="flex items-center gap-3 p-4 rounded-lg border border-[#333333] hover:border-[#7C3AED] hover:bg-[#7C3AED]/5 transition-colors group"
            >
                <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/20">
                    <FileText className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                    <h4 className="text-white font-medium">系統日誌</h4>
                    <p className="text-sm text-[#999999]">查看操作記錄與錯誤</p>
                </div>
            </Link>
          </CardContent>
        </Card>

        {/* System Status (Mocked for now) */}
        <Card>
          <CardHeader>
            <CardTitle>系統狀態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-[#999999]">API 狀態</span>
                <span className="text-sm font-medium text-green-500">正常運作</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-[#999999]">資料庫連線</span>
                <span className="text-sm font-medium text-green-500">已連線</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-[#999999]">儲存空間使用量</span>
                <span className="text-sm font-medium text-white">45.2 GB / 1 TB</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg">
                <span className="text-sm text-[#999999]">系統版本</span>
                <span className="text-sm font-medium text-white">v1.0.0-beta</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
