'use client'

import { TenantSidebar } from '@/components/layout/TenantSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ToastProvider } from '@/components/ui/Toast';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#1A1A1A]">
        <TenantSidebar />
        <div className="ml-64">
          <DashboardHeader />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
