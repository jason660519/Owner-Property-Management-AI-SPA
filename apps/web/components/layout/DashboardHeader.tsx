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
import { UserNav } from '@/components/ui/UserNav';
import { ThemeToggle } from '@/components/theme-toggle';
import { useEffect, useState } from 'react';
import type { MeProfileResponse } from '@/app/api/me/profile/route';

export function DashboardHeader() {
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
      <header className="flex h-16 items-center justify-end border-b border-border-default bg-bg-primary px-6 transition-colors duration-200">
        <div className="h-10 w-10 animate-pulse rounded-full bg-bg-tertiary" />
      </header>
    );
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border-default bg-bg-primary px-6 transition-colors duration-200">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
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
