import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-secondary transition-colors duration-200">
      <DashboardHeader />
      <Sidebar />
      <div className="ml-16 pt-16 transition-all duration-300 ease-in-out min-h-screen flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
