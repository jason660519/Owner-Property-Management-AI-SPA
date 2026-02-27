'use client';

import { Shield, Users, Lock, ShieldCheck } from 'lucide-react';

export type IAMTab = 'overview' | 'users' | 'roles' | 'groups';

const IAM_TABS: {
  id: IAMTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'overview', label: 'Overview',       icon: Shield },
  { id: 'users',    label: 'User Management', icon: Users },
  { id: 'roles',    label: 'Role Management',  icon: ShieldCheck },
  { id: 'groups',   label: 'Group Management', icon: Lock },
];

interface IAMTabBarProps {
  activeTab: IAMTab;
  onTabChange: (tab: IAMTab) => void;
}

export function IAMTabBar({ activeTab, onTabChange }: IAMTabBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto shrink-0 pb-1">
      {IAM_TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#333333] border border-[#333333]'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-white' : 'text-gray-500'} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
