// filepath: apps/web/app/(dashboard)/buyer/dashboard/page.tsx
/**
 * Buyer dashboard entry - redirects to contracted buyer dashboard.
 */

import { redirect } from 'next/navigation';

export default function BuyerDashboardEntryPage() {
  redirect('/buyer/contracted/dashboard');
}
