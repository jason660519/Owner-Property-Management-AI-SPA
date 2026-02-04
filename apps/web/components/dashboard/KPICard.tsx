/**
 * @file KPICard.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Reusable KPI card component for dashboard metrics
 */

'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressLink } from './ProgressLink'
import type { KPIConfig, KPILoadingState } from './types'

interface KPICardProps {
  config: KPIConfig
  loading?: KPILoadingState
  className?: string
}

/**
 * KPICard Component
 *
 * Displays a single KPI metric with:
 * - Icon and title
 * - Main value
 * - Optional trend indicator
 * - Progress links for navigation
 * - Loading/error/empty states
 *
 * @example
 * <KPICard
 *   config={{
 *     title: "總物件數",
 *     value: 24,
 *     icon: Home,
 *     color: "text-blue-500",
 *     trend: { value: 12.5, direction: "up", label: "vs last month" },
 *     progressLinks: [
 *       { label: "查看所有物件", href: "/landlord/properties" }
 *     ]
 *   }}
 * />
 */
export function KPICard({ config, loading, className = '' }: KPICardProps) {
  const { title, value, icon: Icon, color, trend, progressLinks } = config

  // Loading state
  if (loading?.isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
        </div>
      </Card>
    )
  }

  // Error state
  if (loading?.error) {
    return (
      <Card className={`p-6 border-red-500 ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-sm text-red-500 mb-2">載入失敗</p>
          <p className="text-xs text-[#666666]">{loading.error}</p>
        </div>
      </Card>
    )
  }

  // Empty state
  if (loading?.isEmpty) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-[#2A2A2A]`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#999999]">{title}</h3>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold text-white mb-4">-</p>
        <p className="text-sm text-[#666666]">暫無資料</p>
      </Card>
    )
  }

  // Normal state
  return (
    <Card className={`p-6 hover:border-[#7C3AED]/50 transition-all ${className}`}>
      {/* Header: Icon + Title */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-[#2A2A2A]`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#999999]">{title}</h3>
          </div>
        </div>
      </div>

      {/* Value */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>

      {/* Trend (if provided) */}
      {trend && (
        <div className="mb-4 flex items-center gap-2">
          {trend.direction === 'up' ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span
            className={`text-sm font-medium ${
              trend.direction === 'up' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {trend.direction === 'up' ? '+' : '-'}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-[#666666]">{trend.label}</span>
        </div>
      )}

      {/* Progress Links */}
      {progressLinks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#333333] space-y-1">
          {progressLinks.map((link, index) => (
            <ProgressLink key={index} link={link} />
          ))}
        </div>
      )}
    </Card>
  )
}
