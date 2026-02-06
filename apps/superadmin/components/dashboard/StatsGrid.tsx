'use client';

import React from 'react';
import { KPICard } from './KPICard';
import type { KPIConfig, KPILoadingState } from './types';

export function StatsGrid({
  kpis,
  loading,
  columns = 4,
  className = '',
}: {
  kpis: KPIConfig[];
  loading?: KPILoadingState[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridColsClass = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' }[columns];
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-6 ${className}`}>
      {kpis.map((kpi, index) => (
        <KPICard key={index} config={kpi} loading={loading?.[index]} />
      ))}
    </div>
  );
}
