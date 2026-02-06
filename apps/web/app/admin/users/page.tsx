/**
 * @description Redirect to Superadmin app (port 3001). User management lives at http://localhost:3001/superadmin/users
 */
import { redirect } from 'next/server';

const SUPERADMIN_URL = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';

export default function AdminUsersRedirectPage() {
  redirect(`${SUPERADMIN_URL}/superadmin/users`);
}
