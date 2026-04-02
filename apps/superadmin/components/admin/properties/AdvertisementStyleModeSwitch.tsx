'use client';

import type { AdvertisementStyleMode } from '@/lib/types/advertisement';

interface AdvertisementStyleModeSwitchProps {
  styleMode: AdvertisementStyleMode;
  onChange: (styleMode: AdvertisementStyleMode) => void;
}

export function AdvertisementStyleModeSwitch({ styleMode, onChange }: AdvertisementStyleModeSwitchProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={styleMode === 'preset'}
        onClick={() => onChange('preset')}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${styleMode === 'preset' ? 'border-accent bg-accent/10 text-accent' : 'border-border-default text-text-secondary hover:bg-bg-tertiary'}`}
      >
        系統模板
      </button>
      <button
        type="button"
        aria-pressed={styleMode === 'reference'}
        onClick={() => onChange('reference')}
        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${styleMode === 'reference' ? 'border-accent bg-accent/10 text-accent' : 'border-border-default text-text-secondary hover:bg-bg-tertiary'}`}
      >
        參考網址模式
      </button>
    </div>
  );
}