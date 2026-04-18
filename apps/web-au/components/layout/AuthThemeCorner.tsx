'use client';

import { ThemeToggle } from '@/components/theme-toggle';

export function AuthThemeCorner() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex justify-end p-4">
      <div className="pointer-events-auto h-fit">
        <ThemeToggle />
      </div>
    </div>
  );
}
