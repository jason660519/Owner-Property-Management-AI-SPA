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
  /** When true, renders a smaller card for header/top-right placement */
  compact?: boolean;
}

export const StatCard = ({
  label,
  value,
  subValue,
  icon: Icon,
  colorClass,
  bgClass,
  compact = false,
}: StatCardProps) => (
  <div
    className={clsx(
      'bg-bg-primary rounded-xl border border-border-default shadow-sm flex items-center transition-colors',
      compact
        ? 'p-2 gap-2 rounded-lg'
        : 'p-4 gap-4'
    )}
  >
    <div
      className={clsx(
        'rounded-lg flex-shrink-0',
        compact ? 'p-1.5' : 'p-3',
        bgClass,
        colorClass
      )}
    >
      <Icon className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
    </div>
    <div className="min-w-0">
      <p
        className={clsx(
          'text-text-secondary font-medium',
          compact ? 'text-xs' : 'text-sm'
        )}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <h3
          className={clsx(
            'font-bold text-text-primary truncate',
            compact ? 'text-base' : 'text-2xl'
          )}
        >
          {value}
        </h3>
        {subValue && (
          <span className={clsx('text-text-muted flex-shrink-0', compact ? 'text-[10px]' : 'text-xs')}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  </div>
);
