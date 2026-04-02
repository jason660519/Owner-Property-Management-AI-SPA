'use client';

import type { StylePreset } from '@/lib/actions/blog';

interface AdvertisementPresetGalleryProps {
  presets: Array<{ id: StylePreset; label: string; emoji: string; desc: string }>;
  selectedPreset?: StylePreset;
  onSelectPreset: (stylePreset: StylePreset) => void;
}

export function AdvertisementPresetGallery({
  presets,
  selectedPreset,
  onSelectPreset,
}: AdvertisementPresetGalleryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {presets.map((preset) => {
        const selected = selectedPreset === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.id)}
            className={`rounded-xl border p-4 text-left transition-colors ${selected ? 'border-accent bg-accent/5' : 'border-border-default bg-bg-primary hover:bg-bg-secondary/50'}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{preset.emoji}</span>
              <p className="text-sm font-semibold text-text-primary">{preset.label}</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-text-muted">{preset.desc}</p>
          </button>
        );
      })}
    </div>
  );
}