/**
 * @file contracted_buyer.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Dashboard configuration for Contracted Buyer role
 */

import { ShoppingCart, DollarSign, CreditCard, FileCheck } from 'lucide-react'
import type { DashboardConfig } from '@/components/dashboard'

/**
 * Contracted Buyer Dashboard Configuration
 *
 * For buyers who have signed a purchase contract
 */
export const contractedBuyerDashboardConfig: DashboardConfig = {
  role: 'contracted_buyer',
  pageTitle: '簽約買家儀表板',
  breadcrumbs: [
    { label: '首頁', href: '/' },
    { label: '買家專區', href: '/buyer' },
    { label: '簽約儀表板' },
  ],
  kpis: [
    {
      title: '購買進度',
      value: '載入中...', // Will be replaced with real data
      icon: ShoppingCart,
      color: 'text-blue-500',
      progressLinks: [
        {
          label: '查看合約詳情',
          href: '/buyer/contracts/current',
        },
        {
          label: '查看物件資訊',
          href: '/buyer/properties/current',
        },
      ],
    },
    {
      title: '付款狀態',
      value: 'NT$ 0',
      icon: DollarSign,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看付款記錄',
          href: '/buyer/payments',
        },
        {
          label: '付款提醒設定',
          href: '/buyer/payments/reminders',
        },
      ],
    },
    {
      title: '貸款進度',
      value: '未申請',
      icon: CreditCard,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '查看貸款詳情',
          href: '/buyer/loans/current',
        },
        {
          label: '申請貸款',
          href: '/buyer/loans/apply',
        },
      ],
    },
    {
      title: '文件檢查清單',
      value: 0,
      icon: FileCheck,
      color: 'text-orange-500',
      progressLinks: [
        {
          label: '管理文件',
          href: '/buyer/documents',
        },
        {
          label: '上傳文件',
          href: '/buyer/documents/upload',
        },
      ],
    },
  ],
}
