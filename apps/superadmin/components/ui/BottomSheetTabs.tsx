'use client';

import React from 'react';
import { clsx } from 'clsx';

export interface SheetTabDef {
  id: string;
  label: string;
  zhLabel?: string;
  icon?: React.ElementType;
  color?: string;
  activeColor?: string;
  badge?: number;
}

interface BottomSheetTabsProps {
  tabs: SheetTabDef[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function BottomSheetTabs({ tabs, activeTab, onTabChange }: BottomSheetTabsProps) {
  return (
    <div className="flex items-end gap-0 border-t border-border-default bg-bg-secondary/50 rounded-b-lg overflow-x-auto flex-none">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        const activeColorClass = tab.activeColor ?? 'bg-accent text-white';
        const iconColorClass = tab.color ?? 'text-accent';

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onTabChange(tab.id);
              if (typeof window !== 'undefined') {
                window.location.hash = tab.id;
              }
            }}
            className={clsx(
              'relative flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all border-r border-border-default last:border-r-0 whitespace-nowrap',
              isActive
                ? clsx(activeColorClass, 'shadow-sm')
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
            )}
          >
            {Icon && <Icon className={clsx('w-4 h-4', isActive ? 'text-current' : iconColorClass)} />}
            {tab.zhLabel && <span>{tab.zhLabel}</span>}
            <span>{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span className={clsx(
                'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none',
                isActive ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-text-muted',
              )}>
                {tab.badge}
              </span>
            )}
            {isActive && <span className="absolute top-0 left-0 right-0 h-0.5 bg-white/50" />}
          </button>
        );
      })}
      <div className="flex-1 min-w-[20px]" />
    </div>
  );
}
