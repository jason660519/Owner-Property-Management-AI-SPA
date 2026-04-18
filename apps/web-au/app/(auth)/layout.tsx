import { AuthThemeCorner } from '@/components/layout/AuthThemeCorner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-bg-primary">
      <AuthThemeCorner />
      {children}
    </main>
  );
}
