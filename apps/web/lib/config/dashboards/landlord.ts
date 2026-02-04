/**
 * @file landlord.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Dashboard configuration for Landlord role
 */

import { Home, DollarSign, TrendingUp, FileText } from 'lucide-react'
import type { DashboardConfig } from '@/components/dashboard'

/**
 * Landlord Dashboard Configuration
 *
 * Defines KPIs, breadcrumbs, and metadata for the landlord dashboard
 */
export const landlordDashboardConfig: DashboardConfig = {
  role: 'landlord',
  pageTitle: '房東儀表板',
  breadcrumbs: [
    { label: '首頁', href: '/' },
    { label: '房東專區', href: '/landlord' },
    { label: '儀表板' },
  ],
  kpis: [
    {
      title: '總物件數',
      value: 0, // Will be replaced with real data
      icon: Home,
      color: 'text-blue-500',
      trend: {
        value: 0,
        direction: 'up',
        label: '較上月',
      },
      progressLinks: [
        {
          label: '查看所有物件',
          href: '/landlord/properties',
        },
        {
          label: '新增物件',
          href: '/landlord/properties/add',
        },
      ],
    },
    {
      title: '出租率',
      value: '0%',
      icon: TrendingUp,
      color: 'text-green-500',
      trend: {
        value: 0,
        direction: 'up',
        label: '較上月',
      },
      progressLinks: [
        {
          label: '查看出租物件',
          href: '/landlord/properties',
          query: { status: 'rented' },
        },
        {
          label: '查看空置物件',
          href: '/landlord/properties',
          query: { status: 'vacant' },
        },
      ],
    },
    {
      title: '本月收入',
      value: 'NT$ 0',
      icon: DollarSign,
      color: 'text-yellow-500',
      progressLinks: [
        {
          label: '查看收入明細',
          href: '/landlord/finance/income',
        },
        {
          label: '查看待收款項',
          href: '/landlord/finance/receivables',
        },
      ],
    },
    {
      title: '年度收入',
      value: 'NT$ 0',
      icon: FileText,
      color: 'text-purple-500',
      trend: {
        value: 0,
        direction: 'up',
        label: '較去年',
      },
      progressLinks: [
        {
          label: '年度報表',
          href: '/landlord/finance/annual-report',
        },
        {
          label: '匯出財務報告',
          href: '/landlord/finance/export',
        },
      ],
    },
  ],
}
