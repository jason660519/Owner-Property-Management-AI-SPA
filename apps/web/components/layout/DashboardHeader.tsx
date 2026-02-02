/**
 * @file DashboardHeader.tsx
 * @created 2026-02-03
 * @creator Antigravity
 * @lastModified 2026-02-03
 * @modifiedBy Antigravity
 * @version 1.0
 */

'use client';

import React from 'react';
import { UserNav } from '@/components/ui/UserNav';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  full_name?: string;
  avatar_url?: string;
  primary_role?: string;
}

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);

        const { data: profile } = await supabase
          .from('users_profile')
          .select('full_name, avatar_url, primary_role')
          .eq('user_id', currentUser.id)
          .single();

        if (profile) {
          setUserProfile(profile);
        }
      }

      setLoading(false);
    };

    fetchUserData();
  }, []);

  if (loading) {
    return (
      <header className="flex h-16 items-center justify-end border-b border-gray-800 bg-[#1A1A1A] px-6">
        <div className="h-10 w-10 animate-pulse rounded-full bg-gray-800" />
      </header>
    );
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-[#1A1A1A] px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {user && <UserNav user={user} userProfile={userProfile || undefined} />}
      </div>
    </header>
  );
}
