'use client';

import type { AdvertisementSectionDefinition, AdvertisementSectionId } from '@/lib/types/advertisement';

import { AdvertisementSectionCard } from './AdvertisementSectionCard';

interface AdvertisementSectionSelectorProps {
  sections: AdvertisementSectionDefinition[];
  selectedSectionIds: AdvertisementSectionId[];
  onToggleSection: (sectionId: AdvertisementSectionId) => void;
}

export function AdvertisementSectionSelector({
  sections,
  selectedSectionIds,
  onToggleSection,
}: AdvertisementSectionSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => (
        <AdvertisementSectionCard
          key={section.id}
          section={section}
          selected={selectedSectionIds.includes(section.id)}
          onToggle={onToggleSection}
        />
      ))}
    </div>
  );
}