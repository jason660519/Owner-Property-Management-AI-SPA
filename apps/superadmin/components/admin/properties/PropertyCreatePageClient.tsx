// filepath: apps/superadmin/components/admin/properties/PropertyCreatePageClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { PropertyCreateModal } from './PropertyCreateModal';

export function PropertyCreatePageClient() {
  const router = useRouter();

  const backToList = () => {
    router.push('/superadmin/properties');
  };

  const onCreated = (propertyId?: string) => {
    if (propertyId) {
      router.push(`/superadmin/properties/${propertyId}/edit?tab=photos`);
    } else {
      backToList();
    }
  };

  return (
    <PropertyCreateModal
      onClose={backToList}
      onCreated={onCreated}
    />
  );
}

