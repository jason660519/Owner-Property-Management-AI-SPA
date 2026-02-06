/**
 * @description Redirect to Superadmin app (port 3001). Groups management lives at http://localhost:3001/superadmin/groups
 */
import { redirect } from 'next/server';

const SUPERADMIN_URL = process.env.NEXT_PUBLIC_SUPERADMIN_URL || 'http://localhost:3001';

export default function AdminGroupsRedirectPage() {
  redirect(`${SUPERADMIN_URL}/superadmin/groups`);
}
