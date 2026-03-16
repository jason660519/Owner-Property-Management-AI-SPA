// filepath: apps/superadmin/components/admin/properties/PropertyCreatePageClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { PropertyCreateModal } from './PropertyCreateModal';

export function PropertyCreatePageClient() {
  const router = useRouter();

  const backToList = () => {
    router.push('/superadmin/properties');
  };

  return (
    <PropertyCreateModal
      onClose={backToList}
      onCreated={backToList}
    />
  );
}

