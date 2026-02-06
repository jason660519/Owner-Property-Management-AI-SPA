"use client";
import React, { useEffect } from "react";
import useRequireAuth from "../../hooks/useRequireAuth";
import { signOut } from "../../lib/supabase/auth";
import { useRouter } from "next/navigation";

const SUPERADMIN_URL = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';
const ROLE_DASHBOARD_MAP: Record<string, string> = {
  super_admin: `${SUPERADMIN_URL}/superadmin/dashboard`,
  landlord: '/landlord/dashboard',
  tenant: '/tenant/contracted/dashboard',
  buyer: '/buyer/contracted/dashboard',
  agent: '/agent/dashboard',
  service_provider: '/service-provider/dashboard',
};

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();
  const router = useRouter();
  const role = user?.user_metadata?.role as string | undefined;
  const redirectPath = role ? ROLE_DASHBOARD_MAP[role] : null;

  useEffect(() => {
    if (!isLoading && redirectPath) {
      if (redirectPath.startsWith('http')) {
        window.location.href = redirectPath;
      } else {
        router.replace(redirectPath);
      }
    }
  }, [isLoading, redirectPath, router]);

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (redirectPath) return <div className="p-6">導向儀表板...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2">歡迎, {user?.email ?? user?.user_metadata?.name ?? '使用者'}</p>
      <div className="mt-4">
        <button
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
