'use client';

import React from 'react';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#333333] bg-[#1A1A1A] px-6">
      <div className="flex items-center gap-4">
        {/* Place for global search or breadcrumbs if moved here */}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="text-[#999999] hover:text-white px-2">
          <Bell className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 pl-4 border-l border-[#333333]">
          <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center text-white">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">Super Admin</p>
            <p className="text-xs text-[#999999]">System Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
