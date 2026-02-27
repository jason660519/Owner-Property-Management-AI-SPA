// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/ProgressBar.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import { clsx } from 'clsx';

/** 0–10% red, 10–70% yellow, 70–99.99% blue, 100% green */
function getStatusBarColor(percentage: number): string {
  if (percentage >= 100) return 'bg-emerald-500';
  if (percentage >= 70) return 'bg-blue-500';
  if (percentage >= 10) return 'bg-amber-500';
  return 'bg-red-500';
}

export interface ProgressBarProps {
  percentage: number;
  /** When true: 0–10% red, 10–70% yellow, 70–99.99% blue, 100% green. Default: original green/blue/gray. */
  variant?: 'default' | 'status';
}

export const ProgressBar = ({ percentage, variant = 'default' }: ProgressBarProps) => {
  const barColor =
    variant === 'status'
      ? getStatusBarColor(percentage)
      : percentage === 100
        ? 'bg-emerald-500'
        : percentage > 0
          ? 'bg-blue-500'
          : 'bg-bg-secondary';

  return (
    <div className="relative w-full h-5 bg-bg-tertiary rounded-full overflow-hidden shadow-inner">
      <div
        className={clsx(
          'h-full rounded-full transition-all duration-500 absolute top-0 left-0 flex items-center justify-center',
          barColor
        )}
        style={{ width: `${percentage}%` }}
      >
        {percentage > 0 && percentage < 100 && (
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white drop-shadow-md">
          {percentage}%
        </span>
      </div>
    </div>
  );
};
