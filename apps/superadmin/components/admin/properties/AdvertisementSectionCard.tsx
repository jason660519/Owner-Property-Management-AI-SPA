'use client';

import type { AdvertisementSectionDefinition } from '@/lib/types/advertisement';

interface AdvertisementSectionCardProps {
  section: AdvertisementSectionDefinition;
  selected: boolean;
  onToggle: (sectionId: AdvertisementSectionDefinition['id']) => void;
}

export function AdvertisementSectionCard({ section, selected, onToggle }: AdvertisementSectionCardProps) {
  const disabled = section.status === 'unavailable';
  const badgeClassName = section.status === 'recommended'
    ? 'bg-green-500/10 text-green-600'
    : section.status === 'available'
      ? 'bg-sky-500/10 text-sky-600'
      : 'bg-amber-500/10 text-amber-600';
  const badgeLabel = section.status === 'recommended'
    ? '建議帶入'
    : section.status === 'available'
      ? '可使用'
      : '尚未可用';

  return (
    <label className={`block rounded-xl border p-4 transition-colors ${disabled ? 'border-border-default bg-bg-secondary/70' : selected ? 'border-accent bg-accent/5' : 'border-border-default bg-bg-primary hover:bg-bg-secondary/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={section.title}
              checked={selected}
              disabled={disabled}
              onChange={() => onToggle(section.id)}
              className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent disabled:cursor-not-allowed"
            />
            <p className="text-sm font-semibold text-text-primary">{section.title}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-text-muted">{section.description}</p>
          {disabled && section.unavailableReason && (
            <p className="mt-2 text-xs text-amber-600">{section.unavailableReason}</p>
          )}
          {disabled && section.fixTargetLabel && (
            <p className="mt-1 text-xs text-text-secondary">{section.fixTargetLabel}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${badgeClassName}`}>
          {badgeLabel}
        </span>
      </div>
    </label>
  );
}