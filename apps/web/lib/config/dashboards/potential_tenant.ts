/**
 * @file potential_tenant.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Dashboard configuration for Potential Tenant role
 */

import { Heart, Calendar, Target, FileCheck } from 'lucide-react'
import type { DashboardConfig } from '@/components/dashboard'

/**
 * Potential Tenant Dashboard Configuration
 *
 * For users looking for rental properties (not yet signed contract)
 */
export const potentialTenantDashboardConfig: DashboardConfig = {
  role: 'potential_tenant',
  pageTitle: '潛在租客儀表板',
  breadcrumbs: [
    { label: '首頁', href: '/' },
    { label: '租客專區', href: '/tenant' },
    { label: '潛在儀表板' },
  ],
  kpis: [
    {
      title: '收藏物件',
      value: 0,
      icon: Heart,
      color: 'text-pink-500',
      progressLinks: [
        {
          label: '查看所有收藏',
          href: '/tenant/favorites',
        },
        {
          label: '繼續瀏覽物件',
          href: '/properties',
          query: { type: 'rental' },
        },
      ],
    },
    {
      title: '看房預約',
      value: 0,
      icon: Calendar,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '管理預約',
          href: '/tenant/viewings',
        },
        {
          label: '預約看房',
          href: '/properties',
          query: { type: 'rental' },
        },
      ],
    },
    {
      title: '租屋評估',
      value: '未設定',
      icon: Target,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '更新預算',
          href: '/tenant/budget',
        },
        {
          label: '查看推薦物件',
          href: '/tenant/recommendations',
        },
      ],
    },
    {
      title: '申請進度',
      value: 0,
      icon: FileCheck,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看申請',
          href: '/tenant/applications',
        },
        {
          label: '提交新申請',
          href: '/properties',
          query: { type: 'rental' },
        },
      ],
    },
  ],
}
