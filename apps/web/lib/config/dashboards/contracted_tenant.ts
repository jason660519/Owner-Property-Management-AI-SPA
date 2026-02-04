/**
 * @file contracted_tenant.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Dashboard configuration for Contracted Tenant role
 */

import { FileText, DollarSign, Wrench, Bell } from 'lucide-react'
import type { DashboardConfig } from '@/components/dashboard'

/**
 * Contracted Tenant Dashboard Configuration
 *
 * For tenants who have signed a rental contract
 */
export const contractedTenantDashboardConfig: DashboardConfig = {
  role: 'contracted_tenant',
  pageTitle: '簽約租客儀表板',
  breadcrumbs: [
    { label: '首頁', href: '/' },
    { label: '租客專區', href: '/tenant' },
    { label: '簽約儀表板' },
  ],
  kpis: [
    {
      title: '當前租約狀態',
      value: '載入中...', // Will be replaced with real data
      icon: FileText,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '查看租約詳情',
          href: '/tenant/leases/current',
        },
        {
          label: '續約申請',
          href: '/tenant/leases/renew',
        },
      ],
    },
    {
      title: '繳款狀態',
      value: 'NT$ 0',
      icon: DollarSign,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看繳款記錄',
          href: '/tenant/payments',
        },
        {
          label: '立即繳款',
          href: '/tenant/payments/new',
        },
      ],
    },
    {
      title: '維修申請',
      value: 0,
      icon: Wrench,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '查看所有申請',
          href: '/tenant/maintenance',
        },
        {
          label: '提交新申請',
          href: '/tenant/maintenance/new',
        },
      ],
    },
    {
      title: '通知訊息',
      value: 0,
      icon: Bell,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看所有通知',
          href: '/tenant/notifications',
        },
      ],
    },
  ],
}
