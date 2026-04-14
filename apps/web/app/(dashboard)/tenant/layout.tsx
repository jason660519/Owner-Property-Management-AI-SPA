'use client'

import { useState } from 'react';
import { TenantSidebar } from '@/components/layout/TenantSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ToastProvider } from '@/components/ui/Toast';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-bg-primary">
        <TenantSidebar mobileOpen={mobileNavOpen} onMobileOpenChange={setMobileNavOpen} />
        <div className="min-w-0 lg:ml-64">
          <DashboardHeader onMenuClick={() => setMobileNavOpen(true)} />
          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
