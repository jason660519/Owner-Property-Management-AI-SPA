// filepath: apps/superadmin/app/superadmin/dashboard/project-progress/components/ProgressBar.tsx
// created: 2026-02-19 | creator: Claude Opus 4.6

'use client';

import { clsx } from 'clsx';

export const ProgressBar = ({ percentage }: { percentage: number }) => {
  return (
    <div className="relative w-full h-5 bg-bg-tertiary rounded-full overflow-hidden shadow-inner">
      <div
        className={clsx(
          'h-full rounded-full transition-all duration-500 absolute top-0 left-0 flex items-center justify-center',
          percentage === 100
            ? 'bg-emerald-500'
            : percentage > 0
              ? 'bg-blue-500'
              : 'bg-bg-secondary'
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
