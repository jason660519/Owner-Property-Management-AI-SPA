/**
 * @file DashboardHeader.tsx
 * @created 2026-02-03
 * @creator Antigravity
 * @lastModified 2026-02-19
 * @modifiedBy Claude Opus 4.6
 * @version 1.2
 */

'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { UserNav } from '@/components/ui/UserNav';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEffect, useState } from 'react';
import type { MeProfileResponse } from '@/app/api/me/profile/route';

export interface DashboardHeaderProps {
  /** When set, shows a 44×44px menu control on viewports below `lg` (opens the sidebar drawer). */
  onMenuClick?: () => void;
  pageTitle?: string;
}

export function DashboardHeader({ onMenuClick, pageTitle = 'Dashboard' }: DashboardHeaderProps) {
  const [profile, setProfile] = useState<MeProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me/profile');
        if (res.ok) setProfile(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <header className="flex h-16 min-h-16 items-center justify-end border-b border-border-default bg-bg-primary px-4 sm:px-6 transition-colors duration-200">
        <div className="h-10 w-10 animate-pulse rounded-full bg-bg-tertiary" />
      </header>
    );
  }

  return (
    <header className="flex h-16 min-h-16 items-center justify-between gap-3 border-b border-border-default bg-bg-primary px-4 sm:px-6 transition-colors duration-200">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-primary hover:bg-bg-secondary lg:hidden"
            aria-label="開啟側邊選單"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        ) : null}
        <h1 className="truncate text-lg font-semibold text-text-primary sm:text-xl">{pageTitle}</h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <ThemeToggle />
        {profile && (
          <UserNav
            user={{ email: profile.email }}
            userProfile={{
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              primary_role: profile.primary_role,
            }}
          />
        )}
      </div>
    </header>
  );
}
