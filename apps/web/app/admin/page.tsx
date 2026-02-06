/**
 * @file page.tsx
 * @description Superadmin Dashboard Page (Server Component)
 */

import { getAdminDashboardStats } from '@/lib/actions/dashboard'
import AdminDashboardClient from './AdminDashboardClient'

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const stats = await getAdminDashboardStats()

  return <AdminDashboardClient stats={stats} />
}
