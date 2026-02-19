// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/StatCard.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

export const StatCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  colorClass,
  bgClass,
}: StatCardProps) => (
  <div className="bg-bg-primary p-4 rounded-xl border border-border-default shadow-sm flex items-center gap-4 transition-colors">
    <div className={clsx('p-3 rounded-lg', bgClass, colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-text-secondary font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
        {subValue && (
          <span className="text-xs text-text-muted">{subValue}</span>
        )}
      </div>
    </div>
  </div>
);
