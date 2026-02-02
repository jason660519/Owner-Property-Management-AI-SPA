/**
 * @file UserNav.tsx
 * @created 2026-02-03
 * @creator Antigravity
 * @lastModified 2026-02-03
 * @modifiedBy Antigravity
 * @version 1.0
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface UserNavProps {
  user: User;
  userProfile?: {
    full_name?: string;
    avatar_url?: string;
    primary_role?: string;
  };
}

export function UserNav({ user, userProfile }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const displayName = userProfile?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white">
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div className="hidden text-left md:block">
          <p className="text-sm font-medium text-white">{displayName}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
        <svg
          className={`hidden h-4 w-4 text-gray-400 transition-transform md:block ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          <div className="border-b border-gray-700 px-4 py-3">
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/profile');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </button>
          </div>

          <div className="border-t border-gray-700 py-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-gray-700 hover:text-red-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
