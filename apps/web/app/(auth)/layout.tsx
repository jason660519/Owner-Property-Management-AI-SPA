// filepath: apps/web/app/(auth)/layout.tsx
/**
 * @file layout.tsx
 * @description Auth routes shared layout
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

'use client';

import React from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
        <header className="mb-4">
          <nav className="flex justify-between">
            <h1 className="text-lg font-semibold">Owner Property Management</h1>
            <div className="flex gap-2">
              <Link href="/auth/login">登入</Link>
              <Link href="/auth/register">註冊</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
