/**
 * @file potential_buyer.ts
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Dashboard configuration for Potential Buyer role
 */

import { Heart, Calendar, Tag, Calculator } from 'lucide-react'
import type { DashboardConfig } from '@/components/dashboard'

/**
 * Potential Buyer Dashboard Configuration
 *
 * For users looking for properties to purchase (not yet signed contract)
 */
export const potentialBuyerDashboardConfig: DashboardConfig = {
  role: 'potential_buyer',
  pageTitle: '潛在買家儀表板',
  breadcrumbs: [
    { label: '首頁', href: '/' },
    { label: '買家專區', href: '/buyer' },
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
          href: '/buyer/favorites',
        },
        {
          label: '繼續瀏覽物件',
          href: '/properties',
          query: { type: 'sale' },
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
          href: '/buyer/viewings',
        },
        {
          label: '預約看房',
          href: '/properties',
          query: { type: 'sale' },
        },
      ],
    },
    {
      title: '出價記錄',
      value: 0,
      icon: Tag,
      color: 'text-green-500',
      progressLinks: [
        {
          label: '查看出價記錄',
          href: '/buyer/offers',
        },
        {
          label: '提交新出價',
          href: '/properties',
          query: { type: 'sale' },
        },
      ],
    },
    {
      title: '購屋評估',
      value: '未設定',
      icon: Calculator,
      color: 'text-purple-500',
      progressLinks: [
        {
          label: '更新預算',
          href: '/buyer/budget',
        },
        {
          label: '貸款試算',
          href: '/buyer/loan-calculator',
        },
      ],
    },
  ],
}
