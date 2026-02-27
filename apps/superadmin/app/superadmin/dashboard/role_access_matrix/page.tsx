'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PermissionMatrixRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/superadmin/dashboard/iam-management#matrix');
  }, [router]);
  return null;
}
