import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      <Sidebar />
      <div className="ml-64">
        <DashboardHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
