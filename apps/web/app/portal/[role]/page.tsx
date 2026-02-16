'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_METADATA } from '@/config/roles';
import { canonicalizeRole } from '@/lib/roles';

// Client Component to handle cross-origin redirects (e.g. super_admin → port 3001)
export default function RoleRedirectPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const router = useRouter();

  useEffect(() => {
    const doRedirect = async () => {
      const { role: param } = await params;

      // Accept either canonical key or common aliases in the URL
      const canonical = canonicalizeRole(param) || param;

      const roleData = ROLE_METADATA.find(
        (r) => r.role === canonical || r.role === param,
      );

      if (roleData) {
        const dashboardPath = roleData.dashboardPath;

        // Check if dashboardPath is an external URL (cross-origin)
        if (dashboardPath.startsWith('http://') || dashboardPath.startsWith('https://')) {
          // Cross-origin redirect: use window.location.href
          window.location.href = dashboardPath;
        } else {
          // Same-origin redirect: use Next.js router
          router.push(dashboardPath);
        }
        return;
      }

      // fallback to portal
      router.push('/portal');
    };

    doRedirect();
  }, [params, router]);

  // Loading state
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
        <p className="text-gray-400">正在跳轉...</p>
      </div>
    </div>
  );
}
