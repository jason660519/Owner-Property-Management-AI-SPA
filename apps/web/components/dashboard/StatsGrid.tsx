/**
 * @file StatsGrid.tsx
 * @created 2026-02-05
 * @creator Claude Sonnet 4.5
 * @description Grid layout for displaying multiple KPI cards
 */

'use client'

import React from 'react'
import { KPICard } from './KPICard'
import type { KPIConfig, KPILoadingState } from './types'

interface StatsGridProps {
  kpis: KPIConfig[]
  loading?: KPILoadingState[]
  columns?: 2 | 3 | 4
  className?: string
}

/**
 * StatsGrid Component
 *
 * Responsive grid layout for KPI cards
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: 3-4 columns (configurable)
 *
 * @example
 * <StatsGrid
 *   kpis={[kpi1, kpi2, kpi3, kpi4]}
 *   loading={[loading1, loading2, loading3, loading4]}
 *   columns={4}
 * />
 */
export function StatsGrid({
  kpis,
  loading,
  columns = 3,
  className = '',
}: StatsGridProps) {
  const gridColsClass = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }[columns]

  return (
    <div
      className={`
        grid grid-cols-1
        md:grid-cols-2
        ${gridColsClass}
        gap-6
        ${className}
      `}
    >
      {kpis.map((kpi, index) => (
        <KPICard
          key={index}
          config={kpi}
          loading={loading?.[index]}
        />
      ))}
    </div>
  )
}
