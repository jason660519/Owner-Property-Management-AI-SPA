// filepath: apps/superadmin/components/admin/properties/PropertyCreatePageClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import type { OwnerOption } from '@/lib/types/properties';
import { PropertyCreateModal } from './PropertyCreateModal';

interface PropertyCreatePageClientProps {
  owners: OwnerOption[];
}

export function PropertyCreatePageClient({ owners }: PropertyCreatePageClientProps) {
  const router = useRouter();

  const backToList = () => {
    router.push('/superadmin/properties');
  };

  return (
    <PropertyCreateModal
      owners={owners}
      onClose={backToList}
      onCreated={backToList}
      pageMode
    />
  );
}

