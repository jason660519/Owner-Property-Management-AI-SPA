"use client";
import React from "react";
import useRequireAuth from "../../hooks/useRequireAuth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useRequireAuth();

  if (isLoading) return <div className="p-6">Loading...</div>;

  return <main className="min-h-screen p-6">{children}</main>;
}
