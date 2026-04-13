'use client'

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ToastProvider } from '@/components/ui/Toast';

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg-primary">
        <Sidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
        <div className="min-w-0 lg:ml-64">
          <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} />
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
