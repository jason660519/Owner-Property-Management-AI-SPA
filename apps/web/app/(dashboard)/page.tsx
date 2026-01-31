"use client";
import React from "react";
import useRequireAuth from "../../hooks/useRequireAuth";
import { signOut } from "../../lib/supabase/auth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();
  const router = useRouter();

  if (isLoading) return <div className="p-6">Loading...</div>;

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
