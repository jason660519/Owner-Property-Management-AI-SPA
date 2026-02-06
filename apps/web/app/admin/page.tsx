/**
 * @file page.tsx
 * @description Redirect to Superadmin app (port 3001). Superadmin dashboard lives at http://localhost:3001/superadmin/dashboard
 */

import { redirect } from 'next/server';

const SUPERADMIN_URL = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';

export default function AdminRedirectPage() {
  redirect(`${SUPERADMIN_URL}/superadmin/dashboard`);
}
